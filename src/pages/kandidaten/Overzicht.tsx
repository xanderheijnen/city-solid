import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Download, Loader2, Upload, ArrowUpAZ, ArrowDownZA,
  ArrowUp01, ArrowDown10, ChevronsUpDown, X,
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { StatusBadge } from '@/components/StatusBadge';
import { PermissionGate } from '@/components/PermissionGate';
import { KandidaatUploadDialog } from '@/components/KandidaatUploadDialog';
import { useKandidaten } from '@/hooks/useKandidaten';
import { GESLACHT_LABELS } from '@/lib/constants';
import type { Kandidaat, Geslacht } from '@/lib/types';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

interface ColumnDef {
  key: string;
  label: string;
  sortType: 'text' | 'number' | 'date' | 'boolean';
  getValue: (k: Kandidaat) => string | number | boolean | null | undefined;
  render: (k: Kandidaat) => React.ReactNode;
  width?: string;
}

const COLUMNS: ColumnDef[] = [
  {
    key: 'display_id',
    label: 'ID',
    sortType: 'text',
    getValue: (k) => k.display_id,
    render: (k) => (
      <Link to={`/kandidaten/${k.id}`} className="text-primary hover:underline font-mono text-sm">
        {k.display_id}
      </Link>
    ),
    width: 'w-20',
  },
  {
    key: 'voornaam',
    label: 'Voornaam',
    sortType: 'text',
    getValue: (k) => k.voornaam,
    render: (k) => k.voornaam,
  },
  {
    key: 'achternaam',
    label: 'Achternaam',
    sortType: 'text',
    getValue: (k) => k.achternaam,
    render: (k) => k.achternaam,
  },
  {
    key: 'traject_status',
    label: 'Status',
    sortType: 'text',
    getValue: (k) => k.traject_status,
    render: (k) => <StatusBadge status={k.traject_status} />,
  },
  {
    key: 'geslacht',
    label: 'Geslacht',
    sortType: 'text',
    getValue: (k) => k.geslacht,
    render: (k) => k.geslacht ? GESLACHT_LABELS[k.geslacht as Geslacht] : '—',
  },
  {
    key: 'telefoon',
    label: 'Telefoon',
    sortType: 'text',
    getValue: (k) => k.telefoon,
    render: (k) => k.telefoon ?? '—',
  },
  {
    key: 'email',
    label: 'Email',
    sortType: 'text',
    getValue: (k) => k.email,
    render: (k) => k.email ?? '—',
  },
  {
    key: 'wijk',
    label: 'Wijk',
    sortType: 'text',
    getValue: (k) => k.wijk,
    render: (k) => k.wijk ?? '—',
  },
  {
    key: 'gebied',
    label: 'Gebied',
    sortType: 'text',
    getValue: (k) => k.gebied,
    render: (k) => k.gebied ?? '—',
  },
  {
    key: 'uitkering',
    label: 'Uitkering',
    sortType: 'text',
    getValue: (k) => k.uitkering?.join(', ') ?? null,
    render: (k) => k.uitkering?.join(', ') ?? '—',
  },
  {
    key: 'klantmanager',
    label: 'Klantmanager',
    sortType: 'text',
    getValue: (k) => k.klantmanager,
    render: (k) => k.klantmanager ?? '—',
  },
  {
    key: 'rijbewijs',
    label: 'Rijbewijs',
    sortType: 'boolean',
    getValue: (k) => k.rijbewijs,
    render: (k) => k.rijbewijs ? 'Ja' : 'Nee',
  },
  {
    key: 'aanmeld_datum',
    label: 'Aanmeld datum',
    sortType: 'date',
    getValue: (k) => k.aanmeld_datum,
    render: (k) => k.aanmeld_datum ?? '—',
  },
];

// ---------------------------------------------------------------------------
// Sortable column header component
// ---------------------------------------------------------------------------

type SortDir = 'asc' | 'desc';

interface SortableHeaderProps {
  column: ColumnDef;
  activeSort: { key: string; dir: SortDir } | null;
  onSort: (key: string, dir: SortDir) => void;
  onClear: () => void;
}

