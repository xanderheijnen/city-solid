import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { TramlineStepper } from '@/components/TramlineStepper';
import { StatusBadge } from '@/components/StatusBadge';
import { PermissionGate } from '@/components/PermissionGate';
import { useKandidaten } from '@/hooks/useKandidaten';

export default function Aanmeldingen() {
  const [search, setSearch] = useState('');
  const { data: kandidaten, isLoading } = useKandidaten(
    search ? { search } : undefined,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Aanmeldingen</h1>
        <PermissionGate roles={['admin', 'intaker']}>
          <Button asChild>
            <Link to="/kandidaten/aanmeldingen/nieuw">
              <Plus className="mr-2 h-4 w-4" />
              Nieuwe Aanmelding
            </Link>
          </Button>
        </PermissionGate>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Zoek op naam, ID..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Naam</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="w-48">Status</TableHead>
                <TableHead className="w-64">Tramlijn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !kandidaten?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Nog geen aanmeldingen. Klik op "Nieuwe Aanmelding" om te beginnen.
                  </TableCell>
                </TableRow>
              ) : (
                kandidaten.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-mono text-sm">
                      <Link to={`/kandidaten/${k.id}`} className="text-primary hover:underline">
                        {k.display_id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={`/kandidaten/${k.id}`} className="hover:underline">
                        {k.voornaam} {k.achternaam}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {k.aanmeld_datum ?? '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={k.traject_status} />
                    </TableCell>
                    <TableCell>
                      <TramlineStepper currentStatus={k.traject_status} size="compact" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
