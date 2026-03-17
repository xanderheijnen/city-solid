import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateKandidaat } from '@/hooks/useKandidaten';

interface AanmeldingForm {
  voornaam: string;
  achternaam: string;
  telefoon: string;
  email: string;
  geslacht: string;
  leeftijd: string;
  wijk: string;
  door_wie_bekend: string;
  aanmeld_organisatie: string;
  aanmelder_naam: string;
  aanmelder_telefoon: string;
  aanmelder_email: string;
}

const PROJECTEN = ['Certi & Skills', 'Cityteam', 'City Side Jobs'] as const;

export default function NieuweAanmelding() {
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, watch, formState: { isSubmitting } } = useForm<AanmeldingForm>();
  const createKandidaat = useCreateKandidaat();
  const [aanmeldType, setAanmeldType] = useState<'zelf' | 'ander' | ''>('');
  const [selectedProjecten, setSelectedProjecten] = useState<string[]>([]);

  const toggleProject = (project: string) => {
    setSelectedProjecten((prev) =>
      prev.includes(project) ? prev.filter((p) => p !== project) : [...prev, project],
    );
  };

  const onSubmit = async (data: AanmeldingForm) => {
    try {
      const result = await createKandidaat.mutateAsync({
        voornaam: data.voornaam,
        achternaam: data.achternaam,
        telefoon: data.telefoon || null,
        email: data.email || null,
        geslacht: data.geslacht || 'onbekend',
        leeftijd: data.leeftijd || null,
        wijk: data.wijk || null,
        aanmeld_type: aanmeldType || null,
        aanmelder_naam: aanmeldType === 'ander' ? (data.aanmelder_naam || null) : null,
        aanmelder_telefoon: aanmeldType === 'ander' ? (data.aanmelder_telefoon || null) : null,
        aanmelder_email: aanmeldType === 'ander' ? (data.aanmelder_email || null) : null,
        door_wie_bekend: data.door_wie_bekend || null,
        aanmeld_organisatie: data.aanmeld_organisatie || null,
        gewenst_project: selectedProjecten.length > 0 ? selectedProjecten : null,
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

      {/* Aanmeld type */}
      <Card>
        <CardHeader>
          <CardTitle>Type aanmelding</CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={(v) => setAanmeldType(v as 'zelf' | 'ander')}>
            <SelectTrigger>
              <SelectValue placeholder="Kies een optie..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zelf">Ik meld mezelf aan</SelectItem>
              <SelectItem value="ander">Ik meld iemand anders aan</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Aanmelder gegevens (alleen bij 'ander') */}
      {aanmeldType === 'ander' && (
        <Card>
          <CardHeader>
            <CardTitle>Gegevens aanmelder</CardTitle>
            <CardDescription>
              Vul hier uw eigen gegevens in als aanmelder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aanmelder_naam">Naam aanmelder</Label>
              <Input id="aanmelder_naam" placeholder="Naam" {...register('aanmelder_naam')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="aanmelder_telefoon">Telefoon aanmelder</Label>
                <Input id="aanmelder_telefoon" type="tel" {...register('aanmelder_telefoon')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aanmelder_email">E-mail aanmelder</Label>
                <Input id="aanmelder_email" type="email" {...register('aanmelder_email')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aanmeld_organisatie">Organisatie</Label>
              <Input id="aanmeld_organisatie" placeholder="Naam van de organisatie" {...register('aanmeld_organisatie')} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kandidaat gegevens */}
      <Card>
        <CardHeader>
          <CardTitle>Gegevens geïnteresseerde jongere</CardTitle>
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

            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-2">
                <Label htmlFor="leeftijd">Leeftijd</Label>
                <Input id="leeftijd" placeholder="bijv. 22" {...register('leeftijd')} />
              </div>
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

            <div className="space-y-2">
              <Label htmlFor="wijk">Wijk</Label>
              <Input id="wijk" placeholder="Wijk" {...register('wijk')} />
            </div>

            {/* Gewenst project */}
            <div className="space-y-3">
              <Label>Om welk project gaat het?</Label>
              <div className="flex flex-col gap-2">
                {PROJECTEN.map((project) => (
                  <label key={project} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedProjecten.includes(project)}
                      onCheckedChange={() => toggleProject(project)}
                    />
                    <span className="text-sm">{project}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Via wie ken je ons */}
            <div className="space-y-2">
              <Label htmlFor="door_wie_bekend">Via wie ken je ons?</Label>
              <Input id="door_wie_bekend" placeholder="Hoe ben je bij City Solid terechtgekomen?" {...register('door_wie_bekend')} />
            </div>

            {/* Aanmelder/organisatie als type 'zelf' of niet geselecteerd */}
            {aanmeldType !== 'ander' && (
              <div className="space-y-2">
                <Label htmlFor="aanmeld_organisatie_zelf">Aanmeld organisatie</Label>
                <Input id="aanmeld_organisatie_zelf" placeholder="Naam van de organisatie (optioneel)" {...register('aanmeld_organisatie')} />
              </div>
            )}

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
