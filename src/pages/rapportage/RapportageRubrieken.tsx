import { useState } from 'react';
import { Tag, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useUitstroomRubrieken, rapportageKeys } from '@/hooks/useRapportageData';
import type { UitstroomRubriekMapping } from '@/lib/types';

const RUBRIEK_OPTIONS = [
  { value: 'uitstroom', label: 'Uitstroom', color: 'text-green-700 bg-green-50' },
  { value: 'in_proces', label: 'In Proces', color: 'text-amber-700 bg-amber-50' },
  { value: 'uitval', label: 'Uitval/afval', color: 'text-red-700 bg-red-50' },
] as const;

export default function RapportageRubrieken() {
  const queryClient = useQueryClient();
  const { data: rubrieken, isLoading: rubriekenLoading } = useUitstroomRubrieken();
  const [newValue, setNewValue] = useState('');

  // Fetch all kandidaten uitstroom_status values for counts and unmapped detection
  const { data: kandidaten } = useQuery({
    queryKey: ['kandidaten-uitstroom'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_kandidaten')
        .select('uitstroom_status');
      if (error) throw error;
      return data as { uitstroom_status: string | null }[];
    },
  });

  // Count per uitstroom_status
  const countMap = new Map<string, number>();
  for (const k of kandidaten ?? []) {
    if (k.uitstroom_status) {
      const key = k.uitstroom_status;
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }
  }

  // Find unmapped values
  const mappedValues = new Set((rubrieken ?? []).map((r) => r.uitstroom_waarde));
  const unmappedValues = [...countMap.keys()].filter((v) => !mappedValues.has(v));

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateRubriek = useMutation({
    mutationFn: async ({ id, rubriek }: { id: string; rubriek: string }) => {
      const { error } = await supabase
        .from('cs_uitstroom_rubrieken')
        .update({ rubriek })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rapportageKeys.rubrieken() }),
  });

  const updateToon = useMutation({
    mutationFn: async ({ id, toon_in_grafieken }: { id: string; toon_in_grafieken: boolean }) => {
      const { error } = await supabase
        .from('cs_uitstroom_rubrieken')
        .update({ toon_in_grafieken })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rapportageKeys.rubrieken() }),
  });

  const insertRubriek = useMutation({
    mutationFn: async (uitstroom_waarde: string) => {
      const { error } = await supabase
        .from('cs_uitstroom_rubrieken')
        .insert({ uitstroom_waarde, rubriek: 'uitval', toon_in_grafieken: false });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rapportageKeys.rubrieken() });
      setNewValue('');
    },
  });

  const handleAddUnmapped = () => {
    for (const val of unmappedValues) {
      insertRubriek.mutate(val);
    }
  };

  const handleAddNew = () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    insertRubriek.mutate(trimmed);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Tag className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Uitstroom Rubrieken</h1>
          <p className="text-sm text-muted-foreground">
            Koppel uitstroomwaarden aan een rubriek en bepaal of ze meetellen in
            de grafieken.
          </p>
        </div>
      </div>

      {/* Warning block for unmapped values */}
      {unmappedValues.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">
                De volgende uitstroomwaarden zijn nog niet gekoppeld:
              </p>
              <ul className="mt-2 space-y-1">
                {unmappedValues.map((val) => (
                  <li key={val} className="text-sm text-amber-700">
                    &bull; {val.toUpperCase()}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-amber-400 text-amber-800 hover:bg-amber-100"
                onClick={handleAddUnmapped}
              >
                + NIET MEETELLEN
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rubrieken table */}
      <Card>
        <CardHeader>
          <CardTitle>Rubrieken overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Uitstroomwaarde</TableHead>
                <TableHead className="text-center">Aantal</TableHead>
                <TableHead>Rubriek</TableHead>
                <TableHead className="text-center">Toon in grafieken</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rubriekenLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Laden...
                  </TableCell>
                </TableRow>
              ) : (
                (rubrieken ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium uppercase">
                      {r.uitstroom_waarde}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className="rounded-full min-w-[28px] justify-center"
                      >
                        {countMap.get(r.uitstroom_waarde) ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.rubriek}
                        onValueChange={(value) =>
                          updateRubriek.mutate({ id: r.id, rubriek: value })
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RUBRIEK_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <span className={`px-2 py-0.5 rounded text-sm font-medium ${opt.color}`}>
                                {opt.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={r.toon_in_grafieken}
                        onCheckedChange={(checked) =>
                          updateToon.mutate({
                            id: r.id,
                            toon_in_grafieken: checked,
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Add new value */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t">
            <Input
              placeholder="Nieuwe uitstroomwaarde toevoegen..."
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNew()}
              className="max-w-sm"
            />
            <Button
              variant="outline"
              onClick={handleAddNew}
              disabled={!newValue.trim()}
            >
              + Toevoegen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
