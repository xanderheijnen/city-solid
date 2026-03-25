import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Download, Loader2, Upload, ArrowUpAZ, ArrowDownZA,
  ArrowUp01, ArrowDown10, ChevronsUpDown, X, CheckCircle2, Circle,
  LayoutGrid, TableProperties, Settings2, GripVertical, Eye, EyeOff,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { StatusBadge } from '@/components/StatusBadge';
import { PermissionGate } from '@/components/PermissionGate';
import { KandidaatUploadDialog } from '@/components/KandidaatUploadDialog';
import { useKandidaten } from '@/hooks/useKandidaten';
import { GESLACHT_LABELS } from '@/lib/constants';
import type { Kandidaat, Geslacht } from '@/lib/types';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETENESS CHECK DEFINITIONS — easily extendable
// ═══════════════════════════════════════════════════════════════════════════

interface CompletenessField {
  key: string;
  label: string;
  category: string;
  check: (k: Kandidaat) => boolean;
}

const COMPLETENESS_FIELDS: CompletenessField[] = [
  // Persoonlijk
  { key: 'voornaam', label: 'Voornaam', category: 'Persoonlijk', check: (k) => !!k.voornaam },
  { key: 'achternaam', label: 'Achternaam', category: 'Persoonlijk', check: (k) => !!k.achternaam },
  { key: 'geslacht', label: 'Geslacht', category: 'Persoonlijk', check: (k) => !!k.geslacht && k.geslacht !== 'onbekend' },
  { key: 'geboortedatum', label: 'Geboortedatum', category: 'Persoonlijk', check: (k) => !!k.geboortedatum },
  { key: 'nationaliteit', label: 'Nationaliteit', category: 'Persoonlijk', check: (k) => !!k.nationaliteit },
  { key: 'bsn', label: 'BSN', category: 'Persoonlijk', check: (k) => !!k.bsn },
  // Contact
  { key: 'telefoon', label: 'Telefoon', category: 'Contact', check: (k) => !!k.telefoon },
  { key: 'email', label: 'E-mail', category: 'Contact', check: (k) => !!k.email },
  // Adres
  { key: 'straat', label: 'Straat', category: 'Adres', check: (k) => !!k.straat },
  { key: 'postcode', label: 'Postcode', category: 'Adres', check: (k) => !!k.postcode },
  { key: 'woonplaats', label: 'Woonplaats', category: 'Adres', check: (k) => !!k.woonplaats },
  { key: 'wijk', label: 'Wijk', category: 'Adres', check: (k) => !!k.wijk },
  // Intake
  { key: 'motivatie', label: 'Motivatie', category: 'Intake', check: (k) => !!k.motivatie },
  { key: 'gewenste_sector', label: 'Gewenste sector', category: 'Intake', check: (k) => !!k.gewenste_sector?.length },
  { key: 'opleiding', label: 'Opleiding', category: 'Intake', check: (k) => !!k.opleiding },
  { key: 'werkervaring', label: 'Werkervaring', category: 'Intake', check: (k) => !!k.werkervaring },
  // Documenten
  { key: 'foto_url', label: 'Foto', category: 'Documenten', check: (k) => !!k.foto_url },
  { key: 'id_scan_url', label: 'ID Scan', category: 'Documenten', check: (k) => !!k.id_scan_url },
  { key: 'cv_url', label: 'CV', category: 'Documenten', check: (k) => !!k.cv_url },
];

const CATEGORIES = [...new Set(COMPLETENESS_FIELDS.map((f) => f.category))];

function getCompleteness(k: Kandidaat) {
  const total = COMPLETENESS_FIELDS.length;
  const filled = COMPLETENESS_FIELDS.filter((f) => f.check(k)).length;
  return { filled, total, pct: Math.round((filled / total) * 100) };
}

function getCompletenessColor(pct: number) {
  if (pct >= 90) return 'bg-emerald-500';
  if (pct >= 70) return 'bg-lime-500';
  if (pct >= 50) return 'bg-amber-400';
  if (pct >= 30) return 'bg-orange-500';
  return 'bg-red-500';
}

function getCompletenessTextColor(pct: number) {
  if (pct >= 90) return 'text-emerald-600';
  if (pct >= 70) return 'text-lime-600';
  if (pct >= 50) return 'text-amber-600';
  if (pct >= 30) return 'text-orange-600';
  return 'text-red-600';
}

// ═══════════════════════════════════════════════════════════════════════════
// SORT DEFINITIONS — shared for both views
// ═══════════════════════════════════════════════════════════════════════════

