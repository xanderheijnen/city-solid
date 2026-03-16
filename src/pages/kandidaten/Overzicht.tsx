import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { StatusBadge } from '@/components/StatusBadge';
import { useKandidaten } from '@/hooks/useKandidaten';
import { GESLACHT_LABELS } from '@/lib/constants';
import type { Geslacht } from '@/lib/types';

export default function KandidatenOverzicht() {
  const [search, setSearch] = useState('');
  const { data: kandidaten, isLoading } = useKandidaten(
    search ? { search } : undefined,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kandidaten Overzicht</h1>
        <Button variant="outline" disabled>
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Zoek op naam, wijk, status..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-[1400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Voornaam</TableHead>
                    <TableHead>Achternaam</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Geslacht</TableHead>
                    <TableHead>Telefoon</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Wijk</TableHead>
                    <TableHead>Gebied</TableHead>
                    <TableHead>Uitkering</TableHead>
                    <TableHead>Klantmanager</TableHead>
                    <TableHead>Rijbewijs</TableHead>
                    <TableHead>Aanmeld datum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={13} className="h-32 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : !kandidaten?.length ? (
                    <TableRow>
                      <TableCell colSpan={13} className="h-32 text-center text-muted-foreground">
                        Geen kandidaten gevonden
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
                        <TableCell>{k.voornaam}</TableCell>
                        <TableCell>{k.achternaam}</TableCell>
                        <TableCell>
                          <StatusBadge status={k.traject_status} />
                        </TableCell>
                        <TableCell>{k.geslacht ? GESLACHT_LABELS[k.geslacht as Geslacht] : '—'}</TableCell>
                        <TableCell>{k.telefoon ?? '—'}</TableCell>
                        <TableCell>{k.email ?? '—'}</TableCell>
                        <TableCell>{k.wijk ?? '—'}</TableCell>
                        <TableCell>{k.gebied ?? '—'}</TableCell>
                        <TableCell>{k.uitkering?.join(', ') ?? '—'}</TableCell>
                        <TableCell>{k.klantmanager ?? '—'}</TableCell>
                        <TableCell>{k.rijbewijs ? 'Ja' : 'Nee'}</TableCell>
                        <TableCell>{k.aanmeld_datum ?? '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
