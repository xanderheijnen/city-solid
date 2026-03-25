import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Save, Loader2, Camera } from 'lucide-react';
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
import { IntakeOCRDialog } from '@/components/IntakeOCRDialog';

// ---------------------------------------------------------------------------
// Secties – exact volgend op het Intakedocument 2025
// ---------------------------------------------------------------------------
const SECTIONS = [
  'Persoonlijke gegevens',
  'Adres',
  'Contact & Verwijzing',
  'Financieel',
  'Sector & Voorkeur',
  'Motivatie & Competenties',
  'Thuissituatie',
  'Gezondheid & Middelen',
  'Schulden',
  'Justitieel verleden',
  'Opleidingen',
  'Cursussen & Certificaten',
  'Werkervaring',
  'Acties & Afspraken',
] as const;

const SECTOR_OPTIES = [
  'Bouw',
  'Logistiek (magazijn)',
  'Haven',
  'Schoonmaak',
  'Detailhandel',
  'Productiewerk',
  'Zorg',
  'Elektrotechniek',
  'Horeca',
  'Beveiliging',
  'Hospitality',
];

// ---------------------------------------------------------------------------
// Form interface – alle velden uit het intakedocument
// ---------------------------------------------------------------------------
interface IntakeForm {
  // Persoonlijk
  voornaam: string;
  achternaam: string;
  geslacht: string;
  geboortedatum: string;
  geboorteplaats: string;
  bsn: string;
  nationaliteit: string;

  // Adres
  straat: string;
  postcode: string;
  woonplaats: string;
  ingeschreven_adres_brp: string;
  reden_geen_brp: string;
  wijk: string;
  gebied: string;

  // Contact & verwijzing
  telefoon: string;
  email: string;
  contactpersoon: string;
  whatsapp: boolean;
  eigen_vervoer: boolean;
  rijbewijs: boolean;
  zorgverzekering: string;
  door_wie_bekend: string;

  // Financieel
  uitkering: string;
  toestemming: boolean;

  // Sector & voorkeur
  gewenste_sector: string[];
  certificaat_voorkeur_1: string;
  certificaat_voorkeur_2: string;

  // Motivatie & competenties
  motivatie: string;
  demotivatie: string;
  stip_aan_de_horizon: string;
  goede_eigenschappen: string;
  minder_goed_in: string;
  talen: string;
  hobbys: string;

  // Thuissituatie
  woonsituatie: string;
  kinderen: string;
  trajecten: string;
  hulpverleners_betrokken: string;

  // Gezondheid & middelen
  medische_bijzonderheden: string;
  middelengebruik: string;

  // Schulden
  heeft_schulden: boolean;
  schulden_reden_bedrag: string;
  schulden_afspraken: string;

  // Justitie
  aanraking_politie_justitie: boolean;
  aanraking_reden: string;
  veroordeeld_detentie: string;
  lopende_zaken: string;

  // Opleidingen
  opleiding: string;
  diploma_behaald: string;
  opleiding_niveau: string;
  reden_uitval: string;

  // Cursussen
  cursussen_gevolgd: string;
  certificaten_behaald: string;

  // Werkervaring
  werkervaring: string;
  waarom_lukte_niet: string;
  heeft_cv: boolean;

  // Acties
  acties_afspraken: string;
  leefgebieden_aandacht: string;

  // Casemanagement
  klantmanager: string;
  afspraken_hulp: string;

