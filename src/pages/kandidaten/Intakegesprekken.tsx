import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2, CalendarCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { VoortgangStepper } from '@/components/VoortgangStepper';
import { StatusBadge } from '@/components/StatusBadge';
import { useKandidaten } from '@/hooks/useKandidaten';

export default function Intakegesprekken() {
  const [search, setSearch] = useState('');
  const { data: kandidaten, isLoading } = useKandidaten({
    ...(search ? { search } : {}),
    traject_status: ['intake_gepland', 'intake_afgerond'],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Intakegesprekken</h1>
            <p className="text-sm text-muted-foreground">
              Kandidaten met een gepland of afgerond intakegesprek
            </p>
          </div>
        </div>
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
                <TableHead>Telefoon</TableHead>
                <TableHead>Intake datum</TableHead>
                <TableHead>Intake tijd</TableHead>
                <TableHead>Aanmelder</TableHead>
                <TableHead>Organisatie</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="w-40">Status</TableHead>
                <TableHead className="w-64">Voortgang</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !kandidaten?.length ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                    Geen intakegesprekken gevonden.
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
                    <TableCell className="text-muted-foreground text-sm">
                      {k.telefoon ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {k.intake_datum ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {k.intake_tijd ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {k.aanmelder_naam || k.door_wie_bekend || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {k.aanmeld_organisatie ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {k.gewenst_project?.join(', ') ?? '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={k.traject_status} />
                    </TableCell>
                    <TableCell>
                      <VoortgangStepper currentStatus={k.traject_status} size="compact" />
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
