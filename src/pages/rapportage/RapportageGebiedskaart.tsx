import { useMemo, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { ActiviteitFilter } from '@/components/rapportage/ActiviteitFilter';
import {
  useRapportageDeelnemers,
  useUitstroomRubrieken,
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

interface GebiedStats {
  naam: string;
  deelnemers: number;
  certificaten: number;
  aanHetWerk: number;
  opSchool: number;
}

// ---------------------------------------------------------------------------
// SVG map data — CBS Gebiedsindelingen 2024 via PDOK
// ---------------------------------------------------------------------------

interface GebiedSvg {
  naam: string;
  path: string;
  labelX: number;
  labelY: number;
}

const GEBIED_SVG_DATA: GebiedSvg[] = [
  {
    naam: 'Centrum',
    path: 'M635.4,200.0 L636.3,202.0 L639.1,208.0 L639.7,212.6 L631.2,216.6 L620.0,228.9 L619.2,230.8 L611.1,241.9 L603.2,247.5 L594.6,251.4 L589.7,237.4 L588.3,234.0 L581.8,232.7 L581.3,230.6 L589.2,225.7 L588.5,202.4 L587.6,200.4 L577.7,201.5 L577.7,200.9 L577.7,198.5 L588.6,197.4 L600.0,194.3 L606.7,194.1 L607.1,194.1 L612.5,195.1 L619.2,196.9 L635.4,200.0 Z',
    labelX: 608, labelY: 218,
  },
  {
    naam: 'Delfshaven',
    path: 'M587.6,200.4 L588.5,202.4 L589.2,225.7 L581.3,230.6 L581.8,232.7 L588.3,234.0 L589.7,237.4 L594.6,251.4 L583.5,253.7 L571.0,252.7 L550.5,247.2 L551.4,243.3 L557.9,238.9 L543.6,222.6 L520.7,220.3 L520.8,218.9 L523.1,219.1 L523.8,215.9 L523.9,215.9 L524.7,212.3 L525.8,207.1 L525.8,206.0 L552.4,203.0 L553.4,202.8 L553.8,202.8 L559.0,202.1 L577.7,200.9 L577.7,201.5 L587.6,200.4 Z',
    labelX: 558, labelY: 225,
  },
  {
    naam: 'Overschie',
    path: 'M543.7,83.4 L567.5,112.7 L573.4,105.9 L581.5,102.9 L586.5,109.3 L588.0,113.7 L587.8,125.7 L585.2,137.5 L585.0,148.1 L585.7,164.3 L577.6,167.0 L572.5,173.5 L565.3,176.8 L565.7,177.2 L546.8,193.8 L532.5,175.8 L527.2,168.4 L523.1,168.4 L525.4,166.7 L527.2,166.0 L524.2,160.9 L523.5,150.6 L519.8,144.1 L514.2,147.6 L509.4,148.7 L496.2,147.9 L496.6,146.9 L495.5,146.5 L489.0,150.0 L488.7,149.6 L488.0,149.9 L481.5,129.5 L475.4,110.1 L489.8,106.5 L490.0,107.7 L492.4,107.0 L495.4,112.1 L507.8,104.1 L514.7,100.0 L542.2,82.1 L543.7,83.4 Z',
    labelX: 532, labelY: 137,
  },
  {
    naam: 'Noord',
    path: 'M622.1,161.0 L620.4,166.9 L625.9,175.5 L622.4,179.7 L620.4,185.7 L618.6,192.9 L619.2,196.9 L612.5,195.1 L607.1,194.1 L606.7,194.1 L600.0,194.3 L588.6,197.4 L577.7,198.5 L577.7,200.9 L559.0,202.1 L553.8,202.8 L553.4,202.8 L546.8,193.8 L565.7,177.2 L565.3,176.8 L572.5,173.5 L577.6,167.0 L585.7,164.3 L586.3,164.5 L595.4,162.6 L613.1,159.0 L620.7,157.3 L622.1,161.0 Z',
    labelX: 588, labelY: 182,
  },
  {
    naam: 'Hillegersberg-Schiebroek',
    path: 'M600.7,75.5 L617.9,89.9 L628.4,98.5 L634.1,103.3 L635.0,93.5 L636.4,94.7 L649.6,105.8 L648.6,107.4 L657.2,114.6 L658.4,113.5 L659.5,114.2 L665.8,119.5 L669.2,112.6 L672.9,111.5 L679.0,138.1 L677.4,141.8 L679.2,144.8 L675.9,145.8 L620.6,157.1 L620.7,157.3 L613.1,159.0 L595.4,162.6 L586.3,164.5 L585.7,164.3 L585.0,148.1 L585.2,137.5 L587.8,125.7 L588.0,113.7 L586.5,109.3 L581.5,102.9 L586.4,99.0 L586.2,93.4 L589.1,91.1 L587.9,86.3 L588.4,85.7 L591.7,81.2 L590.6,80.4 L591.8,78.6 L594.1,77.3 L595.3,78.3 L599.2,74.6 L598.4,73.9 L598.5,73.8 L598.6,73.8 L599.3,74.3 L600.7,75.5 Z',
    labelX: 628, labelY: 122,
  },
  {
    naam: 'Kralingen-Crooswijk',
    path: 'M686.0,208.6 L685.8,219.0 L686.4,218.5 L688.1,226.0 L697.1,245.0 L675.6,253.2 L667.9,251.1 L662.4,245.8 L661.3,240.9 L661.7,230.1 L656.3,220.3 L649.6,215.6 L639.7,212.6 L639.1,208.0 L636.3,202.0 L635.4,200.0 L619.2,196.9 L618.6,192.9 L620.4,185.7 L622.4,179.7 L625.9,175.5 L620.4,166.9 L622.1,161.0 L620.7,157.3 L620.6,157.1 L675.9,145.8 L679.2,144.8 L679.4,145.0 L687.6,170.3 L691.6,191.6 L690.7,191.8 L689.2,193.8 L686.0,208.6 Z',
    labelX: 655, labelY: 194,
  },
  {
    naam: 'Feijenoord',
    path: 'M656.6,249.1 L668.1,270.3 L668.5,271.2 L673.7,282.3 L669.3,284.4 L667.8,290.9 L660.3,292.0 L652.9,296.3 L646.4,302.5 L633.5,289.4 L628.0,286.3 L628.3,278.2 L630.4,275.6 L630.4,275.0 L630.2,265.2 L632.5,257.8 L631.9,256.8 L628.4,254.4 L606.6,261.6 L596.0,254.8 L594.6,251.4 L603.2,247.5 L611.1,241.9 L619.2,230.8 L620.0,228.9 L631.2,216.6 L639.7,212.6 L649.6,215.6 L656.3,220.3 L661.7,230.1 L661.3,240.9 L662.4,245.8 L656.6,249.1 Z',
    labelX: 638, labelY: 262,
  },
  {
    naam: 'IJsselmonde',
    path: 'M742.8,251.1 L743.0,255.3 L742.3,258.2 L742.1,258.1 L739.2,271.4 L739.2,272.4 L738.8,273.3 L732.7,301.8 L733.0,302.1 L732.7,302.4 L731.0,302.1 L722.5,301.9 L717.5,304.7 L713.3,307.7 L709.3,309.6 L705.6,310.6 L705.8,311.0 L704.1,311.4 L698.3,315.7 L697.5,316.9 L696.9,317.3 L696.4,318.0 L692.8,319.4 L687.9,320.2 L686.3,321.2 L681.9,322.4 L678.4,321.9 L674.8,320.9 L673.6,320.2 L669.0,321.5 L658.8,321.5 L657.9,315.6 L653.8,308.7 L646.4,302.5 L652.9,296.3 L660.3,292.0 L667.8,290.9 L669.3,284.4 L673.7,282.3 L668.5,271.2 L668.1,270.3 L656.6,249.1 L662.4,245.8 L667.9,251.1 L675.6,253.2 L697.1,245.0 L706.4,242.7 L714.4,241.1 L734.1,244.2 L743.4,247.2 L742.8,251.1 Z',
    labelX: 698, labelY: 289,
  },
  {
    naam: 'Pernis',
    path: 'M480.9,261.7 L489.2,263.5 L499.7,269.3 L498.4,269.4 L496.3,276.0 L498.6,280.6 L496.5,285.2 L495.1,287.5 L486.4,293.5 L485.7,298.3 L481.7,298.6 L474.8,280.8 L471.5,265.9 L479.4,266.7 L480.9,261.7 Z',
    labelX: 487, labelY: 280,
  },
  {
    naam: 'Prins Alexander',
    path: 'M769.2,84.1 L769.1,85.7 L769.6,87.1 L780.0,94.5 L764.7,103.0 L763.8,102.2 L755.5,109.2 L755.2,109.0 L750.5,112.8 L743.3,118.2 L736.9,122.9 L733.4,125.1 L733.3,124.9 L731.7,125.6 L728.5,121.0 L725.3,123.3 L726.4,127.8 L724.6,128.2 L725.7,132.5 L727.8,141.2 L728.6,142.2 L732.4,147.6 L739.6,157.6 L736.4,159.9 L732.4,160.8 L722.8,163.1 L725.5,173.8 L725.6,174.2 L727.6,182.0 L727.8,183.0 L729.0,187.7 L728.2,188.3 L728.8,189.1 L728.8,189.7 L730.2,196.4 L729.9,196.7 L729.4,197.2 L729.5,198.2 L727.8,201.4 L725.9,203.2 L723.5,204.6 L723.6,205.2 L722.8,205.7 L718.4,208.5 L717.3,209.5 L716.5,208.6 L710.6,210.5 L701.2,210.7 L690.7,209.5 L691.1,210.5 L688.4,207.7 L687.5,212.3 L688.7,218.3 L691.6,219.3 L691.6,220.3 L690.5,220.8 L690.1,222.2 L691.6,227.0 L692.8,227.4 L693.9,233.2 L696.1,238.2 L696.7,239.6 L698.4,239.6 L702.2,238.9 L703.7,238.1 L705.7,230.4 L707.8,221.7 L708.1,220.6 L713.2,216.8 L713.5,217.0 L713.2,220.8 L716.6,220.8 L716.8,226.8 L716.9,230.6 L715.2,230.2 L709.0,232.2 L708.8,232.9 L709.1,233.5 L708.4,233.9 L707.3,238.6 L706.4,242.7 L697.1,245.0 L688.1,226.0 L686.4,218.5 L685.8,219.0 L686.0,208.6 L689.2,193.8 L690.7,191.8 L691.6,191.6 L687.6,170.3 L679.4,145.0 L679.2,144.8 L677.4,141.8 L679.0,138.1 L672.9,111.5 L678.6,107.7 L679.9,104.7 L688.5,102.1 L689.6,97.2 L695.3,98.6 L703.2,93.3 L706.0,92.2 L714.8,100.9 L717.8,101.1 L718.0,102.0 L723.5,99.5 L724.7,98.0 L724.3,97.5 L725.0,97.0 L724.9,96.8 L724.4,96.0 L726.1,94.4 L726.8,95.3 L727.4,94.8 L730.2,95.9 L732.3,96.1 L736.9,94.3 L738.4,94.5 L739.1,94.7 L742.5,92.5 L742.1,92.0 L748.3,86.6 L748.9,86.1 L748.2,85.2 L747.4,85.9 L746.8,85.1 L742.4,88.9 L741.4,88.7 L737.0,78.8 L748.9,74.3 L746.8,62.6 L750.1,60.7 L748.8,57.8 L750.2,57.2 L749.2,54.9 L770.4,45.4 L776.2,59.4 L769.6,82.2 L770.0,83.4 L769.2,84.1 Z',
    labelX: 725, labelY: 155,
  },
  {
    naam: 'Charlois',
    path: 'M606.6,261.6 L628.4,254.4 L631.9,256.8 L632.5,257.8 L630.2,265.2 L630.4,275.0 L630.4,275.6 L628.3,278.2 L628.0,286.3 L633.5,289.4 L646.4,302.5 L653.8,308.7 L657.9,315.6 L658.8,321.5 L658.8,321.5 L633.1,321.3 L630.3,321.3 L622.5,324.8 L620.3,325.2 L618.3,326.5 L615.3,327.9 L612.8,328.9 L612.5,328.9 L611.4,329.3 L610.5,329.3 L610.9,335.8 L599.2,337.1 L590.1,336.2 L564.5,327.0 L558.6,326.4 L557.0,327.2 L555.9,326.0 L577.0,314.7 L574.1,312.1 L575.0,300.5 L580.5,285.6 L588.5,265.2 L587.3,263.6 L583.2,262.4 L583.5,253.7 L594.6,251.4 L596.0,254.8 L606.6,261.6 Z M537.3,282.4 L529.0,279.9 L528.9,272.8 L522.9,270.2 L529.5,266.8 L529.3,259.2 L534.4,258.0 L532.7,259.3 L533.2,263.1 L537.0,270.7 L535.0,275.4 L537.3,282.4 Z',
    labelX: 610, labelY: 298,
  },
  {
    naam: 'Hoogvliet',
    path: 'M481.1,300.7 L482.6,309.6 L482.1,319.2 L484.4,321.0 L482.1,325.1 L479.3,335.8 L479.2,336.5 L479.1,336.5 L479.1,336.5 L477.9,345.0 L479.9,349.1 L480.0,353.1 L479.7,353.4 L479.9,353.8 L477.3,356.0 L477.6,378.8 L461.8,375.9 L446.4,368.8 L436.6,362.9 L426.7,353.3 L420.3,344.8 L417.9,339.7 L417.8,339.5 L412.3,328.7 L405.8,312.1 L430.7,304.8 L440.6,303.2 L458.4,302.3 L470.8,305.0 L481.1,300.7 Z',
    labelX: 448, labelY: 340,
  },
  {
    naam: 'Hoek van Holland',
    path: 'M163.9,51.7 L161.0,57.2 L162.4,57.9 L158.6,65.4 L169.5,69.5 L169.1,73.4 L188.9,82.3 L197.4,87.5 L213.1,98.6 L211.8,100.6 L213.6,101.7 L217.3,100.5 L218.1,101.7 L215.6,103.2 L211.9,107.7 L219.3,125.3 L253.7,155.0 L256.0,155.6 L246.4,172.4 L217.3,154.2 L193.0,136.6 L153.0,103.0 L138.8,91.0 L125.5,81.9 L101.0,69.9 L69.9,57.7 L20.0,39.6 L22.2,34.3 L22.0,33.5 L22.7,33.3 L23.5,34.5 L85.0,56.1 L90.0,56.1 L108.2,41.0 L129.3,20.0 L139.1,27.0 L136.9,30.0 L138.8,33.9 L143.0,40.0 L147.2,42.4 L163.9,51.7 Z',
    labelX: 148, labelY: 82,
  },
  {
    naam: 'Rozenburg',
    path: 'M318.6,235.2 L313.9,250.0 L310.5,255.7 L276.7,244.8 L269.6,239.7 L266.5,240.2 L263.7,223.2 L259.8,211.9 L257.1,206.9 L254.7,197.2 L211.5,161.2 L217.3,154.2 L246.4,172.4 L256.2,179.8 L260.2,183.6 L268.9,195.9 L272.6,201.7 L278.3,209.3 L288.8,217.4 L304.1,225.5 L318.6,235.2 Z',
    labelX: 268, labelY: 215,
  },
];

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
// Color scale for choropleth
// ---------------------------------------------------------------------------
function getAreaFill(count: number, maxCount: number, isSelected: boolean, isHovered: boolean): string {
  if (count === 0) {
    if (isSelected) return '#242C4C';
    if (isHovered) return '#e2e8f0';
    return '#f1f5f9';
  }
  const ratio = Math.min(count / Math.max(maxCount, 1), 1);
  // Gradient from light amber to deep amber/orange
  if (isSelected) return '#242C4C';
  const r = Math.round(255 - ratio * 60);
  const g = Math.round(237 - ratio * 120);
  const b = Math.round(160 - ratio * 130);
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------------------
// Interactive SVG Map component
// ---------------------------------------------------------------------------
interface RotterdamMapProps {
  gebiedStats: GebiedStats[];
  maxCount: number;
  selectedGebied: string | null;
  onSelectGebied: (naam: string | null) => void;
}

function RotterdamMap({ gebiedStats, maxCount, selectedGebied, onSelectGebied }: RotterdamMapProps) {
  const [hoveredGebied, setHoveredGebied] = useState<string | null>(null);

  const statsMap = useMemo(() => {
    const m = new Map<string, GebiedStats>();
    for (const g of gebiedStats) m.set(g.naam, g);
    return m;
  }, [gebiedStats]);

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 800 400"
        className="w-full h-auto"
        style={{ maxHeight: '520px' }}
      >
        {/* Background */}
        <rect x="0" y="0" width="800" height="400" fill="#f8fafc" rx="8" />

        {/* Area paths */}
        {GEBIED_SVG_DATA.map((gebied) => {
          const stats = statsMap.get(gebied.naam);
          const count = stats?.deelnemers ?? 0;
          const isSelected = selectedGebied === gebied.naam;
          const isHovered = hoveredGebied === gebied.naam;

          return (
            <g key={gebied.naam}>
              <path
                d={gebied.path}
                fill={getAreaFill(count, maxCount, isSelected, isHovered)}
                stroke={isSelected ? '#242C4C' : isHovered ? '#64748b' : '#cbd5e1'}
                strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                className="cursor-pointer transition-all duration-150"
                onClick={() => onSelectGebied(selectedGebied === gebied.naam ? null : gebied.naam)}
                onMouseEnter={() => setHoveredGebied(gebied.naam)}
                onMouseLeave={() => setHoveredGebied(null)}
              />
              {/* Count badge */}
              {count > 0 && (
                <g
                  className="pointer-events-none"
                  transform={`translate(${gebied.labelX},${gebied.labelY})`}
                >
                  <circle
                    r={Math.max(12, 10 + count * 1.5)}
                    fill={isSelected ? '#f59e0b' : '#242C4C'}
                    opacity={0.9}
                  />
                  <text
                    textAnchor="middle"
                    dy="0.35em"
                    fill="white"
                    fontSize={count >= 100 ? 9 : 11}
                    fontWeight="bold"
                    fontFamily="system-ui, sans-serif"
                  >
                    {count}
                  </text>
                </g>
              )}
              {/* Area name label */}
              <text
                x={gebied.labelX}
                y={gebied.labelY + (count > 0 ? Math.max(12, 10 + count * 1.5) + 12 : 0)}
                textAnchor="middle"
                fill={isSelected ? '#242C4C' : '#475569'}
                fontSize={7}
                fontWeight={isSelected || isHovered ? 'bold' : 'normal'}
                fontFamily="system-ui, sans-serif"
                className="pointer-events-none"
              >
                {gebied.naam}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredGebied && !selectedGebied && (
        <div className="absolute top-2 right-2 bg-white border rounded-lg shadow-lg px-3 py-2 text-sm pointer-events-none">
          <p className="font-semibold">{hoveredGebied}</p>
          <p className="text-muted-foreground">
            {statsMap.get(hoveredGebied)?.deelnemers ?? 0} deelnemers
          </p>
        </div>
      )}
    </div>
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

  const ranking = useMemo(
    () => [...gebiedStats].sort((a, b) => b.deelnemers - a.deelnemers),
    [gebiedStats],
  );

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
        {/* Left: SVG Map (2/3) */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-2">
              <RotterdamMap
                gebiedStats={gebiedStats}
                maxCount={maxCount}
                selectedGebied={selectedGebied}
                onSelectGebied={setSelectedGebied}
              />
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded-sm bg-[#f1f5f9] border" />
              <span>0 deelnemers</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: 'rgb(235,197,95)' }} />
              <span>Weinig</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: 'rgb(195,117,30)' }} />
              <span>Veel</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#242C4C]" />
              <span>Aantal (in cirkel)</span>
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
                  Klik op een gebied in de kaart om details te bekijken
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
