import { Upload, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useImportLog } from '@/hooks/useRapportageData';

function formatDatum(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RapportageImportLog() {
  const { data: imports, isLoading } = useImportLog();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Upload className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Import Logboek</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? 'Laden...'
              : `${imports?.length ?? 0} imports geregistreerd`}
          </p>
        </div>
      </div>

      {/* Content */}
      {!isLoading && (!imports || imports.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Nog geen imports uitgevoerd.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Na een Excel-import verschijnt hier het logboek met eventuele
              fouten.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Importgeschiedenis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Bestandsnaam</TableHead>
                  <TableHead>Bron</TableHead>
                  <TableHead className="text-right">Aantal rijen</TableHead>
                  <TableHead className="text-right">Succesvol</TableHead>
                  <TableHead className="text-right">Mislukt</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports?.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDatum(entry.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.bestandsnaam}
                    </TableCell>
                    <TableCell>{entry.bron}</TableCell>
                    <TableCell className="text-right">
                      {entry.aantal_rijen}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.aantal_succesvol}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.aantal_mislukt}
                    </TableCell>
                    <TableCell>
                      {entry.aantal_mislukt === 0 ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Voltooid
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          Fouten
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
