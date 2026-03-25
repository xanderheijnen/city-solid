import { useState, useMemo } from 'react';
import {
  BarChart3,
  ArrowRight,
  GraduationCap,
  UserX,
  Scale,
  Wallet,
  CalendarDays,
  Users,
  BarChart2,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Layers,
  Circle,
  Maximize2,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ActiviteitFilter } from '@/components/rapportage/ActiviteitFilter';
import {
  useRapportageDeelnemers,
  useUitstroomRubrieken,
  computeDashboardStats,
} from '@/hooks/useRapportageData';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

type ChartType = 'bar' | 'stacked' | 'pie' | 'donut' | 'line';

interface ChartConfig {
  title: string;
  dataKey: 'leeftijdData' | 'geslachtData' | 'uitkeringData' | 'opleidingData' | 'organisatieData' | 'sectorData';
}

const CHART_CONFIGS: ChartConfig[] = [
  { title: 'Leeftijdsverdeling', dataKey: 'leeftijdData' },
  { title: 'Geslacht', dataKey: 'geslachtData' },
  { title: 'Uitkering', dataKey: 'uitkeringData' },
  { title: 'Opleidingsniveau', dataKey: 'opleidingData' },
  { title: 'Aanmeldorganisatie', dataKey: 'organisatieData' },
  { title: 'Wenssector', dataKey: 'sectorData' },
];

