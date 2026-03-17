import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, FileText, Loader2, Plus, Trash2, Lock, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { VoortgangStepper } from '@/components/VoortgangStepper';
import { PermissionGate } from '@/components/PermissionGate';
import { useKandidaat, useDeleteKandidaatAVG } from '@/hooks/useKandidaten';
import { useNotities, useCreateNotitie, useDeleteNotitie } from '@/hooks/useNotities';
import { GESLACHT_LABELS, RESULTAAT_LABELS } from '@/lib/constants';
import type { Geslacht, Notitie, Resultaat } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { exportIntakeRapport, exportVoortgangsRapport } from '@/lib/word';

function InfoRow({ label, value }: { label: string; value: string | null | undefined | boolean }) {
  const display = typeof value === 'boolean' ? (value ? 'Ja' : 'Nee') : (value ?? '—');
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-b-0">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm">{display}</dd>
    </div>
  );
}

const CATEGORIE_COLORS: Record<Notitie['categorie'], string> = {
  algemeen: 'bg-gray-100 text-gray-700',
  voortgang: 'bg-blue-100 text-blue-700',
  zorg: 'bg-red-100 text-red-700',
  positief: 'bg-green-100 text-green-700',
};

export default function KandidaatDetail() {
  const { id } = useParams();
  const { data: kandidaat, isLoading } = useKandidaat(id);
  const { data: notities } = useNotities(id);
  const createNotitie = useCreateNotitie();
  const deleteNotitie = useDeleteNotitie();

  // Fetch trainingen for this kandidaat
  const { data: trainingen } = useQuery({
    queryKey: ['kandidaat-trainingen', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_kandidaat_trainingen')
        .select('*, trainingsgroep:cs_trainingsgroepen(groepscode, start_datum, eind_datum, training:cs_trainingen(naam))')
        .eq('kandidaat_id', id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const navigate = useNavigate();
  const deleteKandidaatAVG = useDeleteKandidaatAVG();

  const [notitieDialogOpen, setNotitieDialogOpen] = useState(false);
  const [notitieForm, setNotitieForm] = useState({
    inhoud: '',
    categorie: 'algemeen' as Notitie['categorie'],
    is_vertrouwelijk: false,
  });

  const handleCreateNotitie = async () => {
    if (!id || !notitieForm.inhoud) return;
    try {
      await createNotitie.mutateAsync({
        kandidaat_id: id,
        inhoud: notitieForm.inhoud,
        categorie: notitieForm.categorie,
        is_vertrouwelijk: notitieForm.is_vertrouwelijk,
      });
      toast.success('Notitie toegevoegd');
      setNotitieDialogOpen(false);
      setNotitieForm({ inhoud: '', categorie: 'algemeen', is_vertrouwelijk: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Fout: ' + msg);
    }
  };

  const handleDeleteNotitie = async (notitieId: string) => {
    if (!id) return;
    if (!confirm('Weet je zeker dat je deze notitie wilt verwijderen?')) return;
    try {
      await deleteNotitie.mutateAsync({ id: notitieId, kandidaat_id: id });
      toast.success('Notitie verwijderd');
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Fout: ' + msg);
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
          <Link to="/kandidaten/overzicht"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <p className="text-muted-foreground">Kandidaat niet gevonden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/kandidaten/overzicht"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{kandidaat.voornaam} {kandidaat.achternaam}</h1>
          <p className="text-sm text-muted-foreground font-mono">{kandidaat.display_id}</p>
        </div>
      </div>

      {/* Voortgang */}
      <Card>
        <CardContent className="pt-6">
          <VoortgangStepper currentStatus={kandidaat.traject_status} size="full" />
        </CardContent>
      </Card>

      {/* Status advancement */}
      <div className="flex items-center gap-2">
        <PermissionGate roles={['admin', 'intaker']}>
          <Button asChild>
            <Link to={`/kandidaten/${id}/intake`}>
              <Edit className="mr-2 h-4 w-4" />
              Intake Uitvoeren
            </Link>
          </Button>
        </PermissionGate>
        <PermissionGate roles={['admin']}>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (!id) return;
              const confirmed = confirm(
                `⚠️ AVG VERWIJDERING\n\nAlle gegevens van ${kandidaat.voornaam} ${kandidaat.achternaam} (${kandidaat.display_id}) worden permanent verwijderd, inclusief:\n- Persoonsgegevens\n- Trainingsdeelnames\n- Aanwezigheid\n- Voortgang\n- Notities\n- Documenten\n\nDit kan NIET ongedaan worden. Doorgaan?`,
              );
              if (!confirmed) return;
              try {
                await deleteKandidaatAVG.mutateAsync(id);
                toast.success('Alle gegevens verwijderd (AVG)');
                navigate('/kandidaten/overzicht');
              } catch (err) {
                toast.error('Fout bij verwijderen');
              }
            }}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            AVG Verwijdering
          </Button>
        </PermissionGate>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="persoon">
        <TabsList>
          <TabsTrigger value="persoon">Persoonsgegevens</TabsTrigger>
          <TabsTrigger value="trainingen">Trainingen ({trainingen?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="notities">Notities ({notities?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="documenten">Documenten</TabsTrigger>
        </TabsList>

        <TabsContent value="persoon">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Persoonlijke gegevens</CardTitle></CardHeader>
              <CardContent>
                <dl>
                  <InfoRow label="Geslacht" value={kandidaat.geslacht ? GESLACHT_LABELS[kandidaat.geslacht as Geslacht] : null} />
                  <InfoRow label="Geboortedatum" value={kandidaat.geboortedatum} />
                  <InfoRow label="Geboorteplaats" value={kandidaat.geboorteplaats} />
                  <InfoRow label="BSN" value={kandidaat.bsn} />
                  <InfoRow label="Nationaliteit" value={kandidaat.nationaliteit} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Contact & Verwijzing</CardTitle></CardHeader>
              <CardContent>
                <dl>
                  <InfoRow label="Telefoon" value={kandidaat.telefoon} />
                  <InfoRow label="Email" value={kandidaat.email} />
                  <InfoRow label="Contactpersoon" value={kandidaat.contactpersoon} />
                  <InfoRow label="WhatsApp" value={kandidaat.whatsapp} />
                  <InfoRow label="Zorgverzekering" value={kandidaat.zorgverzekering} />
                  <InfoRow label="Door wie bekend" value={kandidaat.door_wie_bekend} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Adres</CardTitle></CardHeader>
              <CardContent>
                <dl>
                  <InfoRow label="Straat" value={kandidaat.straat} />
                  <InfoRow label="Postcode" value={kandidaat.postcode} />
                  <InfoRow label="Woonplaats" value={kandidaat.woonplaats} />
                  <InfoRow label="Ingeschreven adres (BRP)" value={kandidaat.ingeschreven_adres_brp} />
                  <InfoRow label="Reden geen BRP" value={kandidaat.reden_geen_brp} />
                  <InfoRow label="Wijk" value={kandidaat.wijk} />
                  <InfoRow label="Gebied" value={kandidaat.gebied} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Financieel & Vervoer</CardTitle></CardHeader>
              <CardContent>
                <dl>
                  <InfoRow label="Uitkering" value={kandidaat.uitkering?.join(', ')} />
                  <InfoRow label="Klantmanager" value={kandidaat.klantmanager} />
                  <InfoRow label="Toestemming" value={kandidaat.toestemming} />
                  <InfoRow label="Eigen vervoer" value={kandidaat.eigen_vervoer} />
                  <InfoRow label="Rijbewijs" value={kandidaat.rijbewijs} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Sector & Voorkeur</CardTitle></CardHeader>
              <CardContent>
                <dl>
                  <InfoRow label="Gewenste sector" value={kandidaat.gewenste_sector?.join(', ')} />
                  <InfoRow label="1e certificaat voorkeur" value={kandidaat.certificaat_voorkeur_1} />
                  <InfoRow label="2e certificaat voorkeur" value={kandidaat.certificaat_voorkeur_2} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Motivatie & Competenties</CardTitle></CardHeader>
              <CardContent>
                <dl>
                  <InfoRow label="Motivatie" value={kandidaat.motivatie} />
                  <InfoRow label="Demotivatie / belemmeringen" value={kandidaat.demotivatie} />
                  <InfoRow label="Stip aan de horizon" value={kandidaat.stip_aan_de_horizon} />
                  <InfoRow label="Goede eigenschappen" value={kandidaat.goede_eigenschappen} />
                  <InfoRow label="Minder goed in" value={kandidaat.minder_goed_in} />
                  <InfoRow label="Talen" value={kandidaat.talen} />
                  <InfoRow label="Hobby's" value={kandidaat.hobbys} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Thuissituatie</CardTitle></CardHeader>
              <CardContent>
                <dl>
                  <InfoRow label="Woonsituatie" value={kandidaat.woonsituatie} />
                  <InfoRow label="Kinderen" value={kandidaat.kinderen} />
                  <InfoRow label="Eerder trajecten" value={kandidaat.trajecten} />
                  <InfoRow label="Hulpverleners betrokken" value={kandidaat.hulpverleners_betrokken} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Schulden</CardTitle></CardHeader>
              <CardContent>
                <dl>
                  <InfoRow label="Heeft schulden" value={kandidaat.heeft_schulden} />
                  <InfoRow label="Reden en bedrag" value={kandidaat.schulden_reden_bedrag} />
                  <InfoRow label="Afspraken schuldhulp" value={kandidaat.schulden_afspraken} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Opleidingen</CardTitle></CardHeader>
              <CardContent>
                <dl>
                  <InfoRow label="Opleiding" value={kandidaat.opleiding} />
                  <InfoRow label="Diploma behaald" value={kandidaat.diploma_behaald} />
                  <InfoRow label="Niveau" value={kandidaat.opleiding_niveau} />
                  <InfoRow label="Reden uitval" value={kandidaat.reden_uitval} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Cursussen & Certificaten</CardTitle></CardHeader>
              <CardContent>
                <dl>
                  <InfoRow label="Cursussen gevolgd" value={kandidaat.cursussen_gevolgd} />
                  <InfoRow label="Certificaten behaald" value={kandidaat.certificaten_behaald} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Werkervaring</CardTitle></CardHeader>
              <CardContent>
                <dl>
                  <InfoRow label="Werkervaring" value={kandidaat.werkervaring} />
                  <InfoRow label="Waarom lukte het wel/niet" value={kandidaat.waarom_lukte_niet} />
                  <InfoRow label="Heeft CV" value={kandidaat.heeft_cv} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Acties & Afspraken</CardTitle></CardHeader>
              <CardContent>
                <dl>
                  <InfoRow label="Afspraken" value={kandidaat.acties_afspraken} />
                  <InfoRow label="Leefgebieden aandacht" value={kandidaat.leefgebieden_aandacht} />
                  <InfoRow label="Afspraken hulp" value={kandidaat.afspraken_hulp} />
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Trainingen Tab ── */}
        <TabsContent value="trainingen">
          <Card>
            <CardContent className="pt-6">
              {!trainingen?.length ? (
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
                  Nog niet gekoppeld aan een trainingsgroep
                </div>
              ) : (
                <div className="space-y-3">
                  {trainingen.map((t: any) => (
                    <Link
                      key={t.id}
                      to={`/trainingen/groepen/${t.trainingsgroep_id}`}
                      className="block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono font-medium">{t.trainingsgroep?.groepscode}</p>
                          <p className="text-sm text-muted-foreground">{t.trainingsgroep?.training?.naam}</p>
                        </div>
                        <Badge variant={t.resultaat === 'behaald' ? 'default' : 'secondary'}>
                          {RESULTAAT_LABELS[t.resultaat as Resultaat] ?? t.resultaat}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {t.trainingsgroep?.start_datum} — {t.trainingsgroep?.eind_datum ?? 'lopend'}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notities Tab ── */}
        <TabsContent value="notities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Notities</CardTitle>
              <PermissionGate roles={['admin', 'intaker', 'trainer']}>
                <Button size="sm" onClick={() => setNotitieDialogOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" />Nieuwe Notitie
                </Button>
              </PermissionGate>
            </CardHeader>
            <CardContent>
              {!notities?.length ? (
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
                  Nog geen notities
                </div>
              ) : (
                <div className="space-y-3">
                  {notities.map((n) => (
                    <div key={n.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORIE_COLORS[n.categorie]}`}>
                            {n.categorie}
                          </span>
                          {n.is_vertrouwelijk && (
                            <span className="flex items-center gap-1 text-xs text-orange-600">
                              <Lock className="h-3 w-3" />Vertrouwelijk
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(n.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <PermissionGate roles={['admin']}>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteNotitie(n.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </PermissionGate>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{n.inhoud}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documenten">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documenten & Exports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={async () => {
                      try {
                        await exportIntakeRapport(kandidaat);
                        toast.success('Intake rapport gedownload');
                      } catch (err) {
                        toast.error('Fout bij genereren rapport');
                      }
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4 shrink-0" />
                    <div className="text-left">
                      <div className="font-medium">Intake Rapport</div>
                      <div className="text-xs text-muted-foreground">Alle persoonsgegevens als Word document</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3"
                    disabled={!trainingen?.length}
                    onClick={async () => {
                      if (!trainingen?.length) return;
                      const t = trainingen[0] as any;
                      try {
                        // Fetch aanwezigheid & voortgang for the first training
                        const { data: aanw } = await supabase
                          .from('cs_aanwezigheid')
                          .select('datum, status')
                          .eq('kandidaat_training_id', t.id)
                          .order('datum', { ascending: true });
                        const { data: voort } = await supabase
                          .from('cs_voortgang')
                          .select('datum, type, omschrijving, behaald')
                          .eq('kandidaat_training_id', t.id)
                          .order('datum', { ascending: true });
                        await exportVoortgangsRapport({
                          kandidaat,
                          groepscode: t.trainingsgroep?.groepscode ?? '—',
                          trainingNaam: t.trainingsgroep?.training?.naam ?? '—',
                          aanwezigheid: aanw ?? [],
                          voortgang: voort ?? [],
                        });
                        toast.success('Voortgangsrapport gedownload');
                      } catch (err) {
                        toast.error('Fout bij genereren rapport');
                      }
                    }}
                  >
                    <Download className="mr-2 h-4 w-4 shrink-0" />
                    <div className="text-left">
                      <div className="font-medium">Voortgangsrapport</div>
                      <div className="text-xs text-muted-foreground">Aanwezigheid & vorderingen samenvatting</div>
                    </div>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Notitie Dialog */}
      <Dialog open={notitieDialogOpen} onOpenChange={setNotitieDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Notitie</DialogTitle>
            <DialogDescription>
              Voeg een notitie toe voor {kandidaat.voornaam} {kandidaat.achternaam}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categorie</Label>
              <Select
                value={notitieForm.categorie}
                onValueChange={(v) => setNotitieForm((f) => ({ ...f, categorie: v as Notitie['categorie'] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="algemeen">Algemeen</SelectItem>
                  <SelectItem value="voortgang">Voortgang</SelectItem>
                  <SelectItem value="zorg">Zorg</SelectItem>
                  <SelectItem value="positief">Positief</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notitie *</Label>
              <Textarea
                rows={4}
                value={notitieForm.inhoud}
                onChange={(e) => setNotitieForm((f) => ({ ...f, inhoud: e.target.value }))}
                placeholder="Schrijf je notitie..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="vertrouwelijk"
                checked={notitieForm.is_vertrouwelijk}
                onCheckedChange={(v) => setNotitieForm((f) => ({ ...f, is_vertrouwelijk: !!v }))}
              />
              <Label htmlFor="vertrouwelijk">Vertrouwelijk (alleen zichtbaar voor admin/intaker)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNotitieDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleCreateNotitie} disabled={!notitieForm.inhoud}>
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
