import { Link } from 'react-router-dom';
import { Loader2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useTrainingsgroepen } from '@/hooks/useTrainingen';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { RESULTAAT_LABELS } from '@/lib/constants';
import type { Resultaat } from '@/lib/types';
import { exportToExcel } from '@/lib/excel';
import { useKandidaten } from '@/hooks/useKandidaten';

interface DeelnemerRow {
  id: string;
  kandidaat_id: string;
  trainingsgroep_id: string;
  resultaat: Resultaat;
  kandidaat: {
    display_id: string;
    voornaam: string;
    achternaam: string;
    traject_status: string;
  };
  trainingsgroep: {
    groepscode: string;
    training: { naam: string };
  };
}

export default function VoortgangOverzicht() {
  const { data: groepen, isLoading: loadingGroepen } = useTrainingsgroepen();
  const { data: kandidaten } = useKandidaten();

  const { data: alleDeelnames, isLoading: loadingDeelnames } = useQuery({
    queryKey: ['voortgang-overzicht'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_kandidaat_trainingen')
        .select('id, kandidaat_id, trainingsgroep_id, resultaat, kandidaat:cs_kandidaten(display_id, voornaam, achternaam, traject_status), trainingsgroep:cs_trainingsgroepen(groepscode, training:cs_trainingen(naam))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as DeelnemerRow[];
    },
  });

  const isLoading = loadingGroepen || loadingDeelnames;

  // Summary per groep
  const groepSummary = groepen?.map((g) => {
    const deelnames = alleDeelnames?.filter((d) => d.trainingsgroep_id === g.id) ?? [];
    const behaald = deelnames.filter((d) => d.resultaat === 'behaald').length;
    const nietBehaald = deelnames.filter((d) => d.resultaat === 'niet_behaald').length;
    const lopend = deelnames.filter((d) => d.resultaat === 'lopend').length;
    const gestopt = deelnames.filter((d) => d.resultaat === 'gestopt').length;
    return {
      ...g,
      deelnames: deelnames.length,
      behaald,
      nietBehaald,
      lopend,
      gestopt,
    };
  }) ?? [];

  const handleExport = () => {
    if (!kandidaten?.length) return;
    exportToExcel(kandidaten, 'city-solid-voortgang');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Voortgang & Resultaten</h1>
        <Button variant="outline" onClick={handleExport} disabled={!kandidaten?.length}>
          <Download className="mr-2 h-4 w-4" />Excel Export
        </Button>
      </div>

      {/* Summary per groep */}
      <Card>
        <CardHeader>
          <CardTitle>Resultaten per Groep</CardTitle>
          <CardDescription>Overzicht van resultaten voor elke trainingsgroep</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !groepSummary.length ? (
            <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
              Nog geen trainingsgroepen
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Groep</TableHead>
                  <TableHead>Training</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Deelnemers</TableHead>
                  <TableHead className="text-center">Behaald</TableHead>
                  <TableHead className="text-center">Niet behaald</TableHead>
                  <TableHead className="text-center">Lopend</TableHead>
                  <TableHead className="text-center">Gestopt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groepSummary.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <Link to={`/trainingen/groepen/${g.id}`} className="font-mono text-primary hover:underline">
                        {g.groepscode}
                      </Link>
                    </TableCell>
                    <TableCell>{g.training?.naam ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={g.status === 'actief' ? 'default' : 'secondary'}>
                        {g.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{g.deelnames}</TableCell>
                    <TableCell className="text-center font-medium text-green-600">{g.behaald || '—'}</TableCell>
                    <TableCell className="text-center font-medium text-red-600">{g.nietBehaald || '—'}</TableCell>
                    <TableCell className="text-center">{g.lopend || '—'}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{g.gestopt || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* All deelnames */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Deelnames</CardTitle>
          <CardDescription>Individuele resultaten per deelnemer</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !alleDeelnames?.length ? (
            <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
              Nog geen deelnames geregistreerd
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Naam</TableHead>
                  <TableHead>Groep</TableHead>
                  <TableHead>Training</TableHead>
                  <TableHead>Resultaat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alleDeelnames.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link to={`/kandidaten/${d.kandidaat_id}`} className="font-mono text-sm text-primary hover:underline">
                        {d.kandidaat?.display_id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={`/kandidaten/${d.kandidaat_id}`} className="hover:underline">
                        {d.kandidaat?.voornaam} {d.kandidaat?.achternaam}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={`/trainingen/groepen/${d.trainingsgroep_id}`} className="font-mono text-sm text-primary hover:underline">
                        {d.trainingsgroep?.groepscode}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{d.trainingsgroep?.training?.naam}</TableCell>
                    <TableCell>
                      <Badge variant={d.resultaat === 'behaald' ? 'default' : 'secondary'}>
                        {RESULTAAT_LABELS[d.resultaat as Resultaat] ?? d.resultaat}
                      </Badge>
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