function SwitchableChart({
  data,
  chartType,
  height = 250,
  fontSize = 12,
  outerRadius = 90,
  innerRadius,
}: {
  data: { name: string; value: number }[];
  chartType: ChartType;
  height?: number;
  fontSize?: number;
  outerRadius?: number;
  innerRadius?: number;
}) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>Geen data</div>;
  }

  const donutInner = innerRadius ?? (chartType === 'donut' ? Math.round(outerRadius * 0.55) : 0);

  if (chartType === 'pie' || chartType === 'donut') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={donutInner}
            outerRadius={outerRadius}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke={COLORS[1]} strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // bar or stacked
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <XAxis dataKey="name" tick={{ fontSize }} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="value" fill={COLORS[0]} radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function RapportageDashboard() {
  const [activiteit, setActiviteit] = useState<string | undefined>(undefined);
  const [chartTypes, setChartTypes] = useState<Record<string, ChartType>>({});
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const { data: deelnemers = [], isLoading: loadingD } = useRapportageDeelnemers(activiteit);
  const { data: rubrieken = [], isLoading: loadingR } = useUitstroomRubrieken();

  const stats = useMemo(
    () => computeDashboardStats(deelnemers, rubrieken),
    [deelnemers, rubrieken],
  );

  const isLoading = loadingD || loadingR;

  const setChartType = (key: string, type: ChartType) => {
    setChartTypes((prev) => ({ ...prev, [key]: type }));
  };

  const chartTypeButtons: { type: ChartType; icon: typeof BarChart2; label: string }[] = [
    { type: 'bar', icon: BarChart2, label: 'Staafgrafiek' },
    { type: 'stacked', icon: Layers, label: 'Gestapeld' },
    { type: 'pie', icon: PieChartIcon, label: 'Taartgrafiek' },
    { type: 'donut', icon: Circle, label: 'Donut' },
    { type: 'line', icon: LineChartIcon, label: 'Lijngrafiek' },
  ];

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BarChart3 className="h-6 w-6" />
            Rapportage Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {deelnemers.length} deelnemer{deelnemers.length !== 1 ? 's' : ''} in overzicht
          </p>
        </div>
        <ActiviteitFilter value={activiteit} onChange={setActiviteit} />
      </div>

      {/* Pipeline section (US-06) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-stretch gap-2">
            {/* Instroom */}
            <div className="flex-1 rounded-lg border-2 border-primary p-4 text-center">
              <div className="text-sm font-medium text-muted-foreground">Instroom</div>
              <div className="mt-1 text-3xl font-bold">{stats.pipeline.instroom}</div>
            </div>

            <div className="flex items-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Gestarte trajecten */}
            <div className="flex-1 rounded-lg border-2 border-blue-500 p-4 text-center">
              <div className="text-sm font-medium text-muted-foreground">Gestarte trajecten</div>
              <div className="mt-1 text-3xl font-bold">{stats.pipeline.gestart}</div>
            </div>

            <div className="flex items-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* In Proces */}
            <div className="flex-1 rounded-lg border-l-4 border-amber-500 bg-card p-4">
              <div className="text-sm font-medium text-muted-foreground">In Proces</div>
              <div className="mt-1 text-3xl font-bold">{stats.pipeline.inProces}</div>
              {stats.pipeline.instroom > 0 && (
                <div className="mt-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{
                        width: `${Math.round((stats.pipeline.inProces / stats.pipeline.instroom) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {Math.round((stats.pipeline.inProces / stats.pipeline.instroom) * 100)}% van instroom
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Uitstroom */}
            <div className="flex-1 rounded-lg border-l-4 border-green-500 bg-card p-4">
              <div className="text-sm font-medium text-muted-foreground">Uitstroom</div>
              <div className="mt-1 text-3xl font-bold">{stats.pipeline.uitstroom}</div>
              {stats.pipeline.instroom > 0 && (
                <div className="mt-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{
                        width: `${Math.round((stats.pipeline.uitstroom / stats.pipeline.instroom) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {Math.round((stats.pipeline.uitstroom / stats.pipeline.instroom) * 100)}% van instroom
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top 6 gebieden (US-07) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top 6 gebieden</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {stats.charts.gebiedData.slice(0, 6).map((g, i) => (
              <div key={g.name} className="flex flex-col items-center">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: g.name, value: g.value },
                        { name: 'Rest', value: Math.max(0, deelnemers.length - g.value) },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      <Cell fill={COLORS[i % COLORS.length]} />
                      <Cell fill="#e5e7eb" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <span className="mt-1 text-center text-xs font-medium">{g.name}</span>
                <span className="text-sm font-bold">{g.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 6 stat cards (US-08) */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Meest voorkomende opleiding</p>
              <p className="text-lg font-bold">{stats.stats.meestVoorkomendeOpleiding}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <UserX className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">Niet ingeschreven / geen BRP</p>
              <p className="text-lg font-bold">{stats.stats.geenBrpPct}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Scale className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">Justitie</p>
              <p className="text-lg font-bold">{stats.stats.justitiePct}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Wallet className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Heeft uitkering</p>
              <p className="text-lg font-bold">{stats.stats.uitkeringPct}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CalendarDays className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Gemiddelde leeftijd</p>
              <p className="text-lg font-bold">{stats.stats.gemLeeftijd} jaar</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-xs text-muted-foreground">Man / Vrouw verdeling</p>
              <p className="text-lg font-bold">{stats.stats.geslachtVerdeling}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 6 switchable charts (US-09) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CHART_CONFIGS.map((cfg) => {
          const currentType = chartTypes[cfg.dataKey] ?? 'bar';
          const data = stats.charts[cfg.dataKey];

          return (
            <Card key={cfg.dataKey}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{cfg.title}</CardTitle>
                <div className="flex items-center gap-1">
                  {chartTypeButtons.map((btn) => {
                    const Icon = btn.icon;
                    return (
                      <button
                        key={btn.type}
                        onClick={() => setChartType(cfg.dataKey, btn.type)}
                        title={btn.label}
                        className={`rounded p-1.5 transition-colors ${
                          currentType === btn.type
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setExpandedChart(cfg.dataKey)}
                    title="Vergroten"
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted transition-colors ml-1"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <SwitchableChart data={data} chartType={currentType} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Expanded chart dialog */}
      <Dialog open={!!expandedChart} onOpenChange={() => setExpandedChart(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          {expandedChart && (() => {
            const cfg = CHART_CONFIGS.find((c) => c.dataKey === expandedChart);
            if (!cfg) return null;
            const currentType = chartTypes[cfg.dataKey] ?? 'bar';
            const data = stats.charts[cfg.dataKey];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>{cfg.title}</span>
                    <div className="flex items-center gap-1">
                      {chartTypeButtons.map((btn) => {
                        const Icon = btn.icon;
                        return (
                          <button
                            key={btn.type}
                            onClick={() => setChartType(cfg.dataKey, btn.type)}
                            title={btn.label}
                            className={`rounded p-1.5 transition-colors ${
                              currentType === btn.type
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </button>
                        );
                      })}
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <SwitchableChart
                    data={data}
                    chartType={currentType}
                    height={500}
                    fontSize={14}
                    outerRadius={180}
                  />
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
