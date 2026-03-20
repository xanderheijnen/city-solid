import { useMemo, useState } from 'react';
import { Printer, Loader2 } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActiviteitFilter } from '@/components/rapportage/ActiviteitFilter';
import {
  useRapportageDeelnemers,
  useUitstroomRubrieken,
  computeDashboardStats,
} from '@/hooks/useRapportageData';
import type { DeelnemerRapportage } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helper: current year
// ---------------------------------------------------------------------------
const currentYear = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Section footer
// ---------------------------------------------------------------------------
function SectionFooter() {
  return (
    <p className="text-xs text-muted-foreground mt-4 text-right print:text-[10px]">
      Eindrapportage City Solid PmG {currentYear}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Section header with City Solid branding
// ---------------------------------------------------------------------------
function SectionHeader({ title }: { title: string }) {
  return (
    <CardHeader className="bg-[#242C4C] text-white rounded-t-lg print:bg-[#242C4C] print:text-white">
      <p className="text-[10px] tracking-[0.3em] uppercase text-white/60 mb-1">CITY SOLID</p>
      <CardTitle className="text-lg">{title}</CardTitle>
    </CardHeader>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function RapportageEind() {
  const [activiteit, setActiviteit] = useState<string | undefined>();
  const { data: deelnemers = [], isLoading } = useRapportageDeelnemers(activiteit);
  const { data: rubrieken = [] } = useUitstroomRubrieken();

  const stats = useMemo(
    () => computeDashboardStats(deelnemers, rubrieken),
    [deelnemers, rubrieken],
  );

  // ---- Derived data for sections ----

  // Gebieden
  const gebiedList = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of deelnemers) {
      const g = d.gebied ?? 'Onbekend';
      map.set(g, (map.get(g) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [deelnemers]);

  // Aanmelders (organisatie)
  const aanmelderList = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of deelnemers) {
      const org = d.aanmeld_organisatie ?? 'Onbekend';
      map.set(org, (map.get(org) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [deelnemers]);

  // Geslacht percentages
  const manPct = deelnemers.length > 0
    ? Math.round((deelnemers.filter((d) => d.geslacht === 'man').length / deelnemers.length) * 100)
    : 0;
  const vrouwPct = deelnemers.length > 0
    ? Math.round((deelnemers.filter((d) => d.geslacht === 'vrouw').length / deelnemers.length) * 100)
    : 0;

  // Stopped / not started
  const gestopt = deelnemers.filter((d) => d.traject_status === 'uitgevallen').length;
  const nietGestart = deelnemers.filter((d) => d.traject_status === 'aanmelding').length;

  // Uitstroom details
  const aanHetWerk = deelnemers.filter(
    (d) => d.uitstroom_status?.toLowerCase().includes('werk'),
  ).length;
  const opSchool = deelnemers.filter(
    (d) => d.uitstroom_status?.toLowerCase().includes('school') || d.uitstroom_status?.toLowerCase().includes('opleiding'),
  ).length;

  // Opleiding breakdown
  const opleidingMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of deelnemers) {
      const o = d.opleiding_niveau ?? 'Onbekend';
      map.set(o, (map.get(o) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [deelnemers]);

  // Leeftijd groups
  const leeftijdBreakdown = useMemo(() => {
    const groups = [
      { label: '12-17 jaar', min: 12, max: 17, count: 0 },
      { label: '18-23 jaar', min: 18, max: 23, count: 0 },
      { label: '24-27 jaar', min: 24, max: 27, count: 0 },
      { label: '27+ jaar', min: 28, max: 999, count: 0 },
    ];
    for (const d of deelnemers) {
      let age: number | null = null;
      if (d.leeftijd) age = parseInt(d.leeftijd);
      else if (d.geboortedatum) {
        const birth = new Date(d.geboortedatum);
        age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      }
      if (age !== null) {
        for (const g of groups) {
          if (age >= g.min && age <= g.max) { g.count++; break; }
        }
      }
    }
    return groups;
  }, [deelnemers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between no-print">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Eindrapportage</h1>
            <p className="text-muted-foreground">
              Formele PmG eindrapportage {currentYear}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ActiviteitFilter value={activiteit} onChange={setActiviteit} />
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Printen
            </Button>
          </div>
        </div>

        {/* Section 1: Feiten & Cijfers */}
        <Card>
          <SectionHeader title={`CWST/Certi & Skills \u2013 ${currentYear} in feiten, cijfers en achtergrondinfo`} />
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Periode: 1 januari {currentYear} t/m 31 december {currentYear}
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Totaal aantal deelnemers: <strong>{deelnemers.length}</strong></li>
              <li>Gestopt / uitgevallen: <strong>{gestopt}</strong></li>
              <li>Niet gestart (aanmelding): <strong>{nietGestart}</strong></li>
              <li>
                PmG format: <strong>{stats.pipeline.instroom}</strong> instroom,{' '}
                <strong>{stats.pipeline.gestart}</strong> gestart,{' '}
                <strong>{stats.pipeline.inProces}</strong> in proces,{' '}
                <strong>{stats.pipeline.uitstroom}</strong> uitstroom
              </li>
            </ul>
            <SectionFooter />
          </CardContent>
        </Card>

        {/* Section 2: Gebieden */}
        <Card>
          <SectionHeader title="Gebieden" />
          <CardContent className="pt-6">
            {gebiedList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen gebiedsdata beschikbaar.</p>
            ) : (
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {gebiedList.map(([naam, count], i) => (
                  <li key={naam}>
                    {naam}: <strong>{count}</strong> deelnemer{count !== 1 ? 's' : ''}
                  </li>
                ))}
              </ol>
            )}
            <SectionFooter />
          </CardContent>
        </Card>

        {/* Section 3: Aanmelders */}
        <Card className="print-break">
          <SectionHeader title="Aanmelders" />
          <CardContent className="pt-6">
            {aanmelderList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen aanmelderdata beschikbaar.</p>
            ) : (
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {aanmelderList.map(([naam, count]) => (
                  <li key={naam}>
                    {naam}: <strong>{count}</strong>
                  </li>
                ))}
              </ol>
            )}
            <SectionFooter />
          </CardContent>
        </Card>

        {/* Section 4: Overige deelnemersinfo */}
        <Card>
          <SectionHeader title="Overige deelnemersinfo" />
          <CardContent className="pt-6 space-y-3 text-sm leading-relaxed">
            <p>
              Van de {deelnemers.length} deelnemers staat <strong>{stats.stats.geenBrpPct}%</strong> niet
              ingeschreven op een adres in de BRP. <strong>{stats.stats.justitiePct}%</strong> heeft
              te maken (gehad) met politie of justitie.
            </p>
            <p>
              <strong>Geslacht:</strong> {manPct}% man, {vrouwPct}% vrouw
              {100 - manPct - vrouwPct > 0 && `, ${100 - manPct - vrouwPct}% anders/onbekend`}.
            </p>
            <p>
              <strong>Gemiddelde leeftijd:</strong> {stats.stats.gemLeeftijd} jaar.
            </p>
            <div>
              <strong>Leeftijdsverdeling:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                {leeftijdBreakdown.map((g) => (
                  <li key={g.label}>{g.label}: {g.count} deelnemer{g.count !== 1 ? 's' : ''}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Opleidingsniveau:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                {opleidingMap.map(([naam, count]) => (
                  <li key={naam}>{naam}: {count}</li>
                ))}
              </ul>
            </div>
            <p>
              <strong>Uitkering:</strong> {stats.stats.uitkeringPct}% ontvangt een uitkering.
            </p>
            <SectionFooter />
          </CardContent>
        </Card>

        {/* Section 5: Certificaten */}
        <Card className="print-break">
          <SectionHeader title="Certificaten" />
          <CardContent className="pt-6 space-y-2 text-sm">
            <p>
              Totaal certificaten behaald: <strong>{stats.certificaten.totaalCertificaten}</strong>
            </p>
            <p>
              Totaal gezakt: <strong>{stats.certificaten.totaalGezakt}</strong>
            </p>
            <p>
              Slagingspercentage: <strong>{stats.certificaten.slagingspercentage}%</strong>
            </p>
            <SectionFooter />
          </CardContent>
        </Card>

        {/* Section 6: Uitstroom */}
        <Card>
          <SectionHeader title="Uitstroom" />
          <CardContent className="pt-6 space-y-3 text-sm">
            <p>
              Doorstroom naar werk: <strong>{aanHetWerk}</strong> deelnemer{aanHetWerk !== 1 ? 's' : ''}
            </p>
            <p>
              Doorstroom naar school/opleiding: <strong>{opSchool}</strong> deelnemer{opSchool !== 1 ? 's' : ''}
            </p>
            {stats.charts.uitstroomData.length > 0 && (
              <div>
                <strong>Uitstroom per status:</strong>
                <ul className="list-disc list-inside ml-4 mt-1">
                  {stats.charts.uitstroomData.map((item) => (
                    <li key={item.name}>{item.name}: {item.value}</li>
                  ))}
                </ul>
              </div>
            )}
            <SectionFooter />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
