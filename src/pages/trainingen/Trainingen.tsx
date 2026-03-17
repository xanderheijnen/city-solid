import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { PermissionGate } from '@/components/PermissionGate';
import { useTrainingen, useCreateTraining, useUpdateTraining, useDeleteTraining } from '@/hooks/useTrainingen';
import type { Training } from '@/lib/types';

interface TrainingForm {
  naam: string;
  omschrijving: string;
  duur_weken: string;
  max_deelnemers: string;
  locatie: string;
  is_actief: boolean;
}

export default function Trainingen() {
  const { data: trainingen, isLoading } = useTrainingen();
  const createTraining = useCreateTraining();
  const updateTraining = useUpdateTraining();
  const deleteTraining = useDeleteTraining();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Training | null>(null);
  const { register, handleSubmit, reset, setValue, watch } = useForm<TrainingForm>();
  const isActief = watch('is_actief');

  const openCreate = () => {
    setEditing(null);
    reset({ naam: '', omschrijving: '', duur_weken: '', max_deelnemers: '', locatie: '', is_actief: true });
    setDialogOpen(true);
  };

  const openEdit = (t: Training) => {
    setEditing(t);
    reset({
      naam: t.naam,
      omschrijving: t.omschrijving ?? '',
      duur_weken: t.duur_weken?.toString() ?? '',
      max_deelnemers: t.max_deelnemers?.toString() ?? '',
      locatie: t.locatie ?? '',
      is_actief: t.is_actief,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: TrainingForm) => {
    const payload = {
      naam: data.naam,
      omschrijving: data.omschrijving || null,
      duur_weken: data.duur_weken ? parseInt(data.duur_weken) : null,
      max_deelnemers: data.max_deelnemers ? parseInt(data.max_deelnemers) : null,
      locatie: data.locatie || null,
      is_actief: data.is_actief,
    };

    try {
      if (editing) {
        await updateTraining.mutateAsync({ id: editing.id, ...payload });
        toast.success('Certificaat bijgewerkt');
      } else {
        await createTraining.mutateAsync(payload);
        toast.success('Certificaat aangemaakt');
      }
      setDialogOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Fout: ' + msg);
    }
  };

  const handleDelete = async (t: Training) => {
    if (!confirm(`Weet je zeker dat je "${t.naam}" wilt verwijderen?`)) return;
    try {
      await deleteTraining.mutateAsync(t.id);
      toast.success('Certificaat verwijderd');
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Fout: ' + msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Certificaten</h1>
        <PermissionGate roles={['admin']}>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />Nieuw Certificaat
          </Button>
        </PermissionGate>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Omschrijving</TableHead>
                <TableHead>Duur (weken)</TableHead>
                <TableHead>Locatie</TableHead>
                <TableHead>Max Deelnemers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !trainingen?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Nog geen certificaten aangemaakt
                  </TableCell>
                </TableRow>
              ) : (
                trainingen.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.naam}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{t.omschrijving ?? '—'}</TableCell>
                    <TableCell>{t.duur_weken ?? '—'}</TableCell>
                    <TableCell>{t.locatie ?? '—'}</TableCell>
                    <TableCell>{t.max_deelnemers ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={t.is_actief ? 'default' : 'secondary'}>
                        {t.is_actief ? 'Actief' : 'Inactief'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <PermissionGate roles={['admin']}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(t)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </PermissionGate>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Certificaat Bewerken' : 'Nieuw Certificaat'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Pas de gegevens van het certificaat aan.' : 'Maak een nieuw certificaat aan.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="d-naam">Naam *</Label>
              <Input id="d-naam" {...register('naam', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-omschrijving">Omschrijving</Label>
              <Textarea id="d-omschrijving" rows={3} {...register('omschrijving')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="d-duur">Duur (weken)</Label>
                <Input id="d-duur" type="number" min={1} {...register('duur_weken')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-max">Max deelnemers</Label>
                <Input id="d-max" type="number" min={1} {...register('max_deelnemers')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-locatie">Locatie</Label>
                <Input id="d-locatie" {...register('locatie')} />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="d-actief"
                checked={isActief}
                onCheckedChange={(checked) => setValue('is_actief', !!checked)}
              />
              <Label htmlFor="d-actief">Actief</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit">
                {editing ? 'Opslaan' : 'Aanmaken'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
