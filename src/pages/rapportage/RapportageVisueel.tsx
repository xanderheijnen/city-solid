import { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActiviteitFilter } from '@/components/rapportage/ActiviteitFilter';
import {
  useRapportageDeelnemers,
  useUitstroomRubrieken,
  computeDashboardStats,
} from '@/hooks/useRapportageData';

function HBar({
  label,
  value,
  total,
  color = 'bg-primary',
}: {
  label: string;
  value: number;
  total: number;
  color?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">
          {value} ({pct}%)
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function RapportageVisueel() {
  const [activiteit, setActiviteit] = useState<string | undefined>(undefined);

  const { data: deelnemers = [], isLoading: loadingD } = useRapportageDeelnemers(activiteit);
  const { data: rubrieken = [], isLoading: loadingR } = useUitstroomRubrieken();

  const stats = useMemo(
    () => computeDashboardStats(deelnemers, rubrieken),
    [deelnemers, rubrieken],
  );

  const isLoading = loadingD || loadingR;
  const total = deelnemers.length;

  // Derived data for visual sections
  const mannen = stats.charts.geslachtData.find((d) => d.name === 'Man')?.value ?? 0;
  const vrouwen = stats.charts.geslachtData.find((d) => d.name === 'Vrouw')?.value ?? 0;
  const manPct = total > 0 ? Math.round((mannen / total) * 100) : 0;
  const vrouwPct = total > 0 ? Math.round((vrouwen / total) * 100) : 0;

  const eenoudergezinCount = deelnemers.filter((d) => d.eenoudergezin).length;
  const eenoudergezinPct = total > 0 ? Math.round((eenoudergezinCount / total) * 100) : 0;

  // Certificaat verdeling per deelnemer
  const certBuckets = useMemo(() => {
    const buckets = { '0': 0, '1-2': 0, '3-4': 0, '5+': 0 };
    for (const d of deelnemers) {
      const n = d.aantal_certificaten;
      if (n === 0) buckets['0']++;
      else if (n <= 2) buckets['1-2']++;
      else if (n <= 4) buckets['3-4']++;
      else buckets['5+']++;
    }
    return buckets;
  }, [deelnemers]);

  // Justitie data
  const justitieJa = deelnemers.filter((d) => d.aanraking_politie_justitie).length;
  const justitieNee = total - justitieJa;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rapportage</h1>
        <ActiviteitFilter value={activiteit} onChange={setActiviteit} />
      </div>

      {/* Summary card */}
      <Card>
        <CardContent className="flex items-start gap-4 p-6">
          <TrendingUp className="mt-1 h-8 w-8 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed">
            Het programma telt momenteel <strong>{total}</strong> deelnemer{total !== 1 ? 's' : ''}.
            Hiervan zijn <strong>{stats.pipeline.gestart}</strong> trajecten gestart,{' '}
            <strong>{stats.pipeline.inProces}</strong> zijn in proces en{' '}
            <strong>{stats.pipeline.uitstroom}</strong> zijn uitgestroomd. De gemiddelde leeftijd is{' '}
            <strong>{stats.stats.gemLeeftijd}</strong> jaar. <strong>{stats.stats.uitkeringPct}%</strong> heeft
            een uitkering en <strong>{stats.stats.justitiePct}%</strong> heeft een justitie achtergrond.
          </p>
        </CardContent>
      </Card>

      {/* Section 1: Demografisch overzicht */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Demografisch overzicht</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Leeftijdsverdeling */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Leeftijdsverdeling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.charts.leeftijdData.map((g) => (
                <HBar
                  key={g.name}
                  label={g.name}
                  value={g.value}
                  total={total}
                  color="bg-primary"
                />
              ))}
            </CardContent>
          </Card>

          {/* Geslacht */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Geslacht</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                Van de <strong>{total}</strong> deelnemers is <strong>{manPct}%</strong> man (
                {mannen}) en <strong>{vrouwPct}%</strong> vrouw ({vrouwen}).
              </p>
              <HBar label="Man" value={mannen} total={total} color="bg-blue-500" />
              <HBar label="Vrouw" value={vrouwen} total={total} color="bg-pink-500" />
            </CardContent>
          </Card>

          {/* Uitstroomstatus */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Uitstroomstatus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.charts.uitstroomData.map((d, i) => (
                <HBar
                  key={d.name}
                  label={d.name}
                  value={d.value}
                  total={total}
                  color={
                    ['bg-primary', 'bg-amber-500', 'bg-green-500', 'bg-red-500', 'bg-purple-500', 'bg-cyan-500'][
                      i % 6
                    ]
                  }
                />
              ))}
              {stats.charts.uitstroomData.length === 0 && (
                <p className="text-sm text-muted-foreground">Geen uitstroomgegevens</p>
              )}
            </CardContent>
          </Card>

          {/* Overige kenmerken */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Overige kenmerken</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                <strong>{eenoudergezinPct}%</strong> van de deelnemers ({eenoudergezinCount}) is
                onderdeel van een eenoudergezin.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 2: Opleiding en Status */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Opleiding en Status</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Opleidingsniveau */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Opleidingsniveau</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.charts.opleidingData.map((d, i) => (
                <HBar
                  key={d.name}
                  label={d.name}
                  value={d.value}
                  total={total}
                  color={
                    ['bg-primary', 'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500'][i % 5]
                  }
                />
              ))}
              {stats.charts.opleidingData.length === 0 && (
                <p className="text-sm text-muted-foreground">Geen opleidingsgegevens</p>
              )}
            </CardContent>
          </Card>

          {/* Justitie achtergrond */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Justitie achtergrond</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <HBar label="Ja" value={justitieJa} total={total} color="bg-red-500" />
              <HBar label="Nee" value={justitieNee} total={total} color="bg-green-500" />
            </CardContent>
          </Card>

          {/* Uitkering */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Uitkering</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.charts.uitkeringData.map((d) => (
                <HBar
                  key={d.name}
                  label={d.name}
                  value={d.value}
                  total={total}
                  color={d.name === 'Ja' ? 'bg-amber-500' : 'bg-green-500'}
                />
              ))}
            </CardContent>
          </Card>

          {/* Aanmeldorganisaties */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Aanmeldorganisaties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.charts.organisatieData.map((d, i) => (
                <HBar
                  key={d.name}
                  label={d.name}
                  value={d.value}
                  total={total}
                  color={
                    ['bg-primary', 'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-cyan-500'][
                      i % 6
                    ]
                  }
                />
              ))}
              {stats.charts.organisatieData.length === 0 && (
                <p className="text-sm text-muted-foreground">Geen organisatiegegevens</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 3: Certificaten */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Certificaten</h2>

        {/* 3 KPI cards */}
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <p className="text-sm font-medium text-green-700">Behaald</p>
              <p className="mt-1 text-4xl font-bold text-green-600">
                {stats.certificaten.totaalCertificaten}
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-6 text-center">
              <p className="text-sm font-medium text-amber-700">Gezakt</p>
              <p className="mt-1 text-4xl font-bold text-amber-600">
                {stats.certificaten.totaalGezakt}
              </p>
            </CardContent>
          </Card>
          <Card
            className={
              stats.certificaten.slagingspercentage === 0
                ? 'border-red-200 bg-red-50'
                : 'border-green-200 bg-green-50'
            }
          >
            <CardContent className="p-6 text-center">
              <p
                className={`text-sm font-medium ${
                  stats.certificaten.slagingspercentage === 0 ? 'text-red-700' : 'text-green-700'
                }`}
              >
                Slagingspercentage
              </p>
              <p
                className={`mt-1 text-4xl font-bold ${
                  stats.certificaten.slagingspercentage === 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {stats.certificaten.slagingspercentage}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Verdeling per deelnemer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Verdeling per deelnemer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <HBar label="0 certificaten" value={certBuckets['0']} total={total} color="bg-gray-400" />
            <HBar label="1-2 certificaten" value={certBuckets['1-2']} total={total} color="bg-amber-500" />
            <HBar label="3-4 certificaten" value={certBuckets['3-4']} total={total} color="bg-green-500" />
            <HBar label="5+ certificaten" value={certBuckets['5+']} total={total} color="bg-primary" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