interface ColumnDef {
  key: string;
  label: string;
  sortType: 'text' | 'number' | 'date' | 'boolean';
  getValue: (k: Kandidaat) => string | number | boolean | null | undefined;
  render: (k: Kandidaat) => React.ReactNode;
  width?: string;
}

const TABLE_COLUMNS: ColumnDef[] = [
  {
    key: 'display_id', label: 'ID', sortType: 'text', width: 'w-20',
    getValue: (k) => k.display_id,
    render: (k) => (
      <Link to={`/kandidaten/${k.id}`} className="text-primary hover:underline font-mono text-sm">
        {k.display_id}
      </Link>
    ),
  },
  { key: 'voornaam', label: 'Voornaam', sortType: 'text', getValue: (k) => k.voornaam, render: (k) => k.voornaam },
  { key: 'achternaam', label: 'Achternaam', sortType: 'text', getValue: (k) => k.achternaam, render: (k) => k.achternaam },
  { key: 'traject_status', label: 'Status', sortType: 'text', getValue: (k) => k.traject_status, render: (k) => <StatusBadge status={k.traject_status} /> },
  { key: 'geslacht', label: 'Geslacht', sortType: 'text', getValue: (k) => k.geslacht, render: (k) => k.geslacht ? GESLACHT_LABELS[k.geslacht as Geslacht] : '—' },
  { key: 'telefoon', label: 'Telefoon', sortType: 'text', getValue: (k) => k.telefoon, render: (k) => k.telefoon ?? '—' },
  { key: 'email', label: 'Email', sortType: 'text', getValue: (k) => k.email, render: (k) => k.email ?? '—' },
  { key: 'wijk', label: 'Wijk', sortType: 'text', getValue: (k) => k.wijk, render: (k) => k.wijk ?? '—' },
  { key: 'gebied', label: 'Gebied', sortType: 'text', getValue: (k) => k.gebied, render: (k) => k.gebied ?? '—' },
  { key: 'uitkering', label: 'Uitkering', sortType: 'text', getValue: (k) => k.uitkering?.join(', ') ?? null, render: (k) => k.uitkering?.join(', ') ?? '—' },
  { key: 'klantmanager', label: 'Klantmanager', sortType: 'text', getValue: (k) => k.klantmanager, render: (k) => k.klantmanager ?? '—' },
  { key: 'rijbewijs', label: 'Rijbewijs', sortType: 'boolean', getValue: (k) => k.rijbewijs, render: (k) => k.rijbewijs ? 'Ja' : 'Nee' },
  { key: 'aanmeld_datum', label: 'Aanmeld datum', sortType: 'date', getValue: (k) => k.aanmeld_datum, render: (k) => k.aanmeld_datum ?? '—' },
];

type SortDir = 'asc' | 'desc';

