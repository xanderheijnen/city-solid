import { useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Check,
  X,
  Settings,
  Tag,
  MapPin,
  Wallet,
  Users,
  Route,
} from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  useAllOptiesIncludingInactive,
  useCreateOptie,
  useUpdateOptie,
  useDeleteOptie,
  useRestoreOptie,
} from '@/hooks/useOpties';
import type { Optie } from '@/lib/types';

// ---------------------------------------------------------------------------
// Category configuration
// ---------------------------------------------------------------------------

const CATEGORIEEN = [
  { key: 'Wijk', label: 'Wijk', icon: MapPin },
  { key: 'Gebied', label: 'Gebied', icon: Tag },
  { key: 'Uitkering', label: 'Uitkering', icon: Wallet },
  { key: 'Klantmanager', label: 'Klantmanager', icon: Users },
  { key: 'Traject', label: 'Traject', icon: Route },
] as const;

type Categorie = (typeof CATEGORIEEN)[number]['key'];

// ---------------------------------------------------------------------------
// OptieRij - single option row with inline editing
// ---------------------------------------------------------------------------

interface OptieRijProps {
  optie: Optie;
}

function OptieRij({ optie }: OptieRijProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editWaarde, setEditWaarde] = useState(optie.waarde);

  const updateOptie = useUpdateOptie();
  const deleteOptie = useDeleteOptie();
  const restoreOptie = useRestoreOptie();

  const handleSave = () => {
    const trimmed = editWaarde.trim();
    if (!trimmed) {
      toast.error('Waarde mag niet leeg zijn');
      return;
    }
    if (trimmed === optie.waarde) {
      setIsEditing(false);
      return;
    }
    updateOptie.mutate(
      { id: optie.id, waarde: trimmed },
      {
        onSuccess: () => {
          toast.success(`"${trimmed}" bijgewerkt`);
          setIsEditing(false);
        },
        onError: () => {
          toast.error('Fout bij het bijwerken van de optie');
        },
      },
    );
  };

  const handleCancel = () => {
    setEditWaarde(optie.waarde);
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteOptie.mutate(optie.id, {
      onSuccess: () => toast.success(`"${optie.waarde}" gedeactiveerd`),
      onError: () => toast.error('Fout bij het deactiveren van de optie'),
    });
  };

  const handleRestore = () => {
    restoreOptie.mutate(optie.id, {
      onSuccess: () => toast.success(`"${optie.waarde}" hersteld`),
      onError: () => toast.error('Fout bij het herstellen van de optie'),
    });
  };

  // -- Inactive row ----------------------------------------------------------
  if (!optie.is_actief) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-dashed border-muted px-3 py-2 opacity-50">
        <span className="flex-1 text-sm text-muted-foreground line-through">
          {optie.waarde}
        </span>
        <Badge variant="outline" className="text-xs">
          Inactief
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRestore}
          disabled={restoreOptie.isPending}
          className="h-8 gap-1.5 text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Herstellen
        </Button>
      </div>
    );
  }

  // -- Active row (editing) --------------------------------------------------
  if (isEditing) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
        <Input
          value={editWaarde}
          onChange={(e) => setEditWaarde(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          className="h-8 flex-1 text-sm"
          autoFocus
          disabled={updateOptie.isPending}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-green-600 hover:text-green-700"
          onClick={handleSave}
          disabled={updateOptie.isPending}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={handleCancel}
          disabled={updateOptie.isPending}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // -- Active row (display) --------------------------------------------------
  return (
    <div className="group flex items-center gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-muted/50">
      <span className="flex-1 text-sm">{optie.waarde}</span>
      <span className="text-xs text-muted-foreground tabular-nums">
        #{optie.volgorde}
      </span>
      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setEditWaarde(optie.waarde);
            setIsEditing(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={deleteOptie.isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategoriePanel - list + add form for a single category
// ---------------------------------------------------------------------------

interface CategoriePanelProps {
  categorie: Categorie;
}

function CategoriePanel({ categorie }: CategoriePanelProps) {
  const [nieuweWaarde, setNieuweWaarde] = useState('');

  const { data: opties, isLoading, isError } = useAllOptiesIncludingInactive(categorie);
  const createOptie = useCreateOptie();

  const actief = opties?.filter((o) => o.is_actief) ?? [];
  const inactief = opties?.filter((o) => !o.is_actief) ?? [];

  const handleToevoegen = () => {
    const trimmed = nieuweWaarde.trim();
    if (!trimmed) return;

    const nextVolgorde =
      opties && opties.length > 0
        ? Math.max(...opties.map((o) => o.volgorde)) + 1
        : 1;

    createOptie.mutate(
      { categorie, waarde: trimmed, volgorde: nextVolgorde },
      {
        onSuccess: () => {
          toast.success(`"${trimmed}" toegevoegd aan ${categorie}`);
          setNieuweWaarde('');
        },
        onError: () => {
          toast.error('Fout bij het aanmaken van de optie');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Laden...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-destructive">
        Er is een fout opgetreden bij het ophalen van de opties.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active items */}
      {actief.length === 0 && inactief.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nog geen waarden voor deze categorie.
        </p>
      )}

      {actief.length > 0 && (
        <div className="space-y-1.5">
          {actief.map((optie) => (
            <OptieRij key={optie.id} optie={optie} />
          ))}
        </div>
      )}

      {/* Inactive items */}
      {inactief.length > 0 && (
        <div className="space-y-1.5">
          <p className="px-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Inactief ({inactief.length})
          </p>
          {inactief.map((optie) => (
            <OptieRij key={optie.id} optie={optie} />
          ))}
        </div>
      )}

      {/* Add new value */}
      <div className="flex items-center gap-2 pt-2">
        <Input
          placeholder="Nieuwe waarde toevoegen..."
          value={nieuweWaarde}
          onChange={(e) => setNieuweWaarde(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleToevoegen();
          }}
          className="h-9 flex-1 text-sm"
          disabled={createOptie.isPending}
        />
        <Button
          size="sm"
          onClick={handleToevoegen}
          disabled={!nieuweWaarde.trim() || createOptie.isPending}
          className="h-9 gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Toevoegen
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OptiesBeheer - main page component
// ---------------------------------------------------------------------------

export default function OptiesBeheer() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Opties Beheer</h1>
          <p className="text-sm text-muted-foreground">
            Beheer de keuzelijsten die in de applicatie worden gebruikt.
          </p>
        </div>
      </div>

      <Tabs defaultValue={CATEGORIEEN[0].key}>
        <TabsList>
          {CATEGORIEEN.map(({ key, label, icon: Icon }) => (
            <TabsTrigger key={key} value={key} className="gap-1.5">
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIEEN.map(({ key, label, icon: Icon }) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0 pb-4">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h2 className="text-lg font-semibold">{label} opties</h2>
                  <p className="text-xs text-muted-foreground">
                    Waarden voor de categorie &ldquo;{label}&rdquo;
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <CategoriePanel categorie={key} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
