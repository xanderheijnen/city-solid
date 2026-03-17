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
    } catch (err) {
      toast.error('Fout bij verwerken: ' + (err instanceof Error ? err.message : String(err)));
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

  // ── Save all ──
  const handleSaveAll = async () => {
    setStep('saving');
    setSaveProgress({ done: 0, total: kandidaten.length });
    const errors: string[] = [];

    for (let i = 0; i < kandidaten.length; i++) {
      const k = kandidaten[i];
      try {
        await createKandidaat.mutateAsync({
          voornaam: String(k.voornaam ?? ''),
          achternaam: String(k.achternaam ?? ''),
          ...k,
        });
      } catch (err) {
        const name = `${k.voornaam ?? ''} ${k.achternaam ?? ''}`.trim() || `Rij ${i + 1}`;
        errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
      }
      setSaveProgress({ done: i + 1, total: kandidaten.length });
    }

    setSaveErrors(errors);
    setStep('done');
    if (errors.length === 0) {
      toast.success(`${kandidaten.length} kandidaten succesvol geïmporteerd!`);
    } else {
      toast.warning(`${kandidaten.length - errors.length} van ${kandidaten.length} geïmporteerd, ${errors.length} fouten.`);
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
