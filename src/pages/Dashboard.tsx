import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, TrendingUp, UserX, Loader2, Download, CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useKandidaten } from '@/hooks/useKandidaten';
import { useTrainingsgroepen } from '@/hooks/useTrainingen';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { VOORTGANG_STEPS } from '@/lib/constants';
import { exportToExcel } from '@/lib/excel';
import type { TrajectStatus, Resultaat } from '@/lib/types';

const CHART_COLORS = ['#FFD62D', '#242C4C', '#4F87FF', '#34D399', '#F97316', '#EF4444', '#8B5CF6', '#EC4899'];
const STATUS_COLOR_MAP: Partial<Record<TrajectStatus, string>> = {
  aanmelding: '#93C5FD',
  intake_gepland: '#60A5FA',
  intake_afgerond: '#3B82F6',
  deelnemer: '#FFD62D',
  in_training: '#F59E0B',
  voortgang: '#34D399',
  afronding: '#10B981',
  uitgevallen: '#EF4444',
};

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

function StatCard({ title, value, description, icon: Icon, iconColor }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

// ─── Helper: week dates ─────────────────────────────────────────────────────
function getWeekDates(weekOffset: number) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  const dates: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDateISO(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function Dashboard() {
  const { data: kandidaten, isLoading: loadingKandidaten } = useKandidaten();
  const { data: groepen, isLoading: loadingGroepen } = useTrainingsgroepen();
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: alleTrainingen } = useQuery({
    queryKey: ['dashboard-trainingen'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_kandidaat_trainingen')
        .select('resultaat');
      if (error) throw error;
      return data as { resultaat: Resultaat }[];
    },
  });

  const isLoading = loadingKandidaten || loadingGroepen;

  const stats = useMemo(() => {
    const totaal = kandidaten?.length ?? 0;
    const inTraining = kandidaten?.filter(
      (k) => ['in_training', 'voortgang', 'deelnemer'].includes(k.traject_status),
    ).length ?? 0;
    const uitgevallen = kandidaten?.filter(
      (k) => k.traject_status === 'uitgevallen',
    ).length ?? 0;
    const afgerond = kandidaten?.filter(
      (k) => k.traject_status === 'afronding',
    ).length ?? 0;

    const afgerondeTrainingen = alleTrainingen?.filter(
      (t) => t.resultaat === 'behaald' || t.resultaat === 'niet_behaald',
    ) ?? [];
    const behaald = afgerondeTrainingen.filter((t) => t.resultaat === 'behaald').length;
    const slagingspercentage = afgerondeTrainingen.length > 0
      ? Math.round((behaald / afgerondeTrainingen.length) * 100)
      : null;

    return { totaal, inTraining, uitgevallen, afgerond, slagingspercentage };
  }, [kandidaten, alleTrainingen]);

  const voortgangData = useMemo(() => {
    if (!kandidaten?.length) return [];
    const counts: Partial<Record<TrajectStatus, number>> = {};
    kandidaten.forEach((k) => {
      counts[k.traject_status] = (counts[k.traject_status] ?? 0) + 1;
    });
    return VOORTGANG_STEPS.map((step) => ({
      name: step.label,
      aantal: counts[step.key as TrajectStatus] ?? 0,
      fill: STATUS_COLOR_MAP[step.key as TrajectStatus] ?? '#94A3B8',
    }));
  }, [kandidaten]);

  const instroomData = useMemo(() => {
    if (!kandidaten?.length) return [];
    const maanden: Record<string, number> = {};
    kandidaten.forEach((k) => {
      const datum = k.aanmeld_datum ?? k.created_at;
      if (datum) {
        const maand = datum.substring(0, 7);
        maanden[maand] = (maanden[maand] ?? 0) + 1;
      }
    });
    return Object.entries(maanden)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([maand, aantal]) => ({
        maand: new Date(maand + '-01').toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' }),
        aantal,
      }));
  }, [kandidaten]);

  const resultaatData = useMemo(() => {
    if (!alleTrainingen?.length) return [];
    const counts: Record<string, number> = {};
    alleTrainingen.forEach((t) => {
      counts[t.resultaat] = (counts[t.resultaat] ?? 0) + 1;
    });
    const labels: Record<string, string> = {
      behaald: 'Behaald', niet_behaald: 'Niet behaald', lopend: 'Lopend', gestopt: 'Gestopt',
    };
    return Object.entries(counts).map(([key, value]) => ({
      name: labels[key] ?? key, value,
    }));
  }, [alleTrainingen]);

  // ── Intake agenda data ──
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const intakeAfspraken = useMemo(() => {
    if (!kandidaten?.length) return new Map<string, typeof kandidaten>();
    const map = new Map<string, typeof kandidaten>();
    kandidaten
      .filter((k) => k.intake_datum && k.intake_tijd)
      .forEach((k) => {
        const d = k.intake_datum!;
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(k);
      });
    // Sort per dag op tijd
    map.forEach((list) => list.sort((a, b) => (a.intake_tijd ?? '').localeCompare(b.intake_tijd ?? '')));
    return map;
  }, [kandidaten]);

  const totalIntakesDezWeek = useMemo(() => {
    let count = 0;
    weekDates.forEach((d) => {
      count += intakeAfspraken.get(formatDateISO(d))?.length ?? 0;
    });
    return count;
  }, [weekDates, intakeAfspraken]);

  const handleExport = () => {
    if (!kandidaten?.length) return;
    exportToExcel(kandidaten, 'city-solid-dashboard');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overzicht van alle kandidaten en trainingen.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!kandidaten?.length}>
          <Download className="mr-2 h-4 w-4" />Excel Export
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Totaal Kandidaten"
            value={stats.totaal}
            description={`${stats.afgerond} afgerond`}
            icon={Users}
            iconColor="text-blue-600"
          />
          <StatCard
            title="Actief in Training"
            value={stats.inTraining}
            description={`In ${groepen?.filter((g) => g.status === 'actief').length ?? 0} actieve groepen`}
            icon={GraduationCap}
            iconColor="text-amber-600"
          />
          <StatCard
            title="Slagingspercentage"
            value={stats.slagingspercentage !== null ? `${stats.slagingspercentage}%` : '—'}
            description={stats.slagingspercentage !== null ? 'Van afgeronde trainingen' : 'Nog geen resultaten'}
            icon={TrendingUp}
            iconColor="text-green-600"
          />
          <StatCard
            title="Uitval"
            value={stats.uitgevallen}
            description={stats.totaal > 0 ? `${Math.round((stats.uitgevallen / stats.totaal) * 100)}% van totaal` : 'Geen data'}
            icon={UserX}
            iconColor="text-red-600"
          />
        </div>
      )}

      {/* Intake Agenda */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              Intake Agenda
            </CardTitle>
            <CardDescription>
              {totalIntakesDezWeek} intake{totalIntakesDezWeek !== 1 ? 's' : ''} deze week
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((w) => w - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
              Vandaag
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((w) => w + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {weekDates.map((date) => {
              const iso = formatDateISO(date);
              const afspraken = intakeAfspraken.get(iso) ?? [];
              const isToday = iso === formatDateISO(new Date());
              return (
                <div
                  key={iso}
                  className={`rounded-lg border p-3 min-h-[120px] ${isToday ? 'border-blue-400 bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium uppercase ${isToday ? 'text-blue-700' : 'text-muted-foreground'}`}>
                      {date.toLocaleDateString('nl-NL', { weekday: 'short' })}
                    </span>
                    <span className={`text-sm font-bold ${isToday ? 'text-blue-700' : ''}`}>
                      {date.getDate()}
                    </span>
                  </div>
                  {afspraken.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50 text-center mt-4">—</p>
                  ) : (
                    <div className="space-y-1.5">
                      {afspraken.map((k) => (
                        <Link
                          key={k.id}
                          to={`/kandidaten/${k.id}`}
                          className="block rounded bg-white border px-2 py-1.5 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-blue-500 shrink-0" />
                            <span className="text-xs font-semibold text-blue-700">{k.intake_tijd}</span>
                          </div>
                          <p className="text-xs font-medium truncate mt-0.5">
                            {k.voornaam} {k.achternaam}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                  {afspraken.length > 0 && (
                    <Badge variant="secondary" className="mt-2 text-[10px] w-full justify-center">
                      {afspraken.length} intake{afspraken.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kandidaten per trajectfase</CardTitle>
          </CardHeader>
          <CardContent>
            {voortgangData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={voortgangData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="aantal" radius={[4, 4, 0, 0]}>
                    {voortgangData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
                Nog geen data
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultaten Verdeling</CardTitle>
            <CardDescription>Resultaat van alle trainingsdeelnames</CardDescription>
          </CardHeader>
          <CardContent>
            {resultaatData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={resultaatData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {resultaatData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
                Nog geen resultaten
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Instroom per Maand</CardTitle>
            <CardDescription>Nieuwe aanmeldingen per maand</CardDescription>
          </CardHeader>
          <CardContent>
            {instroomData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={instroomData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="maand" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="aantal" fill="#FFD62D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
                Nog geen data
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trainingsgroepen</CardTitle>
            <CardDescription>Status van alle groepen</CardDescription>
          </CardHeader>
          <CardContent>
            {groepen?.length ? (
              <div className="space-y-3">
                {groepen.map((g) => (
                  <div key={g.id} className="flex items-center gap-3">
                    <span className="font-mono text-sm w-24 shrink-0">{g.groepscode ?? '—'}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      g.status === 'actief' ? 'bg-green-100 text-green-700' :
                      g.status === 'gepland' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {g.status}
                    </span>
                    {g.max_deelnemers && <span className="text-xs text-muted-foreground">max {g.max_deelnemers}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
                Nog geen groepen
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
