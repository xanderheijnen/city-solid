import { useState, useMemo } from 'react';
import { Search, Plus, Upload, Download, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ActiviteitFilter } from '@/components/rapportage/ActiviteitFilter';
import { useRapportageDeelnemers } from '@/hooks/useRapportageData';
import type { DeelnemerRapportage } from '@/lib/types';

function statusBadge(status: string | null) {
  if (!status) return null;
  const upper = status.toUpperCase();
  if (upper.includes('AFGEROND')) {
    return <Badge variant="secondary" className="bg-gray-200 text-gray-700">{upper}</Badge>;
  }
  if (upper.includes('LOPEND')) {
    return <Badge className="bg-primary/15 text-primary">{upper}</Badge>;
  }
  if (upper.includes('OVERGEDRAGEN')) {
    return <Badge variant="secondary" className="bg-gray-200 text-gray-700">{upper}</Badge>;
  }
  return <Badge variant="outline">{upper}</Badge>;
}

function boolLabel(val: boolean | null | undefined): string {
  return val ? 'Ja' : 'Nee';
}

// Sanitize CSV values to prevent formula injection (=, +, -, @, tab, CR)
function csvSafe(val: unknown): string {
  const s = String(val ?? '');
  if (/^[=+\-@\t\r]/.test(s)) return `'${s}`;
  return s;
}

