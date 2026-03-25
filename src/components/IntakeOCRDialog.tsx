import { useState, useRef, useCallback } from 'react';
import { Camera, Loader2, Check, X, CheckSquare, Square, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { parseImage, KANDIDAAT_FIELD_LABELS } from '@/lib/fileParser';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OCRField {
  key: string;
  label: string;
  ocrValue: string;
  currentValue: string;
  selected: boolean;
}

interface IntakeOCRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentValues: Record<string, any>;
  onApply: (values: Record<string, string>) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Phase = 'idle' | 'scanning' | 'review';

export function IntakeOCRDialog({ open, onOpenChange, currentValues, onApply }: IntakeOCRDialogProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [fields, setFields] = useState<OCRField[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [rawText, setRawText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setPhase('idle');
    setProgress(0);
    setFields([]);
    setWarnings([]);
    setRawText('');
  }, []);

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setPhase('scanning');
    setProgress(0);

    try {
      const result = await parseImage(file, (pct) => setProgress(pct));
      setWarnings(result.warnings);

      if (result.kandidaten.length === 0) {
        setPhase('idle');
        return;
      }

      // Take the first candidate's data
      const parsed = result.kandidaten[0] as Record<string, any>;

      // Build field list: only fields that OCR found a value for
      const ocrFields: OCRField[] = [];
      for (const [key, value] of Object.entries(parsed)) {
        if (!value || key === 'id' || key === 'display_id' || key === 'created_at' || key === 'updated_at') continue;
        const strValue = String(value).trim();
        if (!strValue) continue;

        const label = KANDIDAAT_FIELD_LABELS[key] || key;
        const currentVal = currentValues[key];
        const currentStr = currentVal == null ? '' :
          typeof currentVal === 'boolean' ? (currentVal ? 'Ja' : 'Nee') :
          Array.isArray(currentVal) ? currentVal.join(', ') :
          String(currentVal);

        ocrFields.push({
          key,
          label,
          ocrValue: strValue,
          currentValue: currentStr,
          selected: !currentStr, // Auto-select fields that are currently empty
        });
      }

      setFields(ocrFields);
      setRawText(result.kandidaten.length > 0 ? `${ocrFields.length} velden herkend` : '');
      setPhase('review');
    } catch (err) {
      setWarnings(['OCR mislukt: ' + (err instanceof Error ? err.message : 'onbekende fout')]);
      setPhase('idle');
    }
  };

  const toggleField = (key: string) => {
    setFields((prev) => prev.map((f) => f.key === key ? { ...f, selected: !f.selected } : f));
  };

  const selectAll = () => setFields((prev) => prev.map((f) => ({ ...f, selected: true })));
  const selectNone = () => setFields((prev) => prev.map((f) => ({ ...f, selected: false })));
  const selectEmpty = () => setFields((prev) => prev.map((f) => ({ ...f, selected: !f.currentValue })));

  const updateOcrValue = (key: string, value: string) => {
    setFields((prev) => prev.map((f) => f.key === key ? { ...f, ocrValue: value } : f));
  };

  const handleApply = () => {
    const values: Record<string, string> = {};
    for (const field of fields) {
      if (field.selected && field.ocrValue) {
        values[field.key] = field.ocrValue;
      }
    }
    onApply(values);
    handleClose();
  };

  const selectedCount = fields.filter((f) => f.selected).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Formulier scannen (OCR)
          </DialogTitle>
          <DialogDescription>
            Upload een foto van een handgeschreven intakeformulier. Het systeem herkent de tekst en vult de velden automatisch in.
          </DialogDescription>
        </DialogHeader>

        {/* Idle: file selection */}
        {phase === 'idle' && (
          <div className="space-y-4 py-4">
            <div
              className="flex h-40 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-center text-muted-foreground">
                <Camera className="mx-auto h-10 w-10 mb-2" />
                <p className="font-medium">Klik om een foto te uploaden</p>
                <p className="text-xs mt-1">Ondersteunde formaten: PNG, JPG, BMP, TIFF, PDF</p>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
            {warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  Waarschuwing
                </div>
                {warnings.map((w, i) => (
                  <p key={i} className="text-sm text-amber-700">{w}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scanning: progress */}
        {phase === 'scanning' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Tekst herkennen...</p>
              <p className="text-sm text-muted-foreground">Dit kan even duren bij grote afbeeldingen</p>
            </div>
            <div className="w-64">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground mt-1">{progress}%</p>
            </div>
          </div>
        )}

        {/* Review: field comparison */}
        {phase === 'review' && (
          <>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-emerald-700 bg-emerald-50">
                  {fields.length} velden herkend
                </Badge>
                <Badge variant="outline">
                  {selectedCount} geselecteerd
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAll}>
                  Alles
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectEmpty}>
                  Alleen lege
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectNone}>
                  Geen
                </Button>
              </div>
            </div>

            {warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                {warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-700">{w}</p>
                ))}
              </div>
            )}

            <ScrollArea className="flex-1 -mx-6 px-6" style={{ maxHeight: '400px' }}>
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-[28px_140px_1fr_1fr] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 py-1">
                  <div />
                  <div>Veld</div>
                  <div>OCR resultaat</div>
                  <div>Huidige waarde</div>
                </div>

                {fields.map((field) => (
                  <div
                    key={field.key}
                    className={cn(
                      'grid grid-cols-[28px_140px_1fr_1fr] gap-2 items-center px-2 py-1.5 rounded-lg transition-colors cursor-pointer',
                      field.selected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50',
                    )}
                    onClick={() => toggleField(field.key)}
                  >
                    {field.selected ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium truncate">{field.label}</span>
                    <Input
                      value={field.ocrValue}
                      onChange={(e) => { e.stopPropagation(); updateOcrValue(field.key, e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      className={cn('h-7 text-xs', field.selected && 'border-primary/50 bg-primary/5')}
                    />
                    <span className="text-xs text-muted-foreground truncate px-2">
                      {field.currentValue || <em className="text-muted-foreground/50">leeg</em>}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        {/* Footer */}
        {phase === 'review' && (
          <DialogFooter className="flex items-center justify-between border-t pt-3">
            <Button variant="ghost" onClick={() => { reset(); }} className="text-xs">
              Opnieuw scannen
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>Annuleren</Button>
              <Button onClick={handleApply} disabled={selectedCount === 0}>
                <Check className="mr-1 h-4 w-4" />
                {selectedCount} veld{selectedCount !== 1 ? 'en' : ''} overnemen
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
