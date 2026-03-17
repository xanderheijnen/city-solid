import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, FileText, Loader2, Plus, Trash2, Lock, Download, Award, CheckCircle2, Clock, XCircle, UserMinus, CalendarPlus, Upload, Camera, CreditCard, File, LogOut, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { useKandidaat, useUpdateKandidaat, useDeleteKandidaatAVG, useUpdateTrajectStatus } from '@/hooks/useKandidaten';
import { useNotities, useCreateNotitie, useDeleteNotitie } from '@/hooks/useNotities';
import { useTrainingsgroepen } from '@/hooks/useTrainingen';
import { useFileUpload } from '@/hooks/useFileUpload';
import { GESLACHT_LABELS, RESULTAAT_LABELS } from '@/lib/constants';
import type { Geslacht, Notitie, Resultaat } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

  // Fetch certificaten (voortgang entries with type 'certificaat') for this kandidaat
  const { data: certificaten } = useQuery({
    queryKey: ['kandidaat-certificaten', id],
    queryFn: async () => {
      // First get all kandidaat_training IDs
      const { data: kts, error: ktErr } = await supabase
        .from('cs_kandidaat_trainingen')
        .select('id, trainingsgroep:cs_trainingsgroepen(groepscode, training:cs_trainingen(naam))')
        .eq('kandidaat_id', id!);
      if (ktErr) throw ktErr;
      if (!kts?.length) return [];

      const ktIds = kts.map((kt: any) => kt.id);
      const ktMap = Object.fromEntries(kts.map((kt: any) => [kt.id, kt]));

      const { data, error } = await supabase
        .from('cs_voortgang')
        .select('*')
        .in('kandidaat_training_id', ktIds)
        .eq('type', 'certificaat')
        .order('datum', { ascending: false });

      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        ...c,
        groepscode: ktMap[c.kandidaat_training_id]?.trainingsgroep?.groepscode ?? '—',
        trainingNaam: ktMap[c.kandidaat_training_id]?.trainingsgroep?.training?.naam ?? '—',
      }));
    },
    enabled: !!id,
  });

  // Fetch uitstroom updates
  const { data: uitstroomUpdates } = useQuery({
    queryKey: ['uitstroom-updates', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_uitstroom_updates')
        .select('*')
        .eq('kandidaat_id', id!)
        .order('datum', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const navigate = useNavigate();
  const deleteKandidaatAVG = useDeleteKandidaatAVG();
  const queryClient = useQueryClient();
  const { data: alleGroepen } = useTrainingsgroepen();

  // ── Uitstroom ──
  const [uitstroomDialogOpen, setUitstroomDialogOpen] = useState(false);
  const [uitstroomForm, setUitstroomForm] = useState({
    datum: new Date().toISOString().split('T')[0],
    tijd: '',
    inhoud: '',
  });

  const handleSaveUitstroomStatus = async (status: string) => {
    if (!id) return;
    try {
      await updateKandidaat.mutateAsync({ id, uitstroom_status: status });
      toast.success('Uitstroom status bijgewerkt');
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Fout: ' + msg);
    }
  };

  const handleAddUitstroomUpdate = async () => {
    if (!id || !uitstroomForm.inhoud) return;
    try {
      const { error } = await supabase.from('cs_uitstroom_updates').insert({
        kandidaat_id: id,
        datum: uitstroomForm.datum,
        tijd: uitstroomForm.tijd || null,
        inhoud: uitstroomForm.inhoud,
      });
      if (error) throw error;
      toast.success('Gespreksupdate toegevoegd');
      queryClient.invalidateQueries({ queryKey: ['uitstroom-updates', id] });
      setUitstroomDialogOpen(false);
      setUitstroomForm({ datum: new Date().toISOString().split('T')[0], tijd: '', inhoud: '' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Fout: ' + msg);
    }
  };

  const handleDeleteUitstroomUpdate = async (updateId: string) => {
    if (!confirm('Weet je zeker dat je deze update wilt verwijderen?')) return;
    try {
      const { error } = await supabase.from('cs_uitstroom_updates').delete().eq('id', updateId);
      if (error) throw error;
      toast.success('Update verwijderd');
      queryClient.invalidateQueries({ queryKey: ['uitstroom-updates', id] });
    } catch (err) {
      toast.error('Fout bij verwijderen');
    }
  };

  // ── Training toevoegen ──
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [selectedGroepId, setSelectedGroepId] = useState('');
  const [addingTraining, setAddingTraining] = useState(false);

  const handleAddTraining = async () => {
    if (!id || !selectedGroepId) return;
    setAddingTraining(true);
    try {
      const { error } = await supabase
        .from('cs_kandidaat_trainingen')
        .insert({ kandidaat_id: id, trainingsgroep_id: selectedGroepId });
      if (error) throw error;
      toast.success('Training gekoppeld');
      queryClient.invalidateQueries({ queryKey: ['kandidaat-trainingen', id] });
      setTrainingDialogOpen(false);
      setSelectedGroepId('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Fout: ' + msg);
    } finally {
      setAddingTraining(false);
    }
  };

  const handleRemoveTraining = async (ktId: string) => {
    if (!confirm('Weet je zeker dat je deze training wilt ontkoppelen? Bijbehorende voortgang en aanwezigheid worden ook verwijderd.')) return;
    try {
      // Delete voortgang & aanwezigheid first
      await supabase.from('cs_voortgang').delete().eq('kandidaat_training_id', ktId);
      await supabase.from('cs_aanwezigheid').delete().eq('kandidaat_training_id', ktId);
      const { error } = await supabase.from('cs_kandidaat_trainingen').delete().eq('id', ktId);
      if (error) throw error;
      toast.success('Training ontkoppeld');
      queryClient.invalidateQueries({ queryKey: ['kandidaat-trainingen', id] });
      queryClient.invalidateQueries({ queryKey: ['kandidaat-certificaten', id] });
    } catch (err) {
      toast.error('Fout bij ontkoppelen');
    }
  };

  // ── Certificaat toevoegen ──
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [certForm, setCertForm] = useState({
    kandidaat_training_id: '',
    omschrijving: '',
    datum: new Date().toISOString().split('T')[0],
    behaald: true,
    score: '',
  });
  const [addingCert, setAddingCert] = useState(false);

  const handleAddCertificaat = async () => {
    if (!certForm.kandidaat_training_id || !certForm.omschrijving) return;
    setAddingCert(true);
    try {
      const { error } = await supabase.from('cs_voortgang').insert({
        kandidaat_training_id: certForm.kandidaat_training_id,
        omschrijving: certForm.omschrijving,
        datum: certForm.datum,
        type: 'certificaat',
        behaald: certForm.behaald,
        score: certForm.score ? parseFloat(certForm.score) : null,
      });
      if (error) throw error;
      toast.success('Certificaat geregistreerd');
      queryClient.invalidateQueries({ queryKey: ['kandidaat-certificaten', id] });
      setCertDialogOpen(false);
      setCertForm({ kandidaat_training_id: '', omschrijving: '', datum: new Date().toISOString().split('T')[0], behaald: true, score: '' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Fout: ' + msg);
    } finally {
      setAddingCert(false);
    }
  };

  const handleDeleteCertificaat = async (certId: string) => {
    if (!confirm('Weet je zeker dat je dit certificaat wilt verwijderen?')) return;
    try {
      const { error } = await supabase.from('cs_voortgang').delete().eq('id', certId);
      if (error) throw error;
      toast.success('Certificaat verwijderd');
      queryClient.invalidateQueries({ queryKey: ['kandidaat-certificaten', id] });
    } catch (err) {
      toast.error('Fout bij verwijderen');
    }
  };

  // ── Intake inplannen ──
  const updateKandidaat = useUpdateKandidaat();
  const updateTrajectStatus = useUpdateTrajectStatus();
  const [intakeDialogOpen, setIntakeDialogOpen] = useState(false);
  const [intakeForm, setIntakeForm] = useState({
    datum: '',
    tijd: '',
  });

  const openIntakeDialog = () => {
    setIntakeForm({
      datum: kandidaat?.intake_datum ?? new Date().toISOString().split('T')[0],
      tijd: kandidaat?.intake_tijd ?? '10:00',
    });
    setIntakeDialogOpen(true);
  };

  const handlePlanIntake = async () => {
    if (!id || !intakeForm.datum || !intakeForm.tijd) return;
    try {
      await updateKandidaat.mutateAsync({
        id,
        intake_datum: intakeForm.datum,
        intake_tijd: intakeForm.tijd,
      });
      // Als status nog 'aanmelding' is, zet naar 'intake_gepland'
      if (kandidaat?.traject_status === 'aanmelding') {
        await updateTrajectStatus.mutateAsync({ id, traject_status: 'intake_gepland' });
      }
      toast.success('Intake ingepland');
      setIntakeDialogOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Fout: ' + msg);
    }
  };

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

  // ── File uploads ──
  const { upload: uploadFile, uploading: fileUploading } = useFileUpload();
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const idScanInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, folder: 'foto' | 'id-scan' | 'cv', fieldName: 'foto_url' | 'id_scan_url' | 'cv_url') => {
    if (!id) return;
    try {
      const result = await uploadFile(file, id, folder);
      await updateKandidaat.mutateAsync({ id, [fieldName]: result.path });
      toast.success(
        folder === 'foto' ? 'Foto geüpload' :
        folder === 'id-scan' ? 'ID scan geüpload' :
        'CV geüpload'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Upload fout: ' + msg);
    }
  };

  const handleRemoveFile = async (fieldName: 'foto_url' | 'id_scan_url' | 'cv_url') => {
    if (!id) return;
    try {
      await updateKandidaat.mutateAsync({ id, [fieldName]: null });
      toast.success('Bestand verwijderd');
    } catch (err) {
      toast.error('Fout bij verwijderen');
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
        {/* Foto */}
        <div
          className="relative h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-muted-foreground/20 cursor-pointer group shrink-0"
          onClick={() => fotoInputRef.current?.click()}
          title="Klik om foto te uploaden"
        >
          {kandidaat.foto_url ? (
            <img
              src={kandidaat.foto_url}
              alt={`${kandidaat.voornaam} ${kandidaat.achternaam}`}
              className="h-full w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <Camera className="h-6 w-6 text-muted-foreground" />
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Upload className="h-5 w-5 text-white" />
          </div>
          <input
            ref={fotoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'foto', 'foto_url');
              e.target.value = '';
            }}
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{kandidaat.voornaam} {kandidaat.achternaam}</h1>
          <p className="text-sm text-muted-foreground font-mono">{kandidaat.display_id}</p>
          <div className="flex items-center gap-2 mt-1">
            {kandidaat.id_scan_url && (
              <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-xs">
                <CreditCard className="mr-1 h-3 w-3" />ID gescand
              </Badge>
            )}
            {kandidaat.cv_url && (
              <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 text-xs">
                <File className="mr-1 h-3 w-3" />CV aanwezig
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Voortgang */}
      <Card>
        <CardContent className="pt-6">
          <VoortgangStepper currentStatus={kandidaat.traject_status} size="full" idGescand={!!kandidaat.id_scan_url} cvAanwezig={!!kandidaat.cv_url} />
        </CardContent>
      </Card>

      {/* Intake afspraak info */}
      {kandidaat.intake_datum && kandidaat.intake_tijd && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-3 flex items-center gap-3">
            <CalendarPlus className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="text-sm">
              <span className="font-medium">Intake gepland:</span>{' '}
              {new Date(kandidaat.intake_datum).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' om '}
              <span className="font-semibold">{kandidaat.intake_tijd}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status advancement */}
      <div className="flex items-center gap-2 flex-wrap">
        <PermissionGate roles={['admin', 'intaker']}>
          <Button variant="outline" onClick={openIntakeDialog}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Intake Inplannen
          </Button>
        </PermissionGate>
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
          <TabsTrigger value="certificaten">
            <Award className="mr-1 h-4 w-4" />Certificaten ({certificaten?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="notities">Notities ({notities?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="documenten">Documenten</TabsTrigger>
          <TabsTrigger value="uitstroom">
            <LogOut className="mr-1 h-4 w-4" />Uitstroom
          </TabsTrigger>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Trainingen</CardTitle>
              <PermissionGate roles={['admin', 'intaker', 'trainer']}>
                <Button size="sm" onClick={() => setTrainingDialogOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" />Training Toevoegen
                </Button>
              </PermissionGate>
            </CardHeader>
            <CardContent>
              {!trainingen?.length ? (
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
                  Nog niet gekoppeld aan een trainingsgroep
                </div>
              ) : (
                <div className="space-y-3">
                  {trainingen.map((t: any) => (
                    <div key={t.id} className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <Link to={`/trainingen/groepen/${t.trainingsgroep_id}`} className="flex-1">
                          <p className="font-mono font-medium">{t.trainingsgroep?.groepscode}</p>
                          <p className="text-sm text-muted-foreground">{t.trainingsgroep?.training?.naam}</p>
                        </Link>
                        <div className="flex items-center gap-2">
                          <Badge variant={t.resultaat === 'behaald' ? 'default' : 'secondary'}>
                            {RESULTAAT_LABELS[t.resultaat as Resultaat] ?? t.resultaat}
                          </Badge>
                          <PermissionGate roles={['admin']}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveTraining(t.id)}>
                              <UserMinus className="h-4 w-4 text-destructive" />
                            </Button>
                          </PermissionGate>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {t.trainingsgroep?.start_datum} — {t.trainingsgroep?.eind_datum ?? 'lopend'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Certificaten Tab ── */}
        <TabsContent value="certificaten">
          <div className="space-y-6">
            {/* Voorkeurscertificaten uit intake */}
            {(kandidaat.certificaat_voorkeur_1 || kandidaat.certificaat_voorkeur_2 || kandidaat.certificaten_behaald) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Intake — Certificaatvoorkeuren</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl>
                    <InfoRow label="1e voorkeur" value={kandidaat.certificaat_voorkeur_1} />
                    <InfoRow label="2e voorkeur" value={kandidaat.certificaat_voorkeur_2} />
                    <InfoRow label="Eerder behaald" value={kandidaat.certificaten_behaald} />
                  </dl>
                </CardContent>
              </Card>
            )}

            {/* Behaalde certificaten uit trainingen */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Behaalde Certificaten</CardTitle>
                <PermissionGate roles={['admin', 'intaker', 'trainer']}>
                  <Button
                    size="sm"
                    onClick={() => setCertDialogOpen(true)}
                    disabled={!trainingen?.length}
                  >
                    <Plus className="mr-1 h-4 w-4" />Certificaat Toekennen
                  </Button>
                </PermissionGate>
              </CardHeader>
              <CardContent>
                {!trainingen?.length ? (
                  <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
                    Koppel eerst een training om certificaten toe te kennen
                  </div>
                ) : !certificaten?.length ? (
                  <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
                    Nog geen certificaten behaald in trainingen
                  </div>
                ) : (
                  <div className="space-y-3">
                    {certificaten.map((cert: any) => (
                      <div key={cert.id} className="flex items-start gap-4 rounded-lg border p-4">
                        <div className={`mt-0.5 rounded-full p-2 ${cert.behaald ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {cert.behaald ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{cert.omschrijving}</span>
                            <Badge variant={cert.behaald ? 'default' : 'secondary'}>
                              {cert.behaald ? 'Behaald' : 'Niet behaald'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span>Groep: {cert.groepscode}</span>
                            <span className="mx-2">•</span>
                            <span>Training: {cert.trainingNaam}</span>
                            <span className="mx-2">•</span>
                            <span>Datum: {new Date(cert.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          </div>
                          {cert.score != null && (
                            <div className="mt-1 text-sm">
                              Score: <span className="font-semibold">{cert.score}</span>
                            </div>
                          )}
                        </div>
                        <PermissionGate roles={['admin']}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleDeleteCertificaat(cert.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </PermissionGate>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
          <div className="space-y-6">
            {/* Bestanden uploaden */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bestanden</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Foto */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Camera className="h-4 w-4" />Pasfoto
                    </div>
                    {kandidaat.foto_url ? (
                      <div className="space-y-2">
                        <div className="h-32 w-full rounded-lg bg-muted overflow-hidden">
                          <img src={kandidaat.foto_url} alt="Foto" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => fotoInputRef.current?.click()}>
                            Vervangen
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveFile('foto_url')}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-colors"
                        onClick={() => fotoInputRef.current?.click()}
                      >
                        <div className="text-center text-muted-foreground">
                          <Upload className="mx-auto h-6 w-6 mb-1" />
                          <span className="text-xs">Upload foto</span>
                        </div>
                      </div>
                    )}
                    <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'foto', 'foto_url'); e.target.value = ''; }} />
                  </div>

                  {/* ID Scan */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <CreditCard className="h-4 w-4" />ID Scan
                    </div>
                    {kandidaat.id_scan_url ? (
                      <div className="space-y-2">
                        <div className="flex h-32 items-center justify-center rounded-lg bg-green-50 border border-green-200">
                          <div className="text-center">
                            <CheckCircle2 className="mx-auto h-8 w-8 text-green-600 mb-1" />
                            <span className="text-xs text-green-700 font-medium">ID gescand</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => idScanInputRef.current?.click()}>
                            Vervangen
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveFile('id_scan_url')}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-colors"
                        onClick={() => idScanInputRef.current?.click()}
                      >
                        <div className="text-center text-muted-foreground">
                          <Upload className="mx-auto h-6 w-6 mb-1" />
                          <span className="text-xs">Upload ID scan</span>
                        </div>
                      </div>
                    )}
                    <input ref={idScanInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'id-scan', 'id_scan_url'); e.target.value = ''; }} />
                  </div>

                  {/* CV */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <File className="h-4 w-4" />CV
                    </div>
                    {kandidaat.cv_url ? (
                      <div className="space-y-2">
                        <div className="flex h-32 items-center justify-center rounded-lg bg-blue-50 border border-blue-200">
                          <div className="text-center">
                            <CheckCircle2 className="mx-auto h-8 w-8 text-blue-600 mb-1" />
                            <span className="text-xs text-blue-700 font-medium">CV aanwezig</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => cvInputRef.current?.click()}>
                            Vervangen
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveFile('cv_url')}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-colors"
                        onClick={() => cvInputRef.current?.click()}
                      >
                        <div className="text-center text-muted-foreground">
                          <Upload className="mx-auto h-6 w-6 mb-1" />
                          <span className="text-xs">Upload CV</span>
                        </div>
                      </div>
                    )}
                    <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'cv', 'cv_url'); e.target.value = ''; }} />
                  </div>
                </div>
                {fileUploading && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />Bestand uploaden...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Exports */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exports</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        {/* ── Uitstroom Tab ── */}
        <TabsContent value="uitstroom">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Uitstroom Status */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Uitstroom Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={kandidaat.uitstroom_status ?? ''}
                  onValueChange={handleSaveUitstroomStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="werk">Werk</SelectItem>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="lopend">Lopend</SelectItem>
                    <SelectItem value="vrijwilligers_werk">Vrijwilligers werk</SelectItem>
                    <SelectItem value="garantie_baan">Garantie baan</SelectItem>
                    <SelectItem value="beschut_werk">Beschut werk</SelectItem>
                    <SelectItem value="binnen">Binnen</SelectItem>
                    <SelectItem value="no_show">No show</SelectItem>
                    <SelectItem value="uitval">Uitval</SelectItem>
                  </SelectContent>
                </Select>
                {kandidaat.uitstroom_status && (
                  <Badge variant="outline" className="text-sm">
                    {kandidaat.uitstroom_status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Gespreksupdates */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Gespreksupdates
                </CardTitle>
                <PermissionGate roles={['admin', 'intaker']}>
                  <Button size="sm" onClick={() => setUitstroomDialogOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" />
                    Nieuwe update
                  </Button>
                </PermissionGate>
              </CardHeader>
              <CardContent>
                {!uitstroomUpdates?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nog geen gespreksupdates geplaatst.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {uitstroomUpdates.map((update: any) => (
                      <div key={update.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(update.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            {update.tijd && (
                              <span className="font-medium">{update.tijd}</span>
                            )}
                          </div>
                          <PermissionGate roles={['admin', 'intaker']}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteUitstroomUpdate(update.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </PermissionGate>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{update.inhoud}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>

      {/* Intake Inplannen Dialog */}
      <Dialog open={intakeDialogOpen} onOpenChange={setIntakeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Intake Inplannen</DialogTitle>
            <DialogDescription>
              Plan een intakegesprek in voor {kandidaat.voornaam} {kandidaat.achternaam}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Datum *</Label>
                <Input
                  type="date"
                  value={intakeForm.datum}
                  onChange={(e) => setIntakeForm((f) => ({ ...f, datum: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tijdstip *</Label>
                <Input
                  type="time"
                  value={intakeForm.tijd}
                  onChange={(e) => setIntakeForm((f) => ({ ...f, tijd: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIntakeDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handlePlanIntake} disabled={!intakeForm.datum || !intakeForm.tijd}>
              Inplannen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Training Toevoegen Dialog */}
      <Dialog open={trainingDialogOpen} onOpenChange={setTrainingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Training Toevoegen</DialogTitle>
            <DialogDescription>
              Koppel {kandidaat.voornaam} {kandidaat.achternaam} aan een trainingsgroep.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Trainingsgroep *</Label>
              <Select value={selectedGroepId} onValueChange={setSelectedGroepId}>
                <SelectTrigger><SelectValue placeholder="Selecteer een groep..." /></SelectTrigger>
                <SelectContent>
                  {alleGroepen
                    ?.filter((g: any) => !trainingen?.some((t: any) => t.trainingsgroep_id === g.id))
                    .map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.groepscode ?? '—'} — {g.training?.naam ?? 'Onbekend'} ({g.status})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrainingDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleAddTraining} disabled={!selectedGroepId || addingTraining}>
              {addingTraining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificaat Toekennen Dialog */}
      <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Certificaat Toekennen</DialogTitle>
            <DialogDescription>
              Registreer een certificaat voor {kandidaat.voornaam} {kandidaat.achternaam}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Training / Groep *</Label>
              <Select
                value={certForm.kandidaat_training_id}
                onValueChange={(v) => setCertForm((f) => ({ ...f, kandidaat_training_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecteer een training..." /></SelectTrigger>
                <SelectContent>
                  {trainingen?.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.trainingsgroep?.groepscode ?? '—'} — {t.trainingsgroep?.training?.naam ?? 'Onbekend'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Certificaat naam *</Label>
              <Input
                value={certForm.omschrijving}
                onChange={(e) => setCertForm((f) => ({ ...f, omschrijving: e.target.value }))}
                placeholder="Bijv. VCA Basis, Heftruck, BHV..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={certForm.datum}
                  onChange={(e) => setCertForm((f) => ({ ...f, datum: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Score (optioneel)</Label>
                <Input
                  type="number"
                  value={certForm.score}
                  onChange={(e) => setCertForm((f) => ({ ...f, score: e.target.value }))}
                  placeholder="Bijv. 8.5"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="cert-behaald"
                checked={certForm.behaald}
                onCheckedChange={(v) => setCertForm((f) => ({ ...f, behaald: !!v }))}
              />
              <Label htmlFor="cert-behaald">Behaald</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertDialogOpen(false)}>Annuleren</Button>
            <Button
              onClick={handleAddCertificaat}
              disabled={!certForm.kandidaat_training_id || !certForm.omschrijving || addingCert}
            >
              {addingCert && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Toekennen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Uitstroom Update Dialog */}
      <Dialog open={uitstroomDialogOpen} onOpenChange={setUitstroomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Gespreksupdate</DialogTitle>
            <DialogDescription>
              Voeg een update toe n.a.v. een gevoerd gesprek met {kandidaat.voornaam} {kandidaat.achternaam}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Datum *</Label>
                <Input
                  type="date"
                  value={uitstroomForm.datum}
                  onChange={(e) => setUitstroomForm((f) => ({ ...f, datum: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tijdstip</Label>
                <Input
                  type="time"
                  value={uitstroomForm.tijd}
                  onChange={(e) => setUitstroomForm((f) => ({ ...f, tijd: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Inhoud gesprek *</Label>
              <Textarea
                rows={5}
                value={uitstroomForm.inhoud}
                onChange={(e) => setUitstroomForm((f) => ({ ...f, inhoud: e.target.value }))}
                placeholder="Beschrijf het gevoerde gesprek..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUitstroomDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleAddUitstroomUpdate} disabled={!uitstroomForm.inhoud}>
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