function SortableHeader({ column, activeSort, onSort, onClear }: SortableHeaderProps) {
  const isActive = activeSort?.key === column.key;
  const isAsc = isActive && activeSort?.dir === 'asc';
  const isDesc = isActive && activeSort?.dir === 'desc';

  const isTextSort = column.sortType === 'text';
  const isDateSort = column.sortType === 'date';

  return (
    <TableHead className={column.width}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium -ml-2 px-2 py-1 rounded hover:bg-muted/80 transition-colors w-full text-left',
              isActive && 'text-primary font-semibold',
            )}
          >
            <span>{column.label}</span>
            {isAsc && (isTextSort ? <ArrowUpAZ className="h-3.5 w-3.5 text-primary" /> : <ArrowUp01 className="h-3.5 w-3.5 text-primary" />)}
            {isDesc && (isTextSort ? <ArrowDownZA className="h-3.5 w-3.5 text-primary" /> : <ArrowDown10 className="h-3.5 w-3.5 text-primary" />)}
            {!isActive && <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => onSort(column.key, 'asc')}
            className={cn(isAsc && 'bg-primary/10 text-primary')}
          >
            {isTextSort ? (
              <ArrowUpAZ className="mr-2 h-4 w-4" />
            ) : isDateSort ? (
              <ArrowUp01 className="mr-2 h-4 w-4" />
            ) : (
              <ArrowUp01 className="mr-2 h-4 w-4" />
            )}
            {isTextSort ? 'A → Z sorteren' : isDateSort ? 'Oudste eerst' : 'Oplopend'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onSort(column.key, 'desc')}
            className={cn(isDesc && 'bg-primary/10 text-primary')}
          >
            {isTextSort ? (
              <ArrowDownZA className="mr-2 h-4 w-4" />
            ) : isDateSort ? (
              <ArrowDown10 className="mr-2 h-4 w-4" />
            ) : (
              <ArrowDown10 className="mr-2 h-4 w-4" />
            )}
            {isTextSort ? 'Z → A sorteren' : isDateSort ? 'Nieuwste eerst' : 'Aflopend'}
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

// ---------------------------------------------------------------------------
// Sort helper
// ---------------------------------------------------------------------------

function sortKandidaten(
  data: Kandidaat[],
  sort: { key: string; dir: SortDir } | null,
): Kandidaat[] {
  if (!sort) return data;

  const col = COLUMNS.find((c) => c.key === sort.key);
  if (!col) return data;

  return [...data].sort((a, b) => {
    const aVal = col.getValue(a);
    const bVal = col.getValue(b);

    // Nulls always last
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    let cmp = 0;
    if (col.sortType === 'boolean') {
      cmp = (aVal === true ? 1 : 0) - (bVal === true ? 1 : 0);
    } else if (col.sortType === 'number') {
      cmp = Number(aVal) - Number(bVal);
    } else {
      cmp = String(aVal).localeCompare(String(bVal), 'nl', { sensitivity: 'base' });
    }

    return sort.dir === 'desc' ? -cmp : cmp;
  });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function KandidatenOverzicht() {
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const { data: kandidaten, isLoading } = useKandidaten(
    search ? { search } : undefined,
  );

  const sorted = useMemo(
    () => sortKandidaten(kandidaten ?? [], sort),
    [kandidaten, sort],
  );

  const handleSort = (key: string, dir: SortDir) => {
    setSort({ key, dir });
  };

  const clearSort = () => {
    setSort(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kandidaten Overzicht</h1>
        <div className="flex items-center gap-2">
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
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-[1400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUMNS.map((col) => (
                      <SortableHeader
                        key={col.key}
                        column={col}
                        activeSort={sort}
                        onSort={handleSort}
                        onClear={clearSort}
                      />
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={COLUMNS.length} className="h-32 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : !sorted.length ? (
                    <TableRow>
                      <TableCell colSpan={COLUMNS.length} className="h-32 text-center text-muted-foreground">
                        Geen kandidaten gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    sorted.map((k) => (
                      <TableRow key={k.id}>
                        {COLUMNS.map((col) => (
                          <TableCell key={col.key}>{col.render(k)}</TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <KandidaatUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
