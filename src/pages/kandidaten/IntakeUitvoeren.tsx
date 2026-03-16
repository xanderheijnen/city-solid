import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useKandidaat, useUpdateKandidaat } from '@/hooks/useKandidaten';
import { useAuth } from '@/hooks/useAuth';

const SECTIONS = [
  'Persoonlijk',
  'Adres',
  'Contact',
  'Financieel',
  'Gezondheid',
  'Casemanagement',
  'Doelen',
  'Ondersteuning',
  'Justitie',
  'Werkervaring',
] as const;

interface IntakeForm {
  voornaam: string;
  achternaam: string;
  geslacht: string;
  geboortedatum: string;
  straat: string;
  postcode: string;
  ingeschreven_adres_brp: string;
  wijk: string;
  gebied: string;
  telefoon: string;
  email: string;
  contactpersoon: string;
  whatsapp: boolean;
  eigen_vervoer: boolean;
  rijbewijs: boolean;
  uitkering: string;
  toestemming: boolean;
  medische_bijzonderheden: string;
  klantmanager: string;
  stip_aan_de_horizon: string;
  trajecten: string;
  hulpverleners_betrokken: string;
  afspraken_hulp: string;
  aanraking_politie_justitie: boolean;
  aanraking_reden: string;
  lopende_zaken: string;
  werkervaring: string;
  certificaten_behaald: string;
  intake_notities: string;
}

