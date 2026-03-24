import { useState } from 'react';
import {
  ClipboardEdit,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Save,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  useVragenlijstSecties,
  useUpdateVragenlijstVeld,
  useAddVragenlijstVeld,
  useDeleteVragenlijstVeld,
} from '@/hooks/useVragenlijstConfig';
import type { VragenlijstVeld } from '@/hooks/useVragenlijstConfig';

const VELD_TYPES = [
  { value: 'text', label: 'Tekst' },
  { value: 'textarea', label: 'Tekstveld' },
  { value: 'select', label: 'Selectie' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Datum' },
];

function typeBadgeVariant(type: string): string {
  switch (type) {
    case 'textarea':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'select':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'checkbox':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'date':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function typeLabel(type: string): string {
  return VELD_TYPES.find((t) => t.value === type)?.label ?? type;
}

interface EditFormState {
  label: string;
  placeholder: string;
  help_tekst: string;
  veld_type: string;
  is_verplicht: boolean;
  is_actief: boolean;
}

interface AddFormState {
  veld_naam: string;
  label: string;
  placeholder: string;
  veld_type: string;
  sectie: string;
  is_verplicht: boolean;
}

function FormulierTab({ formulier }: { formulier: 'intake' | 'aanmelding' }) {
  const { secties, isLoading, isError } = useVragenlijstSecties(formulier);
  const updateMutation = useUpdateVragenlijstVeld();
  const addMutation = useAddVragenlijstVeld();
  const deleteMutation = useDeleteVragenlijstVeld();

  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [editVeld, setEditVeld] = useState<VragenlijstVeld | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    label: '',
    placeholder: '',
    help_tekst: '',
    veld_type: 'text',
    is_verplicht: false,
    is_actief: true,
  });
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addSectie, setAddSectie] = useState('');
  const [addForm, setAddForm] = useState<AddFormState>({
    veld_naam: '',
    label: '',
    placeholder: '',
    veld_type: 'text',
    sectie: '',
    is_verplicht: false,
  });

  const toggleSection = (naam: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(naam)) {
        next.delete(naam);
      } else {
        next.add(naam);
      }
      return next;
    });
  };

  const openEditDialog = (veld: VragenlijstVeld) => {
    setEditVeld(veld);
    setEditForm({
      label: veld.label,
      placeholder: veld.placeholder ?? '',
      help_tekst: veld.help_tekst ?? '',
      veld_type: veld.veld_type,
      is_verplicht: veld.is_verplicht,
      is_actief: veld.is_actief,
    });
  };

  const handleEditSave = () => {
    if (!editVeld) return;
    updateMutation.mutate(
      {
        id: editVeld.id,
        label: editForm.label,
        placeholder: editForm.placeholder || null,
        help_tekst: editForm.help_tekst || null,
        veld_type: editForm.veld_type,
        is_verplicht: editForm.is_verplicht,
        is_actief: editForm.is_actief,
      },
      {
        onSuccess: () => {
          toast.success('Veld bijgewerkt');
          setEditVeld(null);
        },
        onError: (err) => {
          toast.error('Fout bij opslaan: ' + (err as Error).message);
        },
      }
    );
  };

  const openAddDialog = (sectieNaam: string) => {
    setAddSectie(sectieNaam);
    setAddForm({
      veld_naam: '',
      label: '',
      placeholder: '',
      veld_type: 'text',
      sectie: sectieNaam,
      is_verplicht: false,
    });
    setAddDialogOpen(true);
  };

  const handleAddSave = () => {
    if (!addForm.veld_naam.trim() || !addForm.label.trim()) {
      toast.error('Veld naam en label zijn verplicht');
      return;
    }
    const targetSectie = secties.find((s) => s.naam === addForm.sectie) ?? secties[0];
    const maxVolgorde = targetSectie
      ? Math.max(0, ...targetSectie.velden.map((v) => v.volgorde))
      : 0;

    addMutation.mutate(
      {
        formulier,
        sectie: addForm.sectie,
        sectie_volgorde: targetSectie?.volgorde ?? 0,
        veld_naam: addForm.veld_naam.trim().toLowerCase().replace(/\s+/g, '_'),
        label: addForm.label.trim(),
        placeholder: addForm.placeholder || null,
        help_tekst: null,
        veld_type: addForm.veld_type,
        opties: null,
        is_verplicht: addForm.is_verplicht,
        is_actief: true,
        volgorde: maxVolgorde + 1,
      },
      {
        onSuccess: () => {
          toast.success('Vraag toegevoegd');
          setAddDialogOpen(false);
        },
        onError: (err) => {
          toast.error('Fout bij toevoegen: ' + (err as Error).message);
        },
      }
    );
  };

  const handleDelete = (veld: VragenlijstVeld) => {
    if (!confirm(`Weet je zeker dat je "${veld.label}" wilt verwijderen?`)) return;
    deleteMutation.mutate(veld.id, {
      onSuccess: () => toast.success('Veld verwijderd'),
      onError: (err) => toast.error('Fout bij verwijderen: ' + (err as Error).message),
    });
  };

  const handleInlineToggle = (
    veld: VragenlijstVeld,
    field: 'is_verplicht' | 'is_actief',
    value: boolean
  ) => {
    updateMutation.mutate(
      { id: veld.id, [field]: value },
      {
        onSuccess: () =>
          toast.success(
            field === 'is_verplicht'
              ? value
                ? 'Veld is nu verplicht'
                : 'Veld is niet meer verplicht'
              : value
                ? 'Veld geactiveerd'
                : 'Veld gedeactiveerd'
          ),
        onError: (err) => toast.error('Fout: ' + (err as Error).message),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Configuratie laden...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20 text-destructive">
        Fout bij het laden van de configuratie. Probeer het opnieuw.
      </div>
    );
  }

  if (secties.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <ClipboardEdit className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Geen velden geconfigureerd</p>
        <p className="text-sm">Er zijn nog geen vragen ingesteld voor dit formulier.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {secties.map((sectie) => {
          const isOpen = openSections.has(sectie.naam);
          return (
            <Card key={sectie.naam}>
              <CardHeader
                className="cursor-pointer select-none py-3 px-4"
                onClick={() => toggleSection(sectie.naam)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-base font-semibold">{sectie.naam}</CardTitle>
                    <Badge variant="secondary" className="ml-2">
                      {sectie.velden.length} velden
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              {isOpen && (
                <CardContent className="pt-0 px-4 pb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Volgorde</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead className="w-[100px]">Type</TableHead>
                        <TableHead className="w-[90px] text-center">Verplicht</TableHead>
                        <TableHead className="w-[80px] text-center">Actief</TableHead>
                        <TableHead className="w-[100px] text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sectie.velden.map((veld) => (
                        <TableRow key={veld.id} className={!veld.is_actief ? 'opacity-50' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <GripVertical className="h-3 w-3" />
                              <span className="text-sm">{veld.volgorde}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium text-sm">{veld.label}</span>
                              {veld.placeholder && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({veld.placeholder})
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{veld.veld_naam}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${typeBadgeVariant(veld.veld_type)}`}
                            >
                              {typeLabel(veld.veld_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={veld.is_verplicht}
                              onCheckedChange={(val) =>
                                handleInlineToggle(veld, 'is_verplicht', val)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={veld.is_actief}
                              onCheckedChange={(val) => handleInlineToggle(veld, 'is_actief', val)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(veld)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(veld)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddDialog(sectie.naam)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Vraag toevoegen
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Edit dialog */}
      <Dialog open={editVeld !== null} onOpenChange={(open) => !open && setEditVeld(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Vraag bewerken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-label">Label</Label>
              <Input
                id="edit-label"
                value={editForm.label}
                onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-placeholder">Placeholder</Label>
              <Input
                id="edit-placeholder"
                value={editForm.placeholder}
                onChange={(e) => setEditForm((f) => ({ ...f, placeholder: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-help">Helptekst</Label>
              <Textarea
                id="edit-help"
                value={editForm.help_tekst}
                onChange={(e) => setEditForm((f) => ({ ...f, help_tekst: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Veldtype</Label>
              <Select
                value={editForm.veld_type}
                onValueChange={(val) => setEditForm((f) => ({ ...f, veld_type: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-verplicht">Verplicht</Label>
              <Switch
                id="edit-verplicht"
                checked={editForm.is_verplicht}
                onCheckedChange={(val) => setEditForm((f) => ({ ...f, is_verplicht: val }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-actief">Actief</Label>
              <Switch
                id="edit-actief"
                checked={editForm.is_actief}
                onCheckedChange={(val) => setEditForm((f) => ({ ...f, is_actief: val }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVeld(null)}>
              Annuleren
            </Button>
            <Button onClick={handleEditSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Vraag toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-naam">Veld naam (technisch)</Label>
              <Input
                id="add-naam"
                placeholder="bijv. extra_opmerking"
                value={addForm.veld_naam}
                onChange={(e) => setAddForm((f) => ({ ...f, veld_naam: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-label">Label</Label>
              <Input
                id="add-label"
                placeholder="bijv. Extra opmerking"
                value={addForm.label}
                onChange={(e) => setAddForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-placeholder">Placeholder</Label>
              <Input
                id="add-placeholder"
                value={addForm.placeholder}
                onChange={(e) => setAddForm((f) => ({ ...f, placeholder: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Veldtype</Label>
              <Select
                value={addForm.veld_type}
                onValueChange={(val) => setAddForm((f) => ({ ...f, veld_type: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sectie</Label>
              <Select
                value={addForm.sectie}
                onValueChange={(val) => setAddForm((f) => ({ ...f, sectie: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {secties.map((s) => (
                    <SelectItem key={s.naam} value={s.naam}>
                      {s.naam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="add-verplicht">Verplicht</Label>
              <Switch
                id="add-verplicht"
                checked={addForm.is_verplicht}
                onCheckedChange={(val) => setAddForm((f) => ({ ...f, is_verplicht: val }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleAddSave} disabled={addMutation.isPending}>
              {addMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function VragenlijstBeheer() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <ClipboardEdit className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Vragenlijst Beheer</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Beheer de intake- en aanmeldingsvragenlijst. Pas labels aan, stel verplichte velden in en
          voeg vragen toe.
        </p>
      </div>

      <Tabs defaultValue="intake">
        <TabsList>
          <TabsTrigger value="intake">Intake Vragenlijst</TabsTrigger>
          <TabsTrigger value="aanmelding">Aanmelding Vragenlijst</TabsTrigger>
        </TabsList>
        <TabsContent value="intake" className="mt-4">
          <FormulierTab formulier="intake" />
        </TabsContent>
        <TabsContent value="aanmelding" className="mt-4">
          <FormulierTab formulier="aanmelding" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
