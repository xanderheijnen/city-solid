import { useMemo, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ActiviteitFilter } from '@/components/rapportage/ActiviteitFilter';
import {
  useRapportageDeelnemers,
  useUitstroomRubrieken,
  computeDashboardStats,
} from '@/hooks/useRapportageData';

const CHART_COLORS = ['#FFD62D', '#242C4C', '#4F87FF', '#34D399', '#F97316', '#EF4444', '#8B5CF6', '#EC4899'];

const DEFAULT_PROMPT = `Schrijf een beknopt rapportage-overzicht in het Nederlands voor de programmamanager.
Benoem de belangrijkste kerncijfers, opvallende trends in leeftijd/geslacht/opleiding,
en geef aanbevelingen voor de komende periode.`;

// ---------------------------------------------------------------------------
// Mock AI report generator
// ---------------------------------------------------------------------------
function generateMockReport(
  stats: ReturnType<typeof computeDashboardStats>,
  deelnemersCount: number,
  activiteit: string | undefined,
  prompt: string,
): string {
  const year = new Date().getFullYear();
  const activiteitLabel = activiteit ?? 'alle activiteiten';

  const geslachtDetail = stats.charts.geslachtData
    .map((g) => `${g.name}: ${g.value}`)
    .join(', ');

  const leeftijdDetail = stats.charts.leeftijdData
    .filter((l) => l.value > 0)
    .map((l) => `${l.name} jaar: ${l.value}`)
    .join(', ');

  const opleidingDetail = stats.charts.opleidingData
    .slice(0, 5)
    .map((o) => `${o.name}: ${o.value}`)
    .join(', ');

  const gebiedDetail = stats.charts.gebiedData
    .slice(0, 5)
    .map((g) => `${g.name}: ${g.value}`)
    .join(', ');

  const uitstroomDetail = stats.charts.uitstroomData
    .slice(0, 5)
    .map((u) => `${u.name}: ${u.value}`)
    .join(', ');

  return `RAPPORTAGE CITY SOLID PmG - ${year}
Activiteit: ${activiteitLabel}
Gegenereerd op: ${new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}

---

SAMENVATTING

In het kader van ${activiteitLabel} zijn in ${year} in totaal ${deelnemersCount} deelnemers begeleid binnen het City Solid programma. Van deze groep zijn ${stats.pipeline.gestart} deelnemers daadwerkelijk gestart met een traject, waarvan ${stats.pipeline.inProces} zich momenteel in proces bevinden en ${stats.pipeline.uitstroom} zijn uitgestroomd.

KERNCIJFERS

- Totaal instroom: ${stats.pipeline.instroom}
- Gestart: ${stats.pipeline.gestart}
- In proces: ${stats.pipeline.inProces}
- Uitstroom: ${stats.pipeline.uitstroom}
- Certificaten behaald: ${stats.certificaten.totaalCertificaten}
- Gezakt: ${stats.certificaten.totaalGezakt}
- Slagingspercentage: ${stats.certificaten.slagingspercentage}%

DEELNEMERSPROFIEL

De gemiddelde leeftijd van de deelnemers is ${stats.stats.gemLeeftijd} jaar. De geslachtsverdeling is ${stats.stats.geslachtVerdeling} (man/vrouw).

Leeftijdsverdeling: ${leeftijdDetail || 'geen data beschikbaar'}
Geslacht: ${geslachtDetail || 'geen data beschikbaar'}

${stats.stats.geenBrpPct}% van de deelnemers staat niet ingeschreven op een BRP-adres. ${stats.stats.justitiePct}% heeft te maken gehad met politie of justitie. ${stats.stats.uitkeringPct}% ontvangt een uitkering.

OPLEIDING

Het meest voorkomende opleidingsniveau is ${stats.stats.meestVoorkomendeOpleiding}.
Verdeling: ${opleidingDetail || 'geen data beschikbaar'}

GEBIEDEN

De top 5 gebieden naar aantal deelnemers: ${gebiedDetail || 'geen data beschikbaar'}

UITSTROOM

${uitstroomDetail ? `Uitstroom per status: ${uitstroomDetail}` : 'Geen uitstroomdata beschikbaar.'}

AANBEVELINGEN

1. Focus extra aandacht op gebieden met de hoogste instroom om begeleiding te waarborgen.
2. Het slagingspercentage van ${stats.certificaten.slagingspercentage}% biedt ruimte voor verbetering; overweeg extra ondersteuning bij examenvoorbereiding.
3. Gezien het percentage deelnemers zonder BRP-inschrijving (${stats.stats.geenBrpPct}%), is het raadzaam om samenwerking met gemeentelijke diensten te intensiveren.
4. Monitor de doorstroom van uitgestroomde deelnemers naar duurzame werk- of opleidingsposities.

---
Dit rapport is automatisch gegenereerd op basis van de beschikbare deelnemersdata.
Prompt gebruikt: "${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}"`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function RapportageAI() {
  const [activiteit, setActiviteit] = useState<string | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [rapport, setRapport] = useState<string>('');
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);

  const { data: deelnemers = [], isLoading } = useRapportageDeelnemers(activiteit);
  const { data: rubrieken = [] } = useUitstroomRubrieken();

  const stats = useMemo(
    () => computeDashboardStats(deelnemers, rubrieken),
    [deelnemers, rubrieken],
  );

  const handleGenerate = async () => {
    setIsGenerating(true);
    setRapport('');
    // Simulate AI generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const result = generateMockReport(stats, deelnemers.length, activiteit, prompt);
    setRapport(result);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Rapportage</h1>
          <p className="text-muted-foreground">
            {deelnemers.length} deelnemers voor {activiteit ?? 'alle activiteiten'}
          </p>
        </div>
        <ActiviteitFilter value={activiteit} onChange={setActiviteit} />
      </div>

      {/* Prompt customization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prompt aanpassen</CardTitle>
          <CardDescription>
            Pas de instructie aan om het rapport naar wens te genereren.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Beschrijf wat het rapport moet bevatten..."
          />
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || isLoading || deelnemers.length === 0}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Rapport genereren
          </Button>
        </CardContent>
      </Card>

      {/* Report output */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Rapport wordt gegenereerd...</p>
        </div>
      )}

      {!isGenerating && !rapport && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Sparkles className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground max-w-md">
            Klik op &apos;Rapport genereren&apos; om een AI-rapportage te maken op basis van de
            deelnemersdata.
          </p>
        </div>
      )}

      {!isGenerating && rapport && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gegenereerd rapport</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-muted/50 rounded-lg p-6">
                {rapport}
              </div>
            </CardContent>
          </Card>

          {/* Charts section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Grafieken</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Leeftijdsverdeling donut */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Leeftijdsverdeling</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.charts.leeftijdData.filter((d) => d.value > 0).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Geen leeftijdsdata beschikbaar.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={stats.charts.leeftijdData.filter((d) => d.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={2}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {stats.charts.leeftijdData
                            .filter((d) => d.value > 0)
                            .map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Geslacht donut */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Geslacht</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.charts.geslachtData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Geen geslachtsdata beschikbaar.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={stats.charts.geslachtData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={2}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {stats.charts.geslachtData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
