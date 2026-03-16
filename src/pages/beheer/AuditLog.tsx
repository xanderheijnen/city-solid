import { useState } from 'react';
import { Loader2, Search, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { AuditAction } from '@/lib/types';

const ACTIE_LABELS: Record<AuditAction, string> = {
  create: 'Aangemaakt',
  update: 'Gewijzigd',
  delete: 'Verwijderd',
  status_change: 'Status gewijzigd',
  export: 'Geëxporteerd',
  login: 'Ingelogd',
  view_sensitive: 'Gevoelige data bekeken',
};

const ACTIE_COLORS: Record<AuditAction, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  status_change: 'bg-amber-100 text-amber-700',
  export: 'bg-purple-100 text-purple-700',
  login: 'bg-gray-100 text-gray-700',
  view_sensitive: 'bg-orange-100 text-orange-700',
};

export default function AuditLog() {
  const [search, setSearch] = useState('');
  const [actieFilter, setActieFilter] = useState<string>('alle');

  const filters = {
    search: search || undefined,
    actie: actieFilter !== 'alle' ? (actieFilter as AuditAction) : undefined,
  };

  const { data: entries, isLoading } = useAuditLog(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Onwijzigbare registratie van alle systeemactiviteit (AVG)</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Zoek in audit log..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={actieFilter} onValueChange={setActieFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter op actie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle acties</SelectItem>
                {(Object.keys(ACTIE_LABELS) as AuditAction[]).map((actie) => (
                  <SelectItem key={actie} value={actie}>
                    {ACTIE_LABELS[actie]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !entries?.length ? (
            <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
              Nog geen audit log entries
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Datum/Tijd</TableHead>
                  <TableHead>Actie</TableHead>
                  <TableHead>Object</TableHead>
                  <TableHead>Omschrijving</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleDateString('nl-NL', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ACTIE_COLORS[entry.actie]}`}>
                        {ACTIE_LABELS[entry.actie]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{entry.object_type}</span>
                      {entry.object_id && (
                        <span className="ml-1 text-xs text-muted-foreground font-mono">{entry.object_id.slice(0, 8)}</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      {entry.omschrijving ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
