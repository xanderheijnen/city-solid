import { useState, useCallback, useRef } from 'react';
import {
  Upload, FileSpreadsheet, FileText, Image, X, Check, AlertTriangle,
  Loader2, Trash2, Edit, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { parseFile, getFileType, KANDIDAAT_FIELD_LABELS } from '@/lib/fileParser';
import type { ParsedKandidaat, ParseResult } from '@/lib/fileParser';
import { useCreateKandidaat } from '@/hooks/useKandidaten';
import { useLogAudit } from '@/hooks/useAuditLog';
import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Whitelist of cs_kandidaten columns that can be set via import
// ---------------------------------------------------------------------------

const ALLOWED_INSERT_FIELDS = new Set([
  'voornaam', 'achternaam', 'geslacht', 'geboortedatum', 'geboorteplaats',
  'bsn', 'nationaliteit', 'straat', 'postcode', 'woonplaats',
  'ingeschreven_adres_brp', 'reden_geen_brp', 'wijk', 'gebied',
  'telefoon', 'email', 'contactpersoon', 'whatsapp',
  'eigen_vervoer', 'rijbewijs', 'zorgverzekering', 'uitkering',
  'toestemming', 'klantmanager', 'door_wie_bekend',
  'aanmeld_type', 'aanmelder_naam', 'aanmelder_telefoon', 'aanmelder_email',
  'aanmeld_organisatie', 'gewenst_project', 'gewenste_sector',
  'certificaat_voorkeur_1', 'certificaat_voorkeur_2',
  'motivatie', 'demotivatie', 'stip_aan_de_horizon',
  'goede_eigenschappen', 'minder_goed_in', 'talen', 'hobbys',
  'medische_bijzonderheden', 'woonsituatie', 'kinderen',
  'trajecten', 'hulpverleners_betrokken', 'afspraken_hulp',
  'middelengebruik', 'heeft_schulden', 'schulden_reden_bedrag', 'schulden_afspraken',
  'aanraking_politie_justitie', 'aanraking_reden', 'veroordeeld_detentie', 'lopende_zaken',
  'opleiding', 'diploma_behaald', 'opleiding_niveau', 'reden_uitval',
  'cursussen_gevolgd', 'certificaten_behaald', 'werkervaring', 'waarom_lukte_niet', 'heeft_cv',
  'acties_afspraken', 'leefgebieden_aandacht',
  'aanmeld_datum', 'intake_datum', 'intake_notities',
  'leeftijd', 'traject_status',
  'uitstroom_status',
  'activiteit', 'csn', 'no_show', 'eenoudergezin', 'verandering',
]);

// Fields that are UUID references — never accept text values from imports
const UUID_FIELDS = new Set([
  'created_by', 'intake_door', 'foto_url', 'id_scan_url', 'cv_url',
]);

function filterToDbFields(k: ParsedKandidaat): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(k)) {
    if (ALLOWED_INSERT_FIELDS.has(key) && !UUID_FIELDS.has(key) && val != null && val !== '') {
      result[key] = val;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = 'upload' | 'parsing' | 'preview' | 'saving' | 'done';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// File type icon
// ---------------------------------------------------------------------------

function FileTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'excel':
    case 'csv':
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    case 'word':
    case 'pdf':
      return <FileText className="h-5 w-5 text-blue-600" />;
    case 'image':
      return <Image className="h-5 w-5 text-purple-600" />;
    default:
      return <FileText className="h-5 w-5 text-muted-foreground" />;
  }
}

function fileTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    excel: 'Excel',
    csv: 'CSV',
    word: 'Word',
    pdf: 'PDF',
    image: 'Afbeelding',
  };
  return labels[type] ?? type;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KandidaatUploadDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [kandidaten, setKandidaten] = useState<ParsedKandidaat[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<ParsedKandidaat>({});
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 });
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createKandidaat = useCreateKandidaat();
  const logAudit = useLogAudit();

  // ── Reset ──
  const reset = useCallback(() => {
    setStep('upload');
    setDragOver(false);
    setFile(null);
    setProgress(0);
    setResult(null);
    setKandidaten([]);
    setEditIndex(null);
    setEditData({});
    setSaveProgress({ done: 0, total: 0 });
    setSaveErrors([]);
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(reset, 300);
  }, [onOpenChange, reset]);

  // ── File handling ──
  const processFile = useCallback(async (f: File) => {
    setFile(f);
    setStep('parsing');
    setProgress(0);

    try {
      const parseResult = await parseFile(f, (pct) => setProgress(pct));
      setResult(parseResult);
      setKandidaten(parseResult.kandidaten);
      setStep('preview');

      // Audit log: file parsed
      try {
        await logAudit.mutateAsync({
          actie: 'create',
          object_type: 'import',
          omschrijving: `Bestand "${f.name}" verwerkt: ${parseResult.kandidaten.length} kandidaten herkend, ${parseResult.warnings.length} waarschuwingen`,
          nieuwe_waarden: { bestandsnaam: f.name, bron: parseResult.source, kandidaten: parseResult.kandidaten.length, warnings: parseResult.warnings },
        });
      } catch (auditErr) {
        console.error('Audit log fout:', auditErr);
      }

      // Log parsing result (including failures with 0 candidates)
      if (parseResult.kandidaten.length === 0 || parseResult.warnings.length > 0) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('cs_import_log').insert({
            bestandsnaam: f.name,
            bron: parseResult.source ?? 'onbekend',
            aantal_rijen: 0,
            aantal_succesvol: parseResult.kandidaten.length,
            aantal_mislukt: 0,
            fouten: parseResult.warnings,
            geimporteerd_door: user?.id ?? null,
          });
        } catch { /* non-critical */ }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error('Fout bij verwerken: ' + errorMsg);

      // Log parse error to import log
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('cs_import_log').insert({
          bestandsnaam: f.name,
          bron: 'onbekend',
          aantal_rijen: 0,
          aantal_succesvol: 0,
          aantal_mislukt: 1,
          fouten: [`Parse error: ${errorMsg}`],
          geimporteerd_door: user?.id ?? null,
        });
      } catch { /* non-critical */ }

      setStep('upload');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    // Reset so same file can be selected again
    e.target.value = '';
  }, [processFile]);

  // ── Edit candidate ──
  const startEdit = (idx: number) => {
    setEditIndex(idx);
    setEditData({ ...kandidaten[idx] });
  };

  const saveEdit = () => {
    if (editIndex === null) return;
    const updated = [...kandidaten];
    updated[editIndex] = editData;
    setKandidaten(updated);
    setEditIndex(null);
    setEditData({});
  };

  const removeKandidaat = (idx: number) => {
    setKandidaten((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Save all (upsert: update existing, insert new) ──
  const handleSaveAll = async () => {
    setStep('saving');
    setSaveProgress({ done: 0, total: kandidaten.length });
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (let i = 0; i < kandidaten.length; i++) {
      const k = kandidaten[i];
      const name = `${k.voornaam ?? ''} ${k.achternaam ?? ''}`.trim() || `Rij ${i + 1}`;
      try {
        const dbFields = filterToDbFields(k);
        const csn = dbFields.csn as string | undefined;
        const voornaam = String(k.voornaam ?? '').trim();
        const achternaam = String(k.achternaam ?? '').trim();

        // Check if kandidaat already exists (by CSN or voornaam+achternaam)
        let existingId: string | null = null;

        if (csn) {
          const { data: byCSN } = await supabase
            .from('cs_kandidaten')
            .select('id')
            .eq('csn', csn)
            .maybeSingle();
          if (byCSN) existingId = byCSN.id;
        }

        if (!existingId && voornaam && achternaam) {
          const { data: byName } = await supabase
            .from('cs_kandidaten')
            .select('id')
            .ilike('voornaam', voornaam)
            .ilike('achternaam', achternaam)
            .maybeSingle();
          if (byName) existingId = byName.id;
        }

        if (existingId) {
          // Update: only fill in fields that are currently empty/null
          const { data: existing } = await supabase
            .from('cs_kandidaten')
            .select('*')
            .eq('id', existingId)
            .single();

          if (existing) {
            const updates: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(dbFields)) {
              const currentVal = (existing as Record<string, unknown>)[key];
              // Only update if current value is empty/null and new value has data
              if ((currentVal == null || currentVal === '' || currentVal === false) && val != null && val !== '') {
                updates[key] = val;
              }
            }

            if (Object.keys(updates).length > 0) {
              const { error: updateErr } = await supabase
                .from('cs_kandidaten')
                .update(updates)
                .eq('id', existingId);
              if (updateErr) throw updateErr;
            }
            updated++;
          }
        } else {
          // Insert new kandidaat
          await createKandidaat.mutateAsync({
            voornaam,
            achternaam,
            ...dbFields,
          });
          created++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message
          : typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: string }).message)
          : JSON.stringify(err);
        errors.push(`${name}: ${msg}`);
      }
      setSaveProgress({ done: i + 1, total: kandidaten.length });
    }

    // Log import to cs_import_log
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('cs_import_log').insert({
        bestandsnaam: file?.name ?? 'onbekend',
        bron: result?.source ?? 'onbekend',
        aantal_rijen: kandidaten.length,
        aantal_succesvol: kandidaten.length - errors.length,
        aantal_mislukt: errors.length,
        fouten: errors.length > 0 ? errors : [],
        geimporteerd_door: user?.id ?? null,
      });
    } catch {
      // Non-critical: don't block UI if logging fails
    }

    // Audit log: import completed
    try {
      await logAudit.mutateAsync({
        actie: 'create',
        object_type: 'import',
        omschrijving: `Import "${file?.name ?? 'onbekend'}": ${kandidaten.length - errors.length}/${kandidaten.length} succesvol, ${errors.length} fouten`,
        nieuwe_waarden: { bestandsnaam: file?.name, succesvol: kandidaten.length - errors.length, mislukt: errors.length, fouten: errors },
      });
    } catch (auditErr) {
      console.error('Audit log fout:', auditErr);
    }

    setSaveErrors(errors);
    setStep('done');
    const parts: string[] = [];
    if (created > 0) parts.push(`${created} nieuw`);
    if (updated > 0) parts.push(`${updated} aangevuld`);
    if (errors.length === 0) {
      toast.success(`${parts.join(', ')} — ${kandidaten.length} kandidaten verwerkt!`);
    } else {
      toast.warning(`${parts.join(', ')}, ${errors.length} fouten van ${kandidaten.length}.`);
    }
  };

  // ── Detect fields used across all candidates ──
  const usedFields = (() => {
    const fields = new Set<string>();
    kandidaten.forEach((k) => {
      Object.keys(k).forEach((key) => {
        if (k[key] != null && k[key] !== '' && k[key] !== false) {
          fields.add(key);
        }
      });
    });
    return Array.from(fields).sort((a, b) => {
      const priority = ['voornaam', 'achternaam', 'geslacht', 'geboortedatum', 'telefoon', 'email', 'postcode', 'wijk'];
      const ai = priority.indexOf(a);
      const bi = priority.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  })();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className={cn(
        'max-h-[90vh] flex flex-col',
        step === 'preview' || step === 'done' ? 'max-w-5xl' : 'max-w-lg',
      )}>
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Kandidaten Importeren'}
            {step === 'parsing' && 'Bestand verwerken...'}
            {step === 'preview' && `Preview (${kandidaten.length} kandidaten)`}
            {step === 'saving' && 'Opslaan...'}
            {step === 'done' && 'Import voltooid'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload een bestand met kandidaatgegevens. Ondersteunde formaten: Excel, CSV, Word, PDF of een screenshot/afbeelding.'}
            {step === 'parsing' && `${file?.name ?? 'Bestand'} wordt verwerkt...`}
            {step === 'preview' && 'Controleer de gegevens hieronder en pas aan indien nodig.'}
            {step === 'saving' && `${saveProgress.done} van ${saveProgress.total} verwerkt...`}
            {step === 'done' && `Import afgerond.`}
          </DialogDescription>
        </DialogHeader>

        {/* ── Upload step ── */}
        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div
              className={cn(
                'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer',
                dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className={cn('h-10 w-10 mb-3', dragOver ? 'text-primary' : 'text-muted-foreground')} />
              <p className="text-sm font-medium">
                {dragOver ? 'Laat los om te uploaden' : 'Sleep een bestand hierheen'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">of klik om te selecteren</p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv,.docx,.doc,.pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff"
                onChange={handleFileSelect}
              />
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[
                { icon: FileSpreadsheet, label: 'Excel', color: 'text-green-600' },
                { icon: FileText, label: 'CSV', color: 'text-green-700' },
                { icon: FileText, label: 'Word', color: 'text-blue-600' },
                { icon: FileText, label: 'PDF', color: 'text-red-600' },
                { icon: Image, label: 'Afbeelding', color: 'text-purple-600' },
              ].map(({ icon: I, label, color }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-2">
                  <I className={cn('h-4 w-4', color)} />
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Tips voor beste resultaat:</p>
              <p>• <strong>Excel/CSV:</strong> Gebruik kolomnamen als "Voornaam", "Achternaam", "Telefoon", etc.</p>
              <p>• <strong>Word/PDF:</strong> Gebruik het format "Veldnaam: waarde" (bijv. "Voornaam: Jan")</p>
              <p>• <strong>Afbeelding:</strong> Zorg voor een scherpe foto met leesbare tekst</p>
            </div>
          </div>
        )}

        {/* ── Parsing step ── */}
        {step === 'parsing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            {file && (
              <div className="flex items-center gap-2">
                <FileTypeIcon type={getFileType(file)} />
                <span className="text-sm font-medium">{file.name}</span>
                <Badge variant="secondary" className="text-[10px]">{fileTypeLabel(getFileType(file))}</Badge>
              </div>
            )}
            {progress > 0 && (
              <div className="w-full max-w-xs">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground mt-1">{progress}% – Tekst herkennen...</p>
              </div>
            )}
          </div>
        )}

        {/* ── Preview step ── */}
        {step === 'preview' && (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Warnings */}
            {result?.warnings && result.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
                <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Opmerkingen ({result.warnings.length})
                </div>
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-600 pl-6">{w}</p>
                ))}
              </div>
            )}

            {/* Source info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {file && <FileTypeIcon type={getFileType(file)} />}
              <span>{file?.name}</span>
              <span>•</span>
              <span>{kandidaten.length} kandidaten herkend</span>
              <span>•</span>
              <span>{usedFields.length} velden</span>
            </div>

            {kandidaten.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <AlertTriangle className="h-8 w-8" />
                <p className="text-sm">Geen kandidaten herkend in het bestand.</p>
                <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                  <ChevronLeft className="mr-1 h-4 w-4" />Ander bestand proberen
                </Button>
              </div>
            ) : (
              <>
                {/* Edit inline form */}
                {editIndex !== null && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        Kandidaat {editIndex + 1} bewerken
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditIndex(null)}>Annuleren</Button>
                        <Button size="sm" onClick={saveEdit}>
                          <Check className="mr-1 h-3 w-3" />Opslaan
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {['voornaam', 'achternaam', 'geslacht', 'geboortedatum', 'telefoon', 'email',
                        'postcode', 'woonplaats', 'wijk', 'klantmanager'].map((field) => (
                        <div key={field} className="space-y-1">
                          <Label className="text-xs">{KANDIDAAT_FIELD_LABELS[field] ?? field}</Label>
                          <Input
                            className="h-8 text-sm"
                            value={String(editData[field] ?? '')}
                            onChange={(e) => setEditData((d) => ({ ...d, [field]: e.target.value || null }))}
                          />
                        </div>
                      ))}
                    </div>
                    {/* Show all other detected fields */}
                    {usedFields.filter((f) => !['voornaam', 'achternaam', 'geslacht', 'geboortedatum', 'telefoon', 'email', 'postcode', 'woonplaats', 'wijk', 'klantmanager'].includes(f)).length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {usedFields
                          .filter((f) => !['voornaam', 'achternaam', 'geslacht', 'geboortedatum', 'telefoon', 'email', 'postcode', 'woonplaats', 'wijk', 'klantmanager'].includes(f))
                          .map((field) => (
                            <div key={field} className="space-y-1">
                              <Label className="text-xs">{KANDIDAAT_FIELD_LABELS[field] ?? field}</Label>
                              <Input
                                className="h-8 text-sm"
                                value={String(editData[field] ?? '')}
                                onChange={(e) => setEditData((d) => ({ ...d, [field]: e.target.value || null }))}
                              />
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Data table */}
                {editIndex === null && (
                  <ScrollArea className="flex-1 rounded-lg border">
                    <div className="min-w-[800px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            {usedFields.slice(0, 8).map((f) => (
                              <TableHead key={f} className="text-xs">
                                {KANDIDAAT_FIELD_LABELS[f] ?? f}
                              </TableHead>
                            ))}
                            {usedFields.length > 8 && (
                              <TableHead className="text-xs text-muted-foreground">
                                +{usedFields.length - 8} meer
                              </TableHead>
                            )}
                            <TableHead className="w-20">Acties</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {kandidaten.map((k, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                              {usedFields.slice(0, 8).map((f) => (
                                <TableCell key={f} className="text-xs max-w-[150px] truncate">
                                  {Array.isArray(k[f])
                                    ? (k[f] as string[]).join(', ')
                                    : typeof k[f] === 'boolean'
                                      ? (k[f] ? 'Ja' : 'Nee')
                                      : String(k[f] ?? '—')}
                                </TableCell>
                              ))}
                              {usedFields.length > 8 && (
                                <TableCell className="text-xs text-muted-foreground">
                                  {usedFields.slice(8).filter((f) => k[f] != null && k[f] !== '').length} velden
                                </TableCell>
                              )}
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(i)}>
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeKandidaat(i)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Saving step ── */}
        {step === 'saving' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium">
              {saveProgress.done} van {saveProgress.total} kandidaten opgeslagen...
            </p>
            <div className="w-full max-w-xs">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all rounded-full"
                  style={{ width: `${saveProgress.total > 0 ? (saveProgress.done / saveProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Done step ── */}
        {step === 'done' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3 py-4">
              {saveErrors.length === 0 ? (
                <>
                  <div className="rounded-full bg-green-100 p-3">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-lg font-semibold">Alle {saveProgress.total} kandidaten geïmporteerd!</p>
                </>
              ) : (
                <>
                  <div className="rounded-full bg-amber-100 p-3">
                    <AlertTriangle className="h-8 w-8 text-amber-600" />
                  </div>
                  <p className="text-lg font-semibold">
                    {saveProgress.total - saveErrors.length} van {saveProgress.total} geïmporteerd
                  </p>
                </>
              )}
            </div>

            {saveErrors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                <p className="text-sm font-medium text-red-700">Fouten ({saveErrors.length}):</p>
                {saveErrors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600 pl-4">{err}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>Annuleren</Button>
          )}
          {step === 'preview' && kandidaten.length > 0 && editIndex === null && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ChevronLeft className="mr-1 h-4 w-4" />Terug
              </Button>
              <Button onClick={handleSaveAll}>
                <Check className="mr-2 h-4 w-4" />
                {kandidaten.length} kandidaten importeren
              </Button>
            </>
          )}
          {step === 'preview' && kandidaten.length === 0 && (
            <Button variant="outline" onClick={() => setStep('upload')}>
              <ChevronLeft className="mr-1 h-4 w-4" />Terug
            </Button>
          )}
          {step === 'done' && (
            <Button onClick={handleClose}>Sluiten</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
