import { useMemo, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { ActiviteitFilter } from '@/components/rapportage/ActiviteitFilter';
import {
  useRapportageDeelnemers,
  useUitstroomRubrieken,
  computeDashboardStats,
} from '@/hooks/useRapportageData';
import type { DeelnemerRapportage } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROTTERDAM_GEBIEDEN = [
  'Hoek van Holland',
  'Overschie',
  'Hillegersberg-Schiebroek',
  'Noord',
  'Prins Alexander',
  'Kralingen-Crooswijk',
  'Centrum',
  'Delfshaven',
  'Charlois',
  'Feijenoord',
  'IJsselmonde',
  'Hoogvliet',
  'Pernis',
  'Rozenburg',
] as const;

const AREA_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

interface GebiedStats {
  naam: string;
  deelnemers: number;
  certificaten: number;
  aanHetWerk: number;
  opSchool: number;
}

// ---------------------------------------------------------------------------
// Helper: compute per-gebied stats
// ---------------------------------------------------------------------------
function computeGebiedStats(deelnemers: DeelnemerRapportage[]): GebiedStats[] {
  const map = new Map<string, GebiedStats>();

  for (const gebied of ROTTERDAM_GEBIEDEN) {
    map.set(gebied, { naam: gebied, deelnemers: 0, certificaten: 0, aanHetWerk: 0, opSchool: 0 });
  }

  for (const d of deelnemers) {
    const g = d.gebied ?? '';
    // Match to known gebied (case-insensitive partial match)
    const match = ROTTERDAM_GEBIEDEN.find(
      (rg) => rg.toLowerCase() === g.toLowerCase() || g.toLowerCase().includes(rg.toLowerCase()),
    );
    const key = match ?? g;

    if (!map.has(key)) {
      map.set(key, { naam: key, deelnemers: 0, certificaten: 0, aanHetWerk: 0, opSchool: 0 });
    }
    const entry = map.get(key)!;
    entry.deelnemers += 1;
    entry.certificaten += d.aantal_certificaten;
    if (d.uitstroom_status?.toLowerCase().includes('werk')) entry.aanHetWerk += 1;
    if (
      d.uitstroom_status?.toLowerCase().includes('school') ||
      d.uitstroom_status?.toLowerCase().includes('opleiding')
    ) {
      entry.opSchool += 1;
    }
  }

  return [...map.values()];
}

// ---------------------------------------------------------------------------
// Area card component
// ---------------------------------------------------------------------------
interface AreaCardProps {
  gebied: GebiedStats;
  maxCount: number;
  colorIndex: number;
  isSelected: boolean;
  onClick: () => void;
}

function AreaCard({ gebied, maxCount, colorIndex, isSelected, onClick }: AreaCardProps) {
  const intensity = maxCount > 0 ? Math.max(0.08, gebied.deelnemers / maxCount) : 0.08;
  const color = AREA_COLORS[colorIndex % AREA_COLORS.length];

  return (
    <button
      onClick={onClick}
      className={`
        relative p-4 rounded-lg border-2 text-left transition-all hover:shadow-md
        ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'}
      `}
      style={{
        backgroundColor: `${color}${Math.round(intensity * 30).toString(16).padStart(2, '0')}`,
      }}
    >
      <p className="text-sm font-medium truncate">{gebied.naam}</p>
      <div className="flex items-center gap-3 mt-2">
        {/* Deelnemers circle */}
        <div
          className="flex items-center justify-center rounded-full text-white text-xs font-bold"
          style={{
            width: Math.max(32, 28 + gebied.deelnemers * 2),
            height: Math.max(32, 28 + gebied.deelnemers * 2),
            backgroundColor: '#242C4C',
          }}
        >
          {gebied.deelnemers}
        </div>
        {/* Certificaten circle */}
        {gebied.certificaten > 0 && (
          <div
            className="flex items-center justify-center rounded-full text-white text-xs font-bold"
            style={{
              width: Math.max(28, 24 + gebied.certificaten * 2),
              height: Math.max(28, 24 + gebied.certificaten * 2),
              backgroundColor: color,
            }}
          >
            {gebied.certificaten}
          </div>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function RapportageGebiedskaart() {
  const [activiteit, setActiviteit] = useState<string | undefined>();
  const [selectedGebied, setSelectedGebied] = useState<string | null>(null);

  const { data: deelnemers = [], isLoading } = useRapportageDeelnemers(activiteit);
  const { data: rubrieken = [] } = useUitstroomRubrieken();

  const gebiedStats = useMemo(() => computeGebiedStats(deelnemers), [deelnemers]);
  const maxCount = useMemo(
    () => Math.max(1, ...gebiedStats.map((g) => g.deelnemers)),
    [gebiedStats],
  );

  const selected = useMemo(
    () => gebiedStats.find((g) => g.naam === selectedGebied) ?? null,
    [gebiedStats, selectedGebied],
  );

  // Ranking sorted by deelnemers descending
  const ranking = useMemo(
    () => [...gebiedStats].sort((a, b) => b.deelnemers - a.deelnemers),
    [gebiedStats],
  );

  // Totals
  const totaalDeelnemers = deelnemers.length;
  const totaalCertificaten = useMemo(
    () => gebiedStats.reduce((s, g) => s + g.certificaten, 0),
    [gebiedStats],
  );
  const totaalWerk = useMemo(
    () => gebiedStats.reduce((s, g) => s + g.aanHetWerk, 0),
    [gebiedStats],
  );
  const totaalSchool = useMemo(
    () => gebiedStats.reduce((s, g) => s + g.opSchool, 0),
    [gebiedStats],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <MapPin className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gebiedskaart Rotterdam</h1>
            <p className="text-muted-foreground">
              Overzicht van deelnemers per Rotterdams gebied
            </p>
          </div>
        </div>
        <ActiviteitFilter value={activiteit} onChange={setActiviteit} />
      </div>

      {/* Main grid: map left, detail right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: area grid (2/3) */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {gebiedStats.map((gebied, i) => (
              <AreaCard
                key={gebied.naam}
                gebied={gebied}
                maxCount={maxCount}
                colorIndex={i}
                isSelected={selectedGebied === gebied.naam}
                onClick={() =>
                  setSelectedGebied((prev) => (prev === gebied.naam ? null : gebied.naam))
                }
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#242C4C]" />
              <span>Deelnemers</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#f59e0b]" />
              <span>Certificaten</span>
            </div>
          </div>
        </div>

        {/* Right: detail + totaal + ranking (1/3) */}
        <div className="space-y-4">
          {/* Selected detail or placeholder */}
          {selected ? (
            <Card>
              <CardHeader className="bg-[#242C4C] text-white rounded-t-lg">
                <CardTitle className="text-base">{selected.naam}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Deelnemers</p>
                    <p className="text-2xl font-bold">{selected.deelnemers}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Certificaten</p>
                    <p className="text-2xl font-bold">{selected.certificaten}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Aan het werk</p>
                    <p className="text-2xl font-bold text-emerald-600">{selected.aanHetWerk}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Op school</p>
                    <p className="text-2xl font-bold text-emerald-600">{selected.opSchool}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <MapPin className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Selecteer een gebied om de details te bekijken
                </p>
              </CardContent>
            </Card>
          )}

          {/* Totaaloverzicht */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Totaaloverzicht</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Totaal deelnemers</span>
                <span className="font-semibold">{totaalDeelnemers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Certificaten behaald</span>
                <span className="font-semibold">{totaalCertificaten}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aan het werk</span>
                <span className="font-semibold text-emerald-600">{totaalWerk}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Op school</span>
                <span className="font-semibold text-emerald-600">{totaalSchool}</span>
              </div>
            </CardContent>
          </Card>

          {/* Ranking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-1.5 text-sm">
                {ranking.map((g, i) => (
                  <li
                    key={g.naam}
                    className={`flex items-center gap-2 cursor-pointer rounded px-2 py-1 transition-colors hover:bg-muted ${
                      selectedGebied === g.naam ? 'bg-muted font-medium' : ''
                    }`}
                    onClick={() =>
                      setSelectedGebied((prev) => (prev === g.naam ? null : g.naam))
                    }
                  >
                    <span className="w-5 text-muted-foreground text-right">{i + 1}.</span>
                    <span className="flex-1 truncate">{g.naam}</span>
                    <span className="text-muted-foreground">{g.deelnemers} dl</span>
                    <span className="text-muted-foreground">{g.certificaten} cert</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