  // Overig
  intake_notities: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function IntakeUitvoeren() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: kandidaat, isLoading } = useKandidaat(id);
  const updateKandidaat = useUpdateKandidaat();
  const [currentSection, setCurrentSection] = useState(0);
  const [ocrOpen, setOcrOpen] = useState(false);
  const { register, handleSubmit, setValue, watch, reset, getValues } = useForm<IntakeForm>();

  const handleOCRApply = (values: Record<string, string>) => {
    for (const [key, value] of Object.entries(values)) {
      if (key in ({} as IntakeForm)) {
        // Handle booleans
        if (['whatsapp', 'eigen_vervoer', 'rijbewijs', 'toestemming', 'heeft_schulden', 'aanraking_politie_justitie', 'heeft_cv'].includes(key)) {
          const boolVal = ['ja', 'true', '1', 'yes'].includes(value.toLowerCase());
          setValue(key as keyof IntakeForm, boolVal as any);
        } else {
          setValue(key as keyof IntakeForm, value as any);
        }
      }
    }
    toast.success(`${Object.keys(values).length} velden ingevuld vanuit OCR`);
  };

  // Track selected sectors via watch
  const selectedSectors = watch('gewenste_sector') || [];

  // Pre-fill form when kandidaat loads
  useEffect(() => {
    if (!kandidaat) return;
    reset({
      voornaam: kandidaat.voornaam ?? '',
      achternaam: kandidaat.achternaam ?? '',
      geslacht: kandidaat.geslacht ?? '',
      geboortedatum: kandidaat.geboortedatum ?? '',
      geboorteplaats: kandidaat.geboorteplaats ?? '',
      bsn: kandidaat.bsn ?? '',
      nationaliteit: kandidaat.nationaliteit ?? '',
      straat: kandidaat.straat ?? '',
      postcode: kandidaat.postcode ?? '',
      woonplaats: kandidaat.woonplaats ?? 'Rotterdam',
      ingeschreven_adres_brp: kandidaat.ingeschreven_adres_brp ?? '',
      reden_geen_brp: kandidaat.reden_geen_brp ?? '',
      wijk: kandidaat.wijk ?? '',
      gebied: kandidaat.gebied ?? '',
      telefoon: kandidaat.telefoon ?? '',
      email: kandidaat.email ?? '',
      contactpersoon: kandidaat.contactpersoon ?? '',
      whatsapp: kandidaat.whatsapp ?? false,
      eigen_vervoer: kandidaat.eigen_vervoer ?? false,
      rijbewijs: kandidaat.rijbewijs ?? false,
      zorgverzekering: kandidaat.zorgverzekering ?? '',
      door_wie_bekend: kandidaat.door_wie_bekend ?? '',
      uitkering: kandidaat.uitkering?.join(', ') ?? '',
      toestemming: kandidaat.toestemming ?? false,
      gewenste_sector: kandidaat.gewenste_sector ?? [],
      certificaat_voorkeur_1: kandidaat.certificaat_voorkeur_1 ?? '',
      certificaat_voorkeur_2: kandidaat.certificaat_voorkeur_2 ?? '',
      motivatie: kandidaat.motivatie ?? '',
      demotivatie: kandidaat.demotivatie ?? '',
      stip_aan_de_horizon: kandidaat.stip_aan_de_horizon ?? '',
      goede_eigenschappen: kandidaat.goede_eigenschappen ?? '',
      minder_goed_in: kandidaat.minder_goed_in ?? '',
      talen: kandidaat.talen ?? '',
      hobbys: kandidaat.hobbys ?? '',
      woonsituatie: kandidaat.woonsituatie ?? '',
      kinderen: kandidaat.kinderen ?? '',
      trajecten: kandidaat.trajecten ?? '',
      hulpverleners_betrokken: kandidaat.hulpverleners_betrokken ?? '',
      medische_bijzonderheden: kandidaat.medische_bijzonderheden ?? '',
      middelengebruik: kandidaat.middelengebruik ?? '',
      heeft_schulden: kandidaat.heeft_schulden ?? false,
      schulden_reden_bedrag: kandidaat.schulden_reden_bedrag ?? '',
      schulden_afspraken: kandidaat.schulden_afspraken ?? '',
      aanraking_politie_justitie: kandidaat.aanraking_politie_justitie ?? false,
      aanraking_reden: kandidaat.aanraking_reden ?? '',
      veroordeeld_detentie: kandidaat.veroordeeld_detentie ?? '',
      lopende_zaken: kandidaat.lopende_zaken ?? '',
      opleiding: kandidaat.opleiding ?? '',
      diploma_behaald: kandidaat.diploma_behaald ?? '',
      opleiding_niveau: kandidaat.opleiding_niveau ?? '',
      reden_uitval: kandidaat.reden_uitval ?? '',
      cursussen_gevolgd: kandidaat.cursussen_gevolgd ?? '',
      certificaten_behaald: kandidaat.certificaten_behaald ?? '',
      werkervaring: kandidaat.werkervaring ?? '',
      waarom_lukte_niet: kandidaat.waarom_lukte_niet ?? '',
      heeft_cv: kandidaat.heeft_cv ?? false,
      acties_afspraken: kandidaat.acties_afspraken ?? '',
      leefgebieden_aandacht: kandidaat.leefgebieden_aandacht ?? '',
      klantmanager: kandidaat.klantmanager ?? '',
      afspraken_hulp: kandidaat.afspraken_hulp ?? '',
      intake_notities: kandidaat.intake_notities ?? '',
    });
  }, [kandidaat, reset]);

  const toggleSector = (sector: string) => {
    const current = watch('gewenste_sector') || [];
    if (current.includes(sector)) {
      setValue('gewenste_sector', current.filter((s) => s !== sector));
    } else {
      setValue('gewenste_sector', [...current, sector]);
    }
  };

  const onSubmit = async (data: IntakeForm) => {
    if (!id) return;
    try {
      const now = new Date().toISOString().split('T')[0];
      await updateKandidaat.mutateAsync({
        id,
        // Persoonlijk
        voornaam: data.voornaam,
        achternaam: data.achternaam,
        geslacht: data.geslacht || null,
        geboortedatum: data.geboortedatum || null,
        geboorteplaats: data.geboorteplaats || null,
        bsn: data.bsn || null,
        nationaliteit: data.nationaliteit || null,
        // Adres
        straat: data.straat || null,
        postcode: data.postcode || null,
        woonplaats: data.woonplaats || null,
        ingeschreven_adres_brp: data.ingeschreven_adres_brp || null,
        reden_geen_brp: data.reden_geen_brp || null,
        wijk: data.wijk || null,
        gebied: data.gebied || null,
        // Contact
        telefoon: data.telefoon || null,
        email: data.email || null,
        contactpersoon: data.contactpersoon || null,
        whatsapp: data.whatsapp,
        eigen_vervoer: data.eigen_vervoer,
        rijbewijs: data.rijbewijs,
        zorgverzekering: data.zorgverzekering || null,
        door_wie_bekend: data.door_wie_bekend || null,
        // Financieel
        uitkering: data.uitkering ? data.uitkering.split(',').map(s => s.trim()).filter(Boolean) : null,
        toestemming: data.toestemming,
        // Sector
        gewenste_sector: data.gewenste_sector?.length ? data.gewenste_sector : null,
        certificaat_voorkeur_1: data.certificaat_voorkeur_1 || null,
        certificaat_voorkeur_2: data.certificaat_voorkeur_2 || null,
        // Motivatie
        motivatie: data.motivatie || null,
        demotivatie: data.demotivatie || null,
        stip_aan_de_horizon: data.stip_aan_de_horizon || null,
        goede_eigenschappen: data.goede_eigenschappen || null,
        minder_goed_in: data.minder_goed_in || null,
        talen: data.talen || null,
        hobbys: data.hobbys || null,
        // Thuissituatie
        woonsituatie: data.woonsituatie || null,
        kinderen: data.kinderen || null,
        trajecten: data.trajecten || null,
        hulpverleners_betrokken: data.hulpverleners_betrokken || null,
        // Gezondheid & middelen
        medische_bijzonderheden: data.medische_bijzonderheden || null,
        middelengebruik: data.middelengebruik || null,
        // Schulden
        heeft_schulden: data.heeft_schulden,
        schulden_reden_bedrag: data.schulden_reden_bedrag || null,
        schulden_afspraken: data.schulden_afspraken || null,
        // Justitie
        aanraking_politie_justitie: data.aanraking_politie_justitie,
        aanraking_reden: data.aanraking_reden || null,
        veroordeeld_detentie: data.veroordeeld_detentie || null,
        lopende_zaken: data.lopende_zaken || null,
        // Opleidingen
        opleiding: data.opleiding || null,
        diploma_behaald: data.diploma_behaald || null,
        opleiding_niveau: data.opleiding_niveau || null,
        reden_uitval: data.reden_uitval || null,
        // Cursussen
        cursussen_gevolgd: data.cursussen_gevolgd || null,
        certificaten_behaald: data.certificaten_behaald || null,
        // Werkervaring
        werkervaring: data.werkervaring || null,
        waarom_lukte_niet: data.waarom_lukte_niet || null,
        heeft_cv: data.heeft_cv,
        // Acties
        acties_afspraken: data.acties_afspraken || null,
        leefgebieden_aandacht: data.leefgebieden_aandacht || null,
        // Casemanagement
        klantmanager: data.klantmanager || null,
        afspraken_hulp: data.afspraken_hulp || null,
        // Overig
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
      <div className="flex items-center justify-between">
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
        <Button variant="outline" onClick={() => setOcrOpen(true)}>
          <Camera className="mr-2 h-4 w-4" />
          Formulier scannen
        </Button>
      </div>

      <IntakeOCRDialog
        open={ocrOpen}
        onOpenChange={setOcrOpen}
        currentValues={getValues()}
        onApply={handleOCRApply}
      />

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

            {/* ── 0: Persoonlijke gegevens ── */}
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
                    <Label>Geboortedatum</Label>
                    <Input type="date" {...register('geboortedatum')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Geboorteplaats</Label>
                    <Input {...register('geboorteplaats')} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>BSN</Label>
                    <Input {...register('bsn')} placeholder="123456789" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nationaliteit</Label>
                    <Input {...register('nationaliteit')} />
                  </div>
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
                </div>
              </>
            )}

            {/* ── 1: Adres ── */}
            {currentSection === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Straat + huisnummer</Label>
                  <Input {...register('straat')} placeholder="bijv. Afrikaanderplein 7" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Postcode</Label>
                    <Input {...register('postcode')} placeholder="bijv. 3072 EA" />
                  </div>
                  <div className="space-y-2">
                    <Label>Woonplaats</Label>
                    <Input {...register('woonplaats')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ingeschreven adres (BRP)</Label>
                    <Input {...register('ingeschreven_adres_brp')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reden indien geen BRP / ander adres</Label>
                  <Input {...register('reden_geen_brp')} />
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

            {/* ── 2: Contact & Verwijzing ── */}
            {currentSection === 2 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Mobiel nummer</Label>
                    <Input type="tel" {...register('telefoon')} />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mailadres</Label>
                    <Input type="email" {...register('email')} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Contactpersoon</Label>
                    <Input {...register('contactpersoon')} placeholder="Naam + relatie (bijv. moeder, vriend)" />
                  </div>
                  <div className="space-y-2">
                    <Label>Zorgverzekering</Label>
                    <Input {...register('zorgverzekering')} />
                  </div>
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
                <div className="space-y-2">
                  <Label>Door wie weet je van ons bestaan?</Label>
                  <Textarea {...register('door_wie_bekend')} rows={3} placeholder="Naam, organisatie, afdeling, contactinfo..." />
                </div>
              </>
            )}

            {/* ── 3: Financieel ── */}
            {currentSection === 3 && (
              <>
                <div className="space-y-2">
                  <Label>Uitkering (Ja/Nee)</Label>
                  <Input {...register('uitkering')} placeholder="bijv. Bijstand, WW (komma-gescheiden)" />
                  <p className="text-xs text-muted-foreground">Type uitkering, meerdere gescheiden met komma's</p>
                </div>
                <div className="space-y-2">
                  <Label>Klantmanager / Contactpersoon</Label>
                  <Input {...register('klantmanager')} placeholder="Naam klantmanager..." />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="toestemming" checked={watch('toestemming')} onCheckedChange={(v) => setValue('toestemming', !!v)} />
                  <Label htmlFor="toestemming">Toestemming verkregen voor gegevensverwerking</Label>
                </div>
              </>
            )}

            {/* ── 4: Sector & Voorkeur ── */}
            {currentSection === 4 && (
              <>
                <div className="space-y-2">
                  <Label>Welke sector wil je werken?</Label>
                  <p className="text-xs text-muted-foreground">Selecteer een of meerdere sectoren</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {SECTOR_OPTIES.map((sector) => (
                      <div key={sector} className="flex items-center gap-2">
                        <Checkbox
                          id={`sector-${sector}`}
                          checked={selectedSectors.includes(sector)}
                          onCheckedChange={() => toggleSector(sector)}
                        />
                        <Label htmlFor={`sector-${sector}`} className="text-sm">{sector}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>1e certificaat (voorkeur)</Label>
                    <Input {...register('certificaat_voorkeur_1')} />
                  </div>
                  <div className="space-y-2">
                    <Label>2e certificaat (voorkeur)</Label>
                    <Input {...register('certificaat_voorkeur_2')} />
                  </div>
                </div>
              </>
            )}

            {/* ── 5: Motivatie & Competenties ── */}
            {currentSection === 5 && (
              <>
                <div className="space-y-2">
                  <Label>Wat stimuleert/motiveert jou?</Label>
                  <Textarea {...register('motivatie')} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Wat demotiveert jou? Wat zijn belemmeringen?</Label>
                  <Textarea {...register('demotivatie')} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Wat is je stip aan de horizon? (lange termijn doel)</Label>
                  <Textarea {...register('stip_aan_de_horizon')} rows={3} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Wat zijn je goede eigenschappen?</Label>
                    <Textarea {...register('goede_eigenschappen')} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Waar ben je minder goed in?</Label>
                    <Textarea {...register('minder_goed_in')} rows={3} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Welke talen spreek je?</Label>
                    <Input {...register('talen')} placeholder="bijv. Nederlands, Arabisch, Engels" />
                  </div>
                  <div className="space-y-2">
                    <Label>Wat zijn je hobby's?</Label>
                    <Input {...register('hobbys')} />
                  </div>
                </div>
              </>
            )}

            {/* ── 6: Thuissituatie ── */}
            {currentSection === 6 && (
              <>
                <div className="space-y-2">
                  <Label>Woonsituatie</Label>
                  <Textarea {...register('woonsituatie')} rows={3} placeholder="Beschrijf de woonsituatie..." />
                </div>
                <div className="space-y-2">
                  <Label>Kinderen</Label>
                  <Input {...register('kinderen')} placeholder="bijv. 2 kinderen (4 en 7 jaar)" />
                </div>
                <div className="space-y-2">
                  <Label>Eerder al aan trajecten deelgenomen? Zo ja, welke?</Label>
                  <Textarea {...register('trajecten')} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Welke hulpverleners zijn er momenteel betrokken?</Label>
                  <Textarea {...register('hulpverleners_betrokken')} rows={3} />
                </div>
              </>
            )}

            {/* ── 7: Gezondheid & Middelengebruik ── */}
            {currentSection === 7 && (
              <>
                <div className="space-y-2">
                  <Label>Medische bijzonderheden</Label>
                  <Textarea {...register('medische_bijzonderheden')} rows={4} placeholder="Eventuele medische bijzonderheden..." />
                  <p className="text-xs text-muted-foreground">AVG-gevoelig — alleen zichtbaar voor bevoegde medewerkers</p>
                </div>
                <div className="space-y-2">
                  <Label>Speelt drugs of alcohol een rol in je leven?</Label>
                  <Textarea {...register('middelengebruik')} rows={3} placeholder="Beschrijf indien van toepassing..." />
                  <p className="text-xs text-muted-foreground">AVG-gevoelig — alleen zichtbaar voor bevoegde medewerkers</p>
                </div>
              </>
            )}

            {/* ── 8: Schulden ── */}
            {currentSection === 8 && (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="heeft_schulden"
                    checked={watch('heeft_schulden')}
                    onCheckedChange={(v) => setValue('heeft_schulden', !!v)}
                  />
                  <Label htmlFor="heeft_schulden">Heb je schulden?</Label>
                </div>
                <div className="space-y-2">
                  <Label>Reden en bedrag</Label>
                  <Textarea {...register('schulden_reden_bedrag')} rows={3} placeholder="Beschrijf de schulden, reden en eventueel bedrag..." />
                </div>
                <div className="space-y-2">
                  <Label>Afspraken / hulp</Label>
                  <Textarea {...register('schulden_afspraken')} rows={3} placeholder="Welke afspraken zijn er gemaakt? Schuldhulpverlening?" />
                </div>
              </>
            )}

            {/* ── 9: Justitieel verleden ── */}
            {currentSection === 9 && (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="aanraking_justitie"
                    checked={watch('aanraking_politie_justitie')}
                    onCheckedChange={(v) => setValue('aanraking_politie_justitie', !!v)}
                  />
                  <Label htmlFor="aanraking_justitie">Ben je in aanraking geweest met politie en/of justitie?</Label>
                </div>
                <div className="space-y-2">
                  <Label>Reden</Label>
                  <Textarea {...register('aanraking_reden')} rows={3} placeholder="Toelichting..." />
                </div>
                <div className="space-y-2">
                  <Label>Veroordeeld voor een feit of in detentie geweest?</Label>
                  <Textarea {...register('veroordeeld_detentie')} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Zijn er nog lopende zaken?</Label>
                  <Textarea {...register('lopende_zaken')} rows={2} />
                </div>
                <p className="text-xs text-muted-foreground">AVG-gevoelig — alleen zichtbaar voor bevoegde medewerkers</p>
              </>
            )}

            {/* ── 10: Opleidingen ── */}
            {currentSection === 10 && (
              <>
                <div className="space-y-2">
                  <Label>Middelbare & vervolgonderwijs</Label>
                  <Textarea {...register('opleiding')} rows={3} placeholder="Welke opleiding(en) heb je gevolgd?" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Diploma behaald?</Label>
                    <Input {...register('diploma_behaald')} placeholder="Ja/Nee + welk diploma" />
                  </div>
                  <div className="space-y-2">
                    <Label>Niveau</Label>
                    <Input {...register('opleiding_niveau')} placeholder="bijv. VMBO, MBO-2, HBO" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reden uitval</Label>
                  <Textarea {...register('reden_uitval')} rows={2} placeholder="Waarom gestopt met opleiding?" />
                </div>
              </>
            )}

            {/* ── 11: Cursussen & Certificaten ── */}
            {currentSection === 11 && (
              <>
                <div className="space-y-2">
                  <Label>Cursussen gevolgd</Label>
                  <Textarea {...register('cursussen_gevolgd')} rows={3} placeholder="Welke cursussen heb je gevolgd?" />
                </div>
                <div className="space-y-2">
                  <Label>Certificaten behaald</Label>
                  <Textarea {...register('certificaten_behaald')} rows={3} placeholder="Welke certificaten heb je behaald?" />
                </div>
              </>
            )}

            {/* ── 12: Werkervaring ── */}
            {currentSection === 12 && (
              <>
                <div className="space-y-2">
                  <Label>Waar heb je gewerkt?</Label>
                  <Textarea {...register('werkervaring')} rows={4} placeholder="Beschrijf je werkervaring..." />
                </div>
                <div className="space-y-2">
                  <Label>Waarom lukte het wel/niet?</Label>
                  <Textarea {...register('waarom_lukte_niet')} rows={3} />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="heeft_cv"
                    checked={watch('heeft_cv')}
                    onCheckedChange={(v) => setValue('heeft_cv', !!v)}
                  />
                  <Label htmlFor="heeft_cv">Heb je een CV?</Label>
                </div>
              </>
            )}

            {/* ── 13: Acties deelnemer & coach ── */}
            {currentSection === 13 && (
              <>
                <div className="space-y-2">
                  <Label>Afspraken</Label>
                  <Textarea {...register('acties_afspraken')} rows={4} placeholder="Welke afspraken zijn er gemaakt?" />
                </div>
                <div className="space-y-2">
                  <Label>Leefgebieden waar aandacht voor moet zijn</Label>
                  <Textarea {...register('leefgebieden_aandacht')} rows={4} placeholder="Bijv. huisvesting, financien, gezondheid, sociaal netwerk..." />
                </div>
                <div className="space-y-2">
                  <Label>Afspraken hulpverlening</Label>
                  <Textarea {...register('afspraken_hulp')} rows={3} placeholder="Welke afspraken met hulpverleners?" />
                </div>
                <div className="space-y-2">
                  <Label>Overige intake notities</Label>
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