function sortKandidaten(data: Kandidaat[], sort: { key: string; dir: SortDir } | null): Kandidaat[] {
  if (!sort) return data;
  const col = TABLE_COLUMNS.find((c) => c.key === sort.key);
  // Also support sorting by completeness
  if (sort.key === 'completeness') {
    return [...data].sort((a, b) => {
      const aPct = getCompleteness(a).pct;
      const bPct = getCompleteness(b).pct;
      return sort.dir === 'desc' ? bPct - aPct : aPct - bPct;
    });
  }
  if (!col) return data;
  return [...data].sort((a, b) => {
    const aVal = col.getValue(a);
    const bVal = col.getValue(b);
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    let cmp = 0;
    if (col.sortType === 'boolean') cmp = (aVal === true ? 1 : 0) - (bVal === true ? 1 : 0);
    else if (col.sortType === 'number') cmp = Number(aVal) - Number(bVal);
    else cmp = String(aVal).localeCompare(String(bVal), 'nl', { sensitivity: 'base' });
    return sort.dir === 'desc' ? -cmp : cmp;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SORTABLE HEADER
// ═══════════════════════════════════════════════════════════════════════════

function SortableHeader({ column, activeSort, onSort, onClear }: {
  column: { key: string; label: string; sortType: string; width?: string };
  activeSort: { key: string; dir: SortDir } | null;
  onSort: (key: string, dir: SortDir) => void;
  onClear: () => void;
}) {
  const isActive = activeSort?.key === column.key;
  const isAsc = isActive && activeSort?.dir === 'asc';
  const isDesc = isActive && activeSort?.dir === 'desc';
  const isText = column.sortType === 'text';

  return (
    <TableHead className={column.width}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={cn(
            'flex items-center gap-1.5 text-xs font-medium -ml-2 px-2 py-1 rounded hover:bg-muted/80 transition-colors w-full text-left',
            isActive && 'text-primary font-semibold',
          )}>
            <span>{column.label}</span>
            {isAsc && (isText ? <ArrowUpAZ className="h-3.5 w-3.5 text-primary" /> : <ArrowUp01 className="h-3.5 w-3.5 text-primary" />)}
            {isDesc && (isText ? <ArrowDownZA className="h-3.5 w-3.5 text-primary" /> : <ArrowDown10 className="h-3.5 w-3.5 text-primary" />)}
            {!isActive && <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={() => onSort(column.key, 'asc')} className={cn(isAsc && 'bg-primary/10 text-primary')}>
            {isText ? <ArrowUpAZ className="mr-2 h-4 w-4" /> : <ArrowUp01 className="mr-2 h-4 w-4" />}
            {isText ? 'A → Z sorteren' : 'Oplopend'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSort(column.key, 'desc')} className={cn(isDesc && 'bg-primary/10 text-primary')}>
            {isText ? <ArrowDownZA className="mr-2 h-4 w-4" /> : <ArrowDown10 className="mr-2 h-4 w-4" />}
            {isText ? 'Z → A sorteren' : 'Aflopend'}
          </DropdownMenuItem>
          {isActive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClear}>
                <X className="mr-2 h-4 w-4" />
                Sortering opheffen
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </TableHead>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MONDAY.COM-STYLE BOARD VIEW
// ═══════════════════════════════════════════════════════════════════════════

function CompletionDot({ filled, label }: { filled: boolean; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center justify-center w-7 h-7">
          {filled ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
          ) : (
            <Circle className="h-4.5 w-4.5 text-gray-300" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}: {filled ? 'Ingevuld ✓' : 'Ontbreekt'}
      </TooltipContent>
    </Tooltip>
  );
}

function BoardView({ kandidaten, sort, onSort, visibleFieldKeys }: {
  kandidaten: Kandidaat[];
  sort: { key: string; dir: SortDir } | null;
  onSort: (key: string, dir: SortDir) => void;
  visibleFieldKeys: string[];
}) {
  const visibleFields = useMemo(
    () => visibleFieldKeys.map((k) => COMPLETENESS_FIELDS.find((f) => f.key === k)!).filter(Boolean),
    [visibleFieldKeys],
  );
  const visibleCategories = useMemo(
    () => [...new Set(visibleFields.map((f) => f.category))],
    [visibleFields],
  );

  const sorted = useMemo(() => {
    if (sort?.key === 'completeness') {
      return [...kandidaten].sort((a, b) => {
        const aPct = getCompleteness(a).pct;
        const bPct = getCompleteness(b).pct;
        return sort.dir === 'desc' ? bPct - aPct : aPct - bPct;
      });
    }
    return sortKandidaten(kandidaten, sort);
  }, [kandidaten, sort]);

  return (
    <ScrollArea className="w-full">
      <div className="min-w-[900px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-48 sticky left-0 bg-muted/30 z-10">Kandidaat</TableHead>
              <TableHead className="w-16 text-center">
                <button
                  className={cn(
                    'text-xs font-medium px-1 py-0.5 rounded hover:bg-muted/80 transition-colors',
                    sort?.key === 'completeness' && 'text-primary font-semibold',
                  )}
                  onClick={() => {
                    if (sort?.key === 'completeness' && sort.dir === 'desc') onSort('completeness', 'asc');
                    else onSort('completeness', 'desc');
                  }}
                >
                  %
                  {sort?.key === 'completeness' && (sort.dir === 'desc' ? ' ↓' : ' ↑')}
                </button>
              </TableHead>
              <TableHead className="w-28 text-center">Volledigheid</TableHead>
              {visibleCategories.map((cat) => {
                const fields = visibleFields.filter((f) => f.category === cat);
                return (
                  <TableHead
                    key={cat}
                    colSpan={fields.length}
                    className="text-center border-l border-border/50"
                  >
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {cat}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
            <TableRow className="bg-muted/10">
              <TableHead className="sticky left-0 bg-muted/10 z-10" />
              <TableHead />
              <TableHead />
              {visibleFields.map((field) => (
                <TableHead key={field.key} className="text-center px-1 border-l border-border/20">
                  <span className="text-[10px] text-muted-foreground leading-tight block">
                    {field.label}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((k) => {
              const { filled, total, pct } = getCompleteness(k);
              return (
                <TableRow key={k.id} className="hover:bg-muted/20">
                  <TableCell className="sticky left-0 bg-background z-10 border-r">
                    <Link to={`/kandidaten/${k.id}`} className="hover:underline">
                      <div className="font-medium text-sm">{k.voornaam} {k.achternaam}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="font-mono">{k.display_id}</span>
                        <StatusBadge status={k.traject_status} />
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn('text-sm font-bold', getCompletenessTextColor(pct))}>
                      {pct}%
                    </span>
                  </TableCell>
                  <TableCell className="px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', getCompletenessColor(pct))}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {filled}/{total}
                      </span>
                    </div>
                  </TableCell>
                  {visibleFields.map((field) => (
                    <TableCell key={field.key} className="text-center px-0 border-l border-border/10">
                      <CompletionDot filled={field.check(k)} label={field.label} />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLE VIEW (original)
// ═══════════════════════════════════════════════════════════════════════════

function TableView({ kandidaten, sort, onSort, clearSort, visibleKeys }: {
  kandidaten: Kandidaat[];
  sort: { key: string; dir: SortDir } | null;
  onSort: (key: string, dir: SortDir) => void;
  clearSort: () => void;
  visibleKeys: string[];
}) {
  const sorted = useMemo(() => sortKandidaten(kandidaten, sort), [kandidaten, sort]);
  const visibleCols = useMemo(
    () => visibleKeys.map((k) => TABLE_COLUMNS.find((c) => c.key === k)!).filter(Boolean),
    [visibleKeys],
  );

  return (
    <ScrollArea className="w-full">
      <div style={{ minWidth: `${Math.max(visibleCols.length * 120, 600)}px` }}>
        <Table>
          <TableHeader>
            <TableRow>
              {visibleCols.map((col) => (
                <SortableHeader
                  key={col.key}
                  column={col}
                  activeSort={sort}
                  onSort={onSort}
                  onClear={clearSort}
                />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((k) => (
              <TableRow key={k.id}>
                {visibleCols.map((col) => (
                  <TableCell key={col.key}>{col.render(k)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COLUMN CHOOSER — pick which columns are visible + reorder via drag
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_TABLE_VISIBLE = TABLE_COLUMNS.map((c) => c.key);
const DEFAULT_BOARD_VISIBLE = COMPLETENESS_FIELDS.map((f) => f.key);

function ColumnChooser({ allItems, visibleKeys, onChange, label }: {
  allItems: { key: string; label: string; category?: string }[];
  visibleKeys: string[];
  onChange: (keys: string[]) => void;
  label: string;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Build ordered list: visible items in order, then hidden items
  const orderedVisible = visibleKeys.map((k) => allItems.find((i) => i.key === k)!).filter(Boolean);
  const hidden = allItems.filter((i) => !visibleKeys.includes(i.key));

  const toggle = (key: string) => {
    if (visibleKeys.includes(key)) {
      onChange(visibleKeys.filter((k) => k !== key));
    } else {
      onChange([...visibleKeys, key]);
    }
  };

  const moveUp = (key: string) => {
    const idx = visibleKeys.indexOf(key);
    if (idx <= 0) return;
    const next = [...visibleKeys];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };

  const moveDown = (key: string) => {
    const idx = visibleKeys.indexOf(key);
    if (idx < 0 || idx >= visibleKeys.length - 1) return;
    const next = [...visibleKeys];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  };

  const reset = () => {
    onChange(allItems.map((i) => i.key));
  };

  const selectAll = () => onChange(allItems.map((i) => i.key));
  const selectNone = () => onChange([]);

  // Group hidden by category if available
  const categories = [...new Set(allItems.map((i) => i.category).filter(Boolean))];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          {label}
          {visibleKeys.length < allItems.length && (
            <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-semibold ml-1">
              {visibleKeys.length}/{allItems.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b">
          <div className="text-sm font-semibold mb-2">Kolommen kiezen</div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={selectAll}>
              Alles aan
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={selectNone}>
              Alles uit
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={reset}>
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-[400px]">
          {/* Visible items - reorderable */}
          {orderedVisible.length > 0 && (
            <div className="p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-1">
                Zichtbaar ({orderedVisible.length})
              </div>
              {orderedVisible.map((item, idx) => (
                <div
                  key={item.key}
                  draggable
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('bg-primary/5');
                  }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('bg-primary/5')}
                  onDrop={(e) => {
                    e.currentTarget.classList.remove('bg-primary/5');
                    if (dragIdx === null || dragIdx === idx) return;
                    const next = [...visibleKeys];
                    const [moved] = next.splice(dragIdx, 1);
                    next.splice(idx, 0, moved);
                    onChange(next);
                    setDragIdx(null);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-grab active:cursor-grabbing group"
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
                  <Checkbox
                    checked={true}
                    onCheckedChange={() => toggle(item.key)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs flex-1">{item.label}</span>
                  {item.category && (
                    <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {item.category}
                    </span>
                  )}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveUp(item.key); }}
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                      disabled={idx === 0}
                    >
                      <ArrowUp01 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveDown(item.key); }}
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                      disabled={idx === orderedVisible.length - 1}
                    >
                      <ArrowDown10 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hidden items */}
          {hidden.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-1">
                Verborgen ({hidden.length})
              </div>
              {hidden.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer opacity-60 hover:opacity-100"
                  onClick={() => toggle(item.key)}
                >
                  <div className="w-3.5" />
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => toggle(item.key)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs flex-1">{item.label}</span>
                  {item.category && (
                    <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {item.category}
                    </span>
                  )}
                  <Eye className="h-3 w-3 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

type ViewMode = 'board' | 'table';

export default function KandidatenOverzicht() {
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const [view, setView] = useState<ViewMode>('board');
  const [tableVisibleCols, setTableVisibleCols] = useState<string[]>(DEFAULT_TABLE_VISIBLE);
  const [boardVisibleFields, setBoardVisibleFields] = useState<string[]>(DEFAULT_BOARD_VISIBLE);
  const { data: kandidaten, isLoading } = useKandidaten(
    search ? { search } : undefined,
  );

  const handleSort = (key: string, dir: SortDir) => setSort({ key, dir });
  const clearSort = () => setSort(null);

  // Board summary stats
  const stats = useMemo(() => {
    if (!kandidaten?.length) return null;
    const completions = kandidaten.map((k) => getCompleteness(k).pct);
    const avg = Math.round(completions.reduce((a, b) => a + b, 0) / completions.length);
    const complete = completions.filter((p) => p >= 90).length;
    const incomplete = completions.filter((p) => p < 50).length;
    return { avg, complete, incomplete, total: kandidaten.length };
  }, [kandidaten]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Alle Kandidaten</h1>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setView('board')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                  view === 'board' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Compleetheid
              </button>
              <button
                onClick={() => setView('table')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                  view === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <TableProperties className="h-3.5 w-3.5" />
                Tabel
              </button>
            </div>

            <PermissionGate roles={['admin', 'intaker']}>
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Importeren
              </Button>
            </PermissionGate>
            <Button variant="outline" disabled>
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Summary cards (board mode) */}
        {view === 'board' && stats && (
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Totaal kandidaten</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Gem. volledigheid</div>
              <div className={cn('text-2xl font-bold', getCompletenessTextColor(stats.avg))}>
                {stats.avg}%
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Compleet (≥90%)</div>
              <div className="text-2xl font-bold text-emerald-600">{stats.complete}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Incompleet (&lt;50%)</div>
              <div className="text-2xl font-bold text-red-600">{stats.incomplete}</div>
            </Card>
          </div>
        )}

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
              {sort && (
                <Button variant="ghost" size="sm" onClick={clearSort} className="text-xs text-muted-foreground">
                  <X className="mr-1 h-3 w-3" />
                  Sortering opheffen
                </Button>
              )}
              {view === 'table' ? (
                <ColumnChooser
                  allItems={TABLE_COLUMNS.map((c) => ({ key: c.key, label: c.label }))}
                  visibleKeys={tableVisibleCols}
                  onChange={setTableVisibleCols}
                  label="Kolommen"
                />
              ) : (
                <ColumnChooser
                  allItems={COMPLETENESS_FIELDS.map((f) => ({ key: f.key, label: f.label, category: f.category }))}
                  visibleKeys={boardVisibleFields}
                  onChange={setBoardVisibleFields}
                  label="Velden"
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !kandidaten?.length ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                Geen kandidaten gevonden
              </div>
            ) : view === 'board' ? (
              <BoardView kandidaten={kandidaten} sort={sort} onSort={handleSort} visibleFieldKeys={boardVisibleFields} />
            ) : (
              <TableView kandidaten={kandidaten} sort={sort} onSort={handleSort} clearSort={clearSort} visibleKeys={tableVisibleCols} />
            )}
          </CardContent>
        </Card>

        <KandidaatUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      </div>
    </TooltipProvider>
  );
}
