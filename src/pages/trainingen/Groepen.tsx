import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { PermissionGate } from '@/components/PermissionGate';
import { useTrainingsgroepen, useCreateTrainingsgroep, useTrainingen } from '@/hooks/useTrainingen';

const STATUS_COLORS: Record<string, string> = {
  gepland: 'bg-blue-100 text-blue-700',
  actief: 'bg-green-100 text-green-700',
  afgerond: 'bg-gray-100 text-gray-700',
};

interface GroepForm {
  training_id: string;
  start_datum: string;
  eind_datum: string;
  max_deelnemers: string;
  status: string;
}

export default function Groepen() {
  const { data: groepen, isLoading } = useTrainingsgroepen();
  const { data: trainingen } = useTrainingen({ is_actief: true });
  const createGroep = useCreateTrainingsgroep();

  const [dialogOpen, setDialogOpen] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm<GroepForm>();

  const openCreate = () => {
    reset({ training_id: '', start_datum: '', eind_datum: '', max_deelnemers: '', status: 'gepland' });
    setDialogOpen(true);
  };

  const onSubmit = async (data: GroepForm) => {
    try {
      const result = await createGroep.mutateAsync({
        training_id: data.training_id,
        start_datum: data.start_datum,
        eind_datum: data.eind_datum || null,
        max_deelnemers: data.max_deelnemers ? parseInt(data.max_deelnemers) : null,
        status: data.status || 'gepland',
      });
      toast.success(`Groep ${(result as any).groepscode ?? ''} aangemaakt`);
      setDialogOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Fout: ' + msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trainingsgroepen</h1>
        <PermissionGate roles={['admin']}>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />Nieuwe Groep
          </Button>
        </PermissionGate>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !groepen?.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-dashed">
            <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
              Nog geen trainingsgroepen. Groepscode wordt automatisch gegenereerd (bijv. 2026-03a).
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groepen.map((g) => (
            <Link key={g.id} to={`/trainingen/groepen/${g.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-mono">{g.groepscode ?? 'Geen code'}</CardTitle>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[g.status] ?? ''}`}>
                      {g.status}
                    </span>
                  </div>
                  <CardDescription>{g.training?.naam ?? 'Onbekende training'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Start: {g.start_datum}</p>
                    {g.eind_datum && <p>Eind: {g.eind_datum}</p>}
                    {g.max_deelnemers && <p>Max: {g.max_deelnemers} deelnemers</p>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Trainingsgroep</DialogTitle>
            <DialogDescription>
              De groepscode (bijv. 2026-03a) wordt automatisch gegenereerd op basis van de startdatum.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Training *</Label>
              <Select onValueChange={(v) => setValue('training_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een training..." />
                </SelectTrigger>
                <SelectContent>
                  {trainingen?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.naam}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="g-start">Startdatum *</Label>
                <Input id="g-start" type="date" {...register('start_datum', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="g-eind">Einddatum</Label>
                <Input id="g-eind" type="date" {...register('eind_datum')} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="g-max">Max deelnemers</Label>
                <Input id="g-max" type="number" min={1} {...register('max_deelnemers')} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select defaultValue="gepland" onValueChange={(v) => setValue('status', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gepland">Gepland</SelectItem>
                    <SelectItem value="actief">Actief</SelectItem>
                    <SelectItem value="afgerond">Afgerond</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit">Groep Aanmaken</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