function exportCSV(deelnemers: DeelnemerRapportage[]) {
  const headers = [
    'Activiteit', 'CSN', 'Uitstroom', 'Wijk', 'Gebied', 'Uitkering', 'Organisatie',
    'Leeftijd', 'Geslacht', 'Opleiding', 'Woonplaats', 'Ingeschreven', 'Sector',
    'No-show', 'Rijbewijs', 'Eenoudergezin', 'Verandering',
    '# Certificaten', '# Gezakt',
  ];
  const rows = deelnemers.map((d) => [
    csvSafe(d.activiteit),
    csvSafe(d.csn),
    csvSafe(d.uitstroom_status),
    csvSafe(d.wijk),
    csvSafe(d.gebied),
    csvSafe((d.uitkering ?? []).join('; ')),
    csvSafe(d.aanmeld_organisatie),
    csvSafe(d.leeftijd),
    csvSafe(d.geslacht),
    csvSafe(d.opleiding_niveau),
    csvSafe(d.woonplaats),
    csvSafe(d.ingeschreven_adres_brp),
    csvSafe((d.gewenste_sector ?? []).join('; ')),
    csvSafe(boolLabel(d.no_show)),
    csvSafe(boolLabel(d.rijbewijs)),
    csvSafe(boolLabel(d.eenoudergezin)),
    csvSafe(d.verandering),
    d.aantal_certificaten,
    d.aantal_gezakt,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'deelnemers_export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function RapportageDeelnemers() {
  const [activiteit, setActiviteit] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [editDeelnemer, setEditDeelnemer] = useState<DeelnemerRapportage | null>(null);

  const { data: deelnemers = [], isLoading } = useRapportageDeelnemers(activiteit);

  const filtered = useMemo(() => {
    if (!search.trim()) return deelnemers;
    const q = search.toLowerCase();
    return deelnemers.filter((d) => {
      const searchable = [
        d.csn,
        d.wijk,
        d.aanmeld_organisatie,
        d.uitstroom_status,
        d.voornaam,
        d.achternaam,
        d.gebied,
        d.woonplaats,
        d.opleiding_niveau,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [deelnemers, search]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deelnemers</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} van {deelnemers.length} deelnemers
          </p>
        </div>
        <ActiviteitFilter value={activiteit} onChange={setActiviteit} />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Toevoegen
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
          <Upload className="h-4 w-4" />
          Import Excel
        </button>
        <button
          onClick={() => exportCSV(filtered)}
          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Export Excel
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700">
          <Trash2 className="h-4 w-4" />
          Alles verwijderen
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op CSN, wijk, organisatie, uitstroom..."
          className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">Laden...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Activiteit</TableHead>
                    <TableHead className="whitespace-nowrap">CSN</TableHead>
                    <TableHead className="whitespace-nowrap">Uitstroom</TableHead>
                    <TableHead className="whitespace-nowrap">Wijk</TableHead>
                    <TableHead className="whitespace-nowrap">Gebied</TableHead>
                    <TableHead className="whitespace-nowrap">Uitkering</TableHead>
                    <TableHead className="whitespace-nowrap">Organisatie</TableHead>
                    <TableHead className="whitespace-nowrap">Leeftijd</TableHead>
                    <TableHead className="whitespace-nowrap">Geslacht</TableHead>
                    <TableHead className="whitespace-nowrap">Opleiding</TableHead>
                    <TableHead className="whitespace-nowrap">Woonplaats</TableHead>
                    <TableHead className="whitespace-nowrap">Ingeschreven</TableHead>
                    <TableHead className="whitespace-nowrap">Sector</TableHead>
                    <TableHead className="whitespace-nowrap">No-show</TableHead>
                    <TableHead className="whitespace-nowrap">Cert. 1</TableHead>
                    <TableHead className="whitespace-nowrap">Cert. 2</TableHead>
                    <TableHead className="whitespace-nowrap">Cert. 3</TableHead>
                    <TableHead className="whitespace-nowrap">Cert. 4</TableHead>
                    <TableHead className="whitespace-nowrap">Cert. 5</TableHead>
                    <TableHead className="whitespace-nowrap"># Cert.</TableHead>
                    <TableHead className="whitespace-nowrap"># Gezakt</TableHead>
                    <TableHead className="whitespace-nowrap">Justitie</TableHead>
                    <TableHead className="whitespace-nowrap">Rijbewijs</TableHead>
                    <TableHead className="whitespace-nowrap">Eenoudergezin</TableHead>
                    <TableHead className="whitespace-nowrap">Verandering</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={25} className="py-8 text-center text-muted-foreground">
                        Geen deelnemers gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((d) => {
                      const certs = d.certificaten_lijst ?? [];
                      return (
                        <TableRow
                          key={d.id}
                          className="cursor-pointer"
                          onClick={() => setEditDeelnemer(d)}
                        >
                          <TableCell className="whitespace-nowrap">{d.activiteit ?? '-'}</TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-xs">{d.csn ?? '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{statusBadge(d.uitstroom_status)}</TableCell>
                          <TableCell className="whitespace-nowrap">{d.wijk ?? '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{d.gebied ?? '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{(d.uitkering ?? []).join(', ') || '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{d.aanmeld_organisatie ?? '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{d.leeftijd ?? '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{d.geslacht ?? '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{d.opleiding_niveau ?? '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{d.woonplaats ?? '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{d.ingeschreven_adres_brp ?? '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{(d.gewenste_sector ?? []).join(', ') || '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{boolLabel(d.no_show)}</TableCell>
                          <TableCell className="whitespace-nowrap">{certs[0]?.behaald != null ? (certs[0].behaald ? 'V' : 'X') : '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{certs[1]?.behaald != null ? (certs[1].behaald ? 'V' : 'X') : '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{certs[2]?.behaald != null ? (certs[2].behaald ? 'V' : 'X') : '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{certs[3]?.behaald != null ? (certs[3].behaald ? 'V' : 'X') : '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{certs[4]?.behaald != null ? (certs[4].behaald ? 'V' : 'X') : '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{d.aantal_certificaten}</TableCell>
                          <TableCell className="whitespace-nowrap">{d.aantal_gezakt}</TableCell>
                          <TableCell className="whitespace-nowrap">{boolLabel(d.aanraking_politie_justitie)}</TableCell>
                          <TableCell className="whitespace-nowrap">{boolLabel(d.rijbewijs)}</TableCell>
                          <TableCell className="whitespace-nowrap">{boolLabel(d.eenoudergezin)}</TableCell>
                          <TableCell className="whitespace-nowrap">{d.verandering ?? '-'}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editDeelnemer} onOpenChange={(open) => !open && setEditDeelnemer(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Deelnemer bewerken: {editDeelnemer?.voornaam} {editDeelnemer?.achternaam}
            </DialogTitle>
            <DialogDescription>
              CSN: {editDeelnemer?.csn ?? '-'} | Activiteit: {editDeelnemer?.activiteit ?? '-'}
            </DialogDescription>
          </DialogHeader>

          {editDeelnemer && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Voornaam</label>
                <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue={editDeelnemer.voornaam} readOnly />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Achternaam</label>
                <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue={editDeelnemer.achternaam} readOnly />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Geslacht</label>
                <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue={editDeelnemer.geslacht ?? ''} readOnly />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Leeftijd</label>
                <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue={editDeelnemer.leeftijd ?? ''} readOnly />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Wijk</label>
                <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue={editDeelnemer.wijk ?? ''} readOnly />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Gebied</label>
                <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue={editDeelnemer.gebied ?? ''} readOnly />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Opleiding niveau</label>
                <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue={editDeelnemer.opleiding_niveau ?? ''} readOnly />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Woonplaats</label>
                <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue={editDeelnemer.woonplaats ?? ''} readOnly />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Uitstroom status</label>
                <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue={editDeelnemer.uitstroom_status ?? ''} readOnly />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Aanmeld organisatie</label>
                <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue={editDeelnemer.aanmeld_organisatie ?? ''} readOnly />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Uitkering</label>
                <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue={(editDeelnemer.uitkering ?? []).join(', ')} readOnly />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Gewenste sector</label>
                <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue={(editDeelnemer.gewenste_sector ?? []).join(', ')} readOnly />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Justitie</label>
                <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue={boolLabel(editDeelnemer.aanraking_politie_justitie)} readOnly />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Rijbewijs</label>
                <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue={boolLabel(editDeelnemer.rijbewijs)} readOnly />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Eenoudergezin</label>
                <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue={boolLabel(editDeelnemer.eenoudergezin)} readOnly />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">No-show</label>
                <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue={boolLabel(editDeelnemer.no_show)} readOnly />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Verandering</label>
                <textarea className="mt-1 w-full rounded-md border px-3 py-2 text-sm" rows={3} defaultValue={editDeelnemer.verandering ?? ''} readOnly />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Certificaten</label>
                <div className="mt-1 space-y-1">
                  {editDeelnemer.certificaten_lijst.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Geen certificaten</p>
                  ) : (
                    editDeelnemer.certificaten_lijst.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={c.behaald ? 'text-green-600' : 'text-red-500'}>
                          {c.behaald ? 'V' : 'X'}
                        </span>
                        <span>{c.naam}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <button
              onClick={() => setEditDeelnemer(null)}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Sluiten
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
