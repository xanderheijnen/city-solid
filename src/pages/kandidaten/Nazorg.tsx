import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2, HeartHandshake } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { useKandidaten } from '@/hooks/useKandidaten';

export default function Nazorg() {
  const [search, setSearch] = useState('');
  // Nazorg = kandidaten die in de afronding zitten (trainingen/certificaten afgerond, maar worden nog gevolgd)
  const { data: kandidaten, isLoading } = useKandidaten({
    ...(search ? { search } : {}),
    traject_status: 'afronding',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HeartHandshake className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Uitstroom</h1>
          <p className="text-sm text-muted-foreground">
            Kandidaten die trainingen en certificaten hebben afgerond en worden gevolgd
          </p>
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
                <TableHead>E-mail</TableHead>
                <TableHead>Wijk</TableHead>
                <TableHead>Uitstroom status</TableHead>
                <TableHead>Klantmanager</TableHead>
                <TableHead className="w-40">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !kandidaten?.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    Geen kandidaten in nazorg.
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
                    <TableCell className="text-muted-foreground text-sm">
                      {k.email ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {k.wijk ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {k.uitstroom_status ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {k.klantmanager ?? '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={k.traject_status} />
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