export default function IntakeUitvoeren() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: kandidaat, isLoading } = useKandidaat(id);
  const updateKandidaat = useUpdateKandidaat();
  const [currentSection, setCurrentSection] = useState(0);
  const { register, handleSubmit, setValue, watch, reset } = useForm<IntakeForm>();

  // Pre-fill form when kandidaat loads
  useEffect(() => {
    if (!kandidaat) return;
    reset({
      voornaam: kandidaat.voornaam ?? '',
      achternaam: kandidaat.achternaam ?? '',
      geslacht: kandidaat.geslacht ?? '',
      geboortedatum: kandidaat.geboortedatum ?? '',
      straat: kandidaat.straat ?? '',
      postcode: kandidaat.postcode ?? '',
      ingeschreven_adres_brp: kandidaat.ingeschreven_adres_brp ?? '',
      wijk: kandidaat.wijk ?? '',
      gebied: kandidaat.gebied ?? '',
      telefoon: kandidaat.telefoon ?? '',
      email: kandidaat.email ?? '',
      contactpersoon: kandidaat.contactpersoon ?? '',
      whatsapp: kandidaat.whatsapp ?? false,
      eigen_vervoer: kandidaat.eigen_vervoer ?? false,
      rijbewijs: kandidaat.rijbewijs ?? false,
      uitkering: kandidaat.uitkering?.join(', ') ?? '',
      toestemming: kandidaat.toestemming ?? false,
      medische_bijzonderheden: kandidaat.medische_bijzonderheden ?? '',
      klantmanager: kandidaat.klantmanager ?? '',
      stip_aan_de_horizon: kandidaat.stip_aan_de_horizon ?? '',
      trajecten: kandidaat.trajecten ?? '',
      hulpverleners_betrokken: kandidaat.hulpverleners_betrokken ?? '',
      afspraken_hulp: kandidaat.afspraken_hulp ?? '',
      aanraking_politie_justitie: kandidaat.aanraking_politie_justitie ?? false,
      aanraking_reden: kandidaat.aanraking_reden ?? '',
      lopende_zaken: kandidaat.lopende_zaken ?? '',
      werkervaring: kandidaat.werkervaring ?? '',
      certificaten_behaald: kandidaat.certificaten_behaald ?? '',
      intake_notities: kandidaat.intake_notities ?? '',
    });
  }, [kandidaat, reset]);

  const onSubmit = async (data: IntakeForm) => {
    if (!id) return;
    try {
      const now = new Date().toISOString().split('T')[0];
      await updateKandidaat.mutateAsync({
        id,
        voornaam: data.voornaam,
        achternaam: data.achternaam,
        geslacht: data.geslacht || null,
        geboortedatum: data.geboortedatum || null,
        straat: data.straat || null,
        postcode: data.postcode || null,
        ingeschreven_adres_brp: data.ingeschreven_adres_brp || null,
        wijk: data.wijk || null,
        gebied: data.gebied || null,
        telefoon: data.telefoon || null,
        email: data.email || null,
        contactpersoon: data.contactpersoon || null,
        whatsapp: data.whatsapp,
        eigen_vervoer: data.eigen_vervoer,
        rijbewijs: data.rijbewijs,
        uitkering: data.uitkering ? data.uitkering.split(',').map(s => s.trim()).filter(Boolean) : null,
        toestemming: data.toestemming,
        medische_bijzonderheden: data.medische_bijzonderheden || null,
        klantmanager: data.klantmanager || null,
        stip_aan_de_horizon: data.stip_aan_de_horizon || null,
        trajecten: data.trajecten || null,
        hulpverleners_betrokken: data.hulpverleners_betrokken || null,
        afspraken_hulp: data.afspraken_hulp || null,
        aanraking_politie_justitie: data.aanraking_politie_justitie,
        aanraking_reden: data.aanraking_reden || null,
        lopende_zaken: data.lopende_zaken || null,
        werkervaring: data.werkervaring || null,
        certificaten_behaald: data.certificaten_behaald || null,
        intake_notities: data.intake_notities || null,
        intake_datum: now,
        intake_door: user?.id ?? null,
        traject_status: 'intake_afgerond',
      });
      toast.success('Intake opgeslagen — status bijgewerkt naar "Intake Afgerond"');
      navigate(`/kandidaten/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Fout bij opslaan: ' + msg);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!kandidaat) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/kandidaten/aanmeldingen"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <p className="text-muted-foreground">Kandidaat niet gevonden.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/kandidaten/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Intake Uitvoeren</h1>
          <p className="text-muted-foreground">
            {kandidaat.display_id} — {kandidaat.voornaam} {kandidaat.achternaam}
          </p>
        </div>
      </div>

      {/* Section progress */}
      <div className="flex gap-1">
        {SECTIONS.map((section, i) => (
          <button
            key={section}
            type="button"
            onClick={() => setCurrentSection(i)}
            className={cn(
              'flex-1 h-2 rounded-full transition-colors',
              i <= currentSection ? 'bg-primary' : 'bg-muted',
            )}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Stap {currentSection + 1} van {SECTIONS.length}: <strong>{SECTIONS[currentSection]}</strong>
      </p>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{SECTIONS[currentSection]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Section 0: Persoonlijk */}
            {currentSection === 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Voornaam *</Label>
                    <Input {...register('voornaam', { required: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Achternaam *</Label>
                    <Input {...register('achternaam', { required: true })} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Geslacht</Label>
                    <Select value={watch('geslacht') || undefined} onValueChange={(v) => setValue('geslacht', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecteer..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="man">Man</SelectItem>
                        <SelectItem value="vrouw">Vrouw</SelectItem>
                        <SelectItem value="anders">Anders</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Geboortedatum</Label>
                    <Input type="date" {...register('geboortedatum')} />
                  </div>
                </div>
              </>
            )}

            {/* Section 1: Adres */}
            {currentSection === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Straat + huisnummer</Label>
                  <Input {...register('straat')} placeholder="bijv. Afrikaanderplein 7" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Postcode</Label>
                    <Input {...register('postcode')} placeholder="bijv. 3072 EA" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ingeschreven adres (BRP)</Label>
                    <Input {...register('ingeschreven_adres_brp')} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Wijk</Label>
                    <Select value={watch('wijk') || undefined} onValueChange={(v) => setValue('wijk', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecteer wijk..." /></SelectTrigger>
                      <SelectContent>
                        {['Bloemhof','Afrikaanderwijk','Hillesluis','Katendrecht','Feijenoord','Kop van Zuid','Noordereiland','Vreewijk','Lombardijen','Oud-Charlois','Carnisse','Tarwewijk','Pendrecht','Zuidwijk','Wielewaal'].map(w => (
                          <SelectItem key={w} value={w}>{w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Gebied</Label>
                    <Select value={watch('gebied') || undefined} onValueChange={(v) => setValue('gebied', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecteer gebied..." /></SelectTrigger>
                      <SelectContent>
                        {['Feijenoord','Charlois','IJsselmonde','Hoogvliet','Centrum','Delfshaven','Noord','Kralingen-Crooswijk','Prins Alexander','Hillegersberg-Schiebroek'].map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Section 2: Contact */}
            {currentSection === 2 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Telefoon</Label>
                    <Input type="tel" {...register('telefoon')} />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" {...register('email')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contactpersoon</Label>
                  <Input {...register('contactpersoon')} placeholder="Naam + relatie (bijv. moeder, vriend)" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="whatsapp" checked={watch('whatsapp')} onCheckedChange={(v) => setValue('whatsapp', !!v)} />
                    <Label htmlFor="whatsapp">WhatsApp beschikbaar</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="eigen_vervoer" checked={watch('eigen_vervoer')} onCheckedChange={(v) => setValue('eigen_vervoer', !!v)} />
                    <Label htmlFor="eigen_vervoer">Eigen vervoer</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="rijbewijs" checked={watch('rijbewijs')} onCheckedChange={(v) => setValue('rijbewijs', !!v)} />
                    <Label htmlFor="rijbewijs">Rijbewijs</Label>
                  </div>
                </div>
              </>
            )}

            {/* Section 3: Financieel */}
            {currentSection === 3 && (
              <>
                <div className="space-y-2">
                  <Label>Uitkering(en)</Label>
                  <Input {...register('uitkering')} placeholder="bijv. Bijstand, WW (komma-gescheiden)" />
                  <p className="text-xs text-muted-foreground">Meerdere uitkeringen gescheiden met komma's</p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="toestemming" checked={watch('toestemming')} onCheckedChange={(v) => setValue('toestemming', !!v)} />
                  <Label htmlFor="toestemming">Toestemming verkregen voor gegevensverwerking</Label>
                </div>
              </>
            )}

            {/* Section 4: Gezondheid */}
            {currentSection === 4 && (
              <div className="space-y-2">
                <Label>Medische bijzonderheden</Label>
                <Textarea {...register('medische_bijzonderheden')} rows={4} placeholder="Eventuele medische bijzonderheden..." />
                <p className="text-xs text-muted-foreground">AVG-gevoelig — alleen zichtbaar voor bevoegde medewerkers</p>
              </div>
            )}

            {/* Section 5: Casemanagement */}
            {currentSection === 5 && (
              <div className="space-y-2">
                <Label>Klantmanager Jongerenloket</Label>
                <Input {...register('klantmanager')} placeholder="Naam klantmanager..." />
              </div>
            )}

            {/* Section 6: Doelen */}
            {currentSection === 6 && (
              <div className="space-y-2">
                <Label>Stip aan de horizon / Lange termijn doel</Label>
                <Textarea {...register('stip_aan_de_horizon')} rows={4} placeholder="Wat is het lange termijn doel van deze kandidaat?" />
              </div>
            )}

            {/* Section 7: Ondersteuning */}
            {currentSection === 7 && (
              <>
                <div className="space-y-2">
                  <Label>Trajecten</Label>
                  <Input {...register('trajecten')} placeholder="Lopende trajecten..." />
                </div>
                <div className="space-y-2">
                  <Label>Hulpverleners betrokken</Label>
                  <Textarea {...register('hulpverleners_betrokken')} rows={3} placeholder="Welke hulpverleners zijn betrokken?" />
                </div>
                <div className="space-y-2">
                  <Label>Afspraken / hulp</Label>
                  <Textarea {...register('afspraken_hulp')} rows={3} placeholder="Welke afspraken zijn er gemaakt?" />
                </div>
              </>
            )}

            {/* Section 8: Justitie */}
            {currentSection === 8 && (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="aanraking_justitie"
                    checked={watch('aanraking_politie_justitie')}
                    onCheckedChange={(v) => setValue('aanraking_politie_justitie', !!v)}
                  />
                  <Label htmlFor="aanraking_justitie">In aanraking geweest met politie/justitie</Label>
                </div>
                <div className="space-y-2">
                  <Label>Reden</Label>
                  <Textarea {...register('aanraking_reden')} rows={3} placeholder="Toelichting..." />
                </div>
                <div className="space-y-2">
                  <Label>Lopende zaken</Label>
                  <Textarea {...register('lopende_zaken')} rows={2} placeholder="Lopende juridische zaken..." />
                </div>
                <p className="text-xs text-muted-foreground">AVG-gevoelig — alleen zichtbaar voor bevoegde medewerkers</p>
              </>
            )}

            {/* Section 9: Werkervaring & Certificaten */}
            {currentSection === 9 && (
              <>
                <div className="space-y-2">
                  <Label>Waar heb je gewerkt?</Label>
                  <Textarea {...register('werkervaring')} rows={4} placeholder="Werkervaring beschrijving..." />
                </div>
                <div className="space-y-2">
                  <Label>Certificaten behaald</Label>
                  <Textarea {...register('certificaten_behaald')} rows={3} placeholder="Behaalde certificaten..." />
                </div>
                <div className="space-y-2">
                  <Label>Intake notities</Label>
                  <Textarea {...register('intake_notities')} rows={4} placeholder="Overige opmerkingen van de intaker..." />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
            disabled={currentSection === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Vorige
          </Button>

          {currentSection < SECTIONS.length - 1 ? (
            <Button
              type="button"
              onClick={() => setCurrentSection(currentSection + 1)}
            >
              Volgende
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={updateKandidaat.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateKandidaat.isPending ? 'Opslaan...' : 'Intake Opslaan'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
