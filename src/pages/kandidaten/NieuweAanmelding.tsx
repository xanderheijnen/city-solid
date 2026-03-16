import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateKandidaat } from '@/hooks/useKandidaten';

interface AanmeldingForm {
  voornaam: string;
  achternaam: string;
  telefoon: string;
  email: string;
  geslacht: string;
}

export default function NieuweAanmelding() {
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<AanmeldingForm>();
  const createKandidaat = useCreateKandidaat();

  const onSubmit = async (data: AanmeldingForm) => {
    try {
      const result = await createKandidaat.mutateAsync({
        voornaam: data.voornaam,
        achternaam: data.achternaam,
        telefoon: data.telefoon || null,
        email: data.email || null,
        geslacht: data.geslacht || 'onbekend',
        traject_status: 'aanmelding',
      });
      toast.success(`Aanmelding ${result.display_id} aangemaakt`);
      navigate('/kandidaten/aanmeldingen');
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: string }).message) : JSON.stringify(err);
      toast.error('Fout bij aanmaken: ' + msg);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Nieuwe Aanmelding</h1>

      <Card>
        <CardHeader>
          <CardTitle>Basisgegevens</CardTitle>
          <CardDescription>
            Vul de basisgegevens in om een nieuwe aanmelding te registreren.
            Na het opslaan kan de volledige intake worden uitgevoerd.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="voornaam">Voornaam *</Label>
                <Input id="voornaam" {...register('voornaam', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="achternaam">Achternaam *</Label>
                <Input id="achternaam" {...register('achternaam', { required: true })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Geslacht</Label>
              <Select onValueChange={(v) => setValue('geslacht', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="man">Man</SelectItem>
                  <SelectItem value="vrouw">Vrouw</SelectItem>
                  <SelectItem value="anders">Anders</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telefoon">Telefoon</Label>
                <Input id="telefoon" type="tel" {...register('telefoon')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" {...register('email')} />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Opslaan...' : 'Aanmelding Opslaan'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Annuleren
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
