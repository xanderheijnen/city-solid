import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2, UserMinus, ExternalLink, Check, X, Clock, AlertTriangle, FolderOpen, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { PermissionGate } from '@/components/PermissionGate';
import { StatusBadge } from '@/components/StatusBadge';
import { useTrainingsgroep } from '@/hooks/useTrainingen';
import { useGroepDeelnemers, useAddDeelnemer, useRemoveDeelnemer } from '@/hooks/useGroepDeelnemers';
import { useKandidaten } from '@/hooks/useKandidaten';
import { useAanwezigheidByGroep, useUpsertAanwezigheid } from '@/hooks/useAanwezigheid';
import { useVoortgangByGroep, useCreateVoortgang } from '@/hooks/useVoortgang';
import { RESULTAAT_LABELS, AANWEZIGHEID_LABELS } from '@/lib/constants';
import type { Resultaat, AanwezigheidStatus, Voortgang } from '@/lib/types';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { trainingsgroepKeys } from '@/hooks/useTrainingen';

const STATUS_COLORS: Record<string, string> = {
  gepland: 'bg-blue-100 text-blue-700',
  actief: 'bg-green-100 text-green-700',
  afgerond: 'bg-gray-100 text-gray-700',
};

const AANWEZIGHEID_ICONS: Record<AanwezigheidStatus, { icon: typeof Check; color: string }> = {
  aanwezig: { icon: Check, color: 'text-green-600 bg-green-50' },
  afwezig_gemeld: { icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50' },
  afwezig_ongemeld: { icon: X, color: 'text-red-600 bg-red-50' },
  te_laat: { icon: Clock, color: 'text-orange-600 bg-orange-50' },
  ziek: { icon: AlertTriangle, color: 'text-purple-600 bg-purple-50' },
};

export default function GroepDetail() {
  const { id } = useParams();
  const { data: groep, isLoading: loadingGroep } = useTrainingsgroep(id);
  const { data: deelnemers, isLoading: loadingDeelnemers } = useGroepDeelnemers(id);
  const { data: alleKandidaten } = useKandidaten();
  const { data: aanwezigheid } = useAanwezigheidByGroep(id);
  const { data: voortgangData } = useVoortgangByGroep(id);
  const addDeelnemer = useAddDeelnemer();
  const removeDeelnemer = useRemoveDeelnemer();
  const upsertAanwezigheid = useUpsertAanwezigheid();
  const createVoortgang = useCreateVoortgang();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedKandidaat, setSelectedKandidaat] = useState('');
  const [aanwezigheidDatum, setAanwezigheidDatum] = useState(
    new Date().toISOString().split('T')[0],
  );
  const queryClient = useQueryClient();
  const [dropboxUrl, setDropboxUrl] = useState('');
  const [dropboxEditing, setDropboxEditing] = useState(false);
  const [voortgangDialogOpen, setVoortgangDialogOpen] = useState(false);
  const [voortgangForm, setVoortgangForm] = useState({
    kandidaat_training_id: '',
    omschrijving: '',
    datum: new Date().toISOString().split('T')[0],
    type: 'mijlpaal' as Voortgang['type'],
    behaald: false,
  });

  // Filter out already-added kandidaten
  const beschikbareKandidaten = alleKandidaten?.filter(
    (k) => !deelnemers?.some((d) => d.kandidaat_id === k.id),
  ) ?? [];

  // Build aanwezigheid lookup: { `${kt_id}_${datum}`: status }
  const aanwezigheidMap = new Map<string, AanwezigheidStatus>();
  aanwezigheid?.forEach((a) => {
    aanwezigheidMap.set(`${a.kandidaat_training_id}_${a.datum}`, a.status);
  });

  const handleAdd = async () => {
    if (!selectedKandidaat || !id) return;
    try {
      await addDeelnemer.mutateAsync({ kandidaat_id: selectedKandidaat, trainingsgroep_id: id });
      toast.success('Deelnemer toegevoegd');
      setAddDialogOpen(false);
      setSelectedKandidaat('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Fout: ' + msg);
    }
  };

  const handleRemove = async (deelnemerId: string, naam: string) => {
    if (!id) return;
    if (!confirm(`Weet je zeker dat je ${naam} wilt verwijderen uit deze groep?`)) return;
    try {
      await removeDeelnemer.mutateAsync({ id: deelnemerId, trainingsgroep_id: id });
      toast.success('Deelnemer verwijderd');
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Fout: ' + msg);
    }
  };

  const handleAanwezigheid = async (ktId: string, status: AanwezigheidStatus) => {
    if (!id) return;
    try {
      await upsertAanwezigheid.mutateAsync({
        kandidaat_training_id: ktId,
        datum: aanwezigheidDatum,
        status,
        groepId: id,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Fout: ' + msg);
    }
  };

  const handleVoortgangSubmit = async () => {
    if (!id || !voortgangForm.kandidaat_training_id || !voortgangForm.omschrijving) return;
    try {
      await createVoortgang.mutateAsync({
        ...voortgangForm,
        groepId: id,
      });
      toast.success('Voortgang toegevoegd');
      setVoortgangDialogOpen(false);
      setVoortgangForm({
        kandidaat_training_id: '',
        omschrijving: '',
        datum: new Date().toISOString().split('T')[0],
        type: 'mijlpaal',
        behaald: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Fout: ' + msg);
    }
  };

  if (loadingGroep) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!groep) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/trainingen/groepen"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <p className="text-muted-foreground">Groep niet gevonden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/trainingen/groepen"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{groep.groepscode ?? 'Groep'}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[groep.status] ?? ''}`}>
              {groep.status}
            </span>
          </div>
          <p className="text-muted-foreground">{groep.training?.naam ?? 'Onbekende training'}</p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Startdatum</p>
            <p className="font-medium">{groep.start_datum}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Einddatum</p>
            <p className="font-medium">{groep.eind_datum ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Deelnemers</p>
            <p className="font-medium">{deelnemers?.length ?? 0}{groep.max_deelnemers ? ` / ${groep.max_deelnemers}` : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground mb-1">Dropbox Map</p>
            {groep.dropbox_folder_url && !dropboxEditing ? (
              <div className="flex items-center gap-2">
                <a href={groep.dropbox_folder_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline">
                  <FolderOpen className="h-3 w-3" />Open map
                </a>
                <PermissionGate roles={['admin']}>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setDropboxUrl(groep.dropbox_folder_url ?? ''); setDropboxEditing(true); }}>
                    Wijzig
                  </Button>
                </PermissionGate>
              </div>
            ) : dropboxEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  className="h-7 text-xs"
                  placeholder="https://dropbox.com/..."
                  value={dropboxUrl}
                  onChange={(e) => setDropboxUrl(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={async () => {
                    const { error } = await supabase
                      .from('cs_trainingsgroepen')
                      .update({ dropbox_folder_url: dropboxUrl || null })
                      .eq('id', id!);
                    if (error) { toast.error('Fout bij opslaan'); return; }
                    toast.success('Dropbox link opgeslagen');
                    queryClient.invalidateQueries({ queryKey: trainingsgroepKeys.detail(id!) });
                    setDropboxEditing(false);
                  }}
                >
                  <Save className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDropboxEditing(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <PermissionGate roles={['admin']}>
                <Button variant="ghost" size="sm" className="h-6 text-xs p-0" onClick={() => setDropboxEditing(true)}>
                  <Plus className="h-3 w-3 mr-1" />Link toevoegen
                </Button>
              </PermissionGate>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="deelnemers">
        <TabsList>
          <TabsTrigger value="deelnemers">Deelnemers ({deelnemers?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="aanwezigheid">Aanwezigheid</TabsTrigger>
          <TabsTrigger value="voortgang">Voortgang</TabsTrigger>
        </TabsList>

        {/* ── Deelnemers Tab ── */}
        <TabsContent value="deelnemers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Deelnemers</CardTitle>
              <PermissionGate roles={['admin', 'intaker']}>
                <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" />Toevoegen
                </Button>
              </PermissionGate>
            </CardHeader>
            <CardContent>
              {loadingDeelnemers ? (
                <div className="flex h-24 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !deelnemers?.length ? (
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
                  Nog geen deelnemers in deze groep
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Naam</TableHead>
                      <TableHead>Traject Status</TableHead>
                      <TableHead>Resultaat</TableHead>
                      <TableHead className="w-16">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deelnemers.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-sm">
                          <Link to={`/kandidaten/${d.kandidaat_id}`} className="text-primary hover:underline">
                            {d.kandidaat?.display_id}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link to={`/kandidaten/${d.kandidaat_id}`} className="hover:underline">
                            {d.kandidaat?.voornaam} {d.kandidaat?.achternaam}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {d.kandidaat && <StatusBadge status={d.kandidaat.traject_status} />}
                        </TableCell>
                        <TableCell>
                          <Badge variant={d.resultaat === 'behaald' ? 'default' : 'secondary'}>
                            {RESULTAAT_LABELS[d.resultaat as Resultaat] ?? d.resultaat}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <PermissionGate roles={['admin']}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemove(d.id, `${d.kandidaat?.voornaam} ${d.kandidaat?.achternaam}`)}
                            >
                              <UserMinus className="h-4 w-4 text-destructive" />
                            </Button>
                          </PermissionGate>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Aanwezigheid Tab ── */}
        <TabsContent value="aanwezigheid">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Aanwezigheidsregistratie</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Datum:</Label>
                <Input
                  type="date"
                  className="w-40"
                  value={aanwezigheidDatum}
                  onChange={(e) => setAanwezigheidDatum(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {!deelnemers?.length ? (
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
                  Voeg eerst deelnemers toe
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deelnemer</TableHead>
                      {(Object.keys(AANWEZIGHEID_LABELS) as AanwezigheidStatus[]).map((status) => (
                        <TableHead key={status} className="text-center w-24 text-xs">
                          {AANWEZIGHEID_LABELS[status]}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deelnemers.map((d) => {
                      const currentStatus = aanwezigheidMap.get(`${d.id}_${aanwezigheidDatum}`);
                      return (
                        <TableRow key={d.id}>
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground mr-2">{d.kandidaat?.display_id}</span>
                            {d.kandidaat?.voornaam} {d.kandidaat?.achternaam}
                          </TableCell>
                          {(Object.keys(AANWEZIGHEID_LABELS) as AanwezigheidStatus[]).map((status) => {
                            const { icon: Icon, color } = AANWEZIGHEID_ICONS[status];
                            const isSelected = currentStatus === status;
                            return (
                              <TableCell key={status} className="text-center">
                                <button
                                  type="button"
                                  onClick={() => handleAanwezigheid(d.id, status)}
                                  className={cn(
                                    'inline-flex h-8 w-8 items-center justify-center rounded-full transition-all',
                                    isSelected ? color + ' ring-2 ring-offset-1 ring-current' : 'text-muted-foreground/40 hover:text-muted-foreground',
                                  )}
                                >
                                  <Icon className="h-4 w-4" />
                                </button>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Voortgang Tab ── */}
        <TabsContent value="voortgang">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Voortgang & Mijlpalen</CardTitle>
              <PermissionGate roles={['admin', 'trainer']}>
                <Button size="sm" onClick={() => setVoortgangDialogOpen(true)} disabled={!deelnemers?.length}>
                  <Plus className="mr-1 h-4 w-4" />Toevoegen
                </Button>
              </PermissionGate>
            </CardHeader>
            <CardContent>
              {!voortgangData?.length ? (
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
                  Nog geen voortgang geregistreerd
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deelnemer</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Omschrijving</TableHead>
                      <TableHead>Behaald</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {voortgangData.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground mr-2">
                            {v.kandidaat_training?.kandidaat?.display_id}
                          </span>
                          {v.kandidaat_training?.kandidaat?.voornaam} {v.kandidaat_training?.kandidaat?.achternaam}
                        </TableCell>
                        <TableCell>{v.datum}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{v.type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{v.omschrijving}</TableCell>
                        <TableCell>
                          {v.behaald ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/40" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Deelnemer Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deelnemer Toevoegen</DialogTitle>
            <DialogDescription>
              Selecteer een kandidaat om toe te voegen aan groep {groep.groepscode}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedKandidaat} onValueChange={setSelectedKandidaat}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer een kandidaat..." />
              </SelectTrigger>
              <SelectContent>
                {beschikbareKandidaten.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.display_id} — {k.voornaam} {k.achternaam}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleAdd} disabled={!selectedKandidaat}>
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Voortgang Dialog */}
      <Dialog open={voortgangDialogOpen} onOpenChange={setVoortgangDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Voortgang Toevoegen</DialogTitle>
            <DialogDescription>
              Registreer een mijlpaal, beoordeling of certificaat voor een deelnemer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Deelnemer *</Label>
              <Select
                value={voortgangForm.kandidaat_training_id}
                onValueChange={(v) => setVoortgangForm((f) => ({ ...f, kandidaat_training_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer deelnemer..." />
                </SelectTrigger>
                <SelectContent>
                  {deelnemers?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.kandidaat?.display_id} — {d.kandidaat?.voornaam} {d.kandidaat?.achternaam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={voortgangForm.datum}
                  onChange={(e) => setVoortgangForm((f) => ({ ...f, datum: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={voortgangForm.type}
                  onValueChange={(v) => setVoortgangForm((f) => ({ ...f, type: v as Voortgang['type'] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mijlpaal">Mijlpaal</SelectItem>
                    <SelectItem value="beoordeling">Beoordeling</SelectItem>
                    <SelectItem value="certificaat">Certificaat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Omschrijving *</Label>
              <Textarea
                rows={3}
                value={voortgangForm.omschrijving}
                onChange={(e) => setVoortgangForm((f) => ({ ...f, omschrijving: e.target.value }))}
                placeholder="Beschrijf de voortgang..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVoortgangDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleVoortgangSubmit}
              disabled={!voortgangForm.kandidaat_training_id || !voortgangForm.omschrijving}
            >
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
