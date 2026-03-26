import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  Kandidaat,
  KandidaatFilters,
  TrajectStatus,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Expliciete kolomselectie — NOOIT select('*') op kandidaten
// Gevoelige velden (BSN, medisch, justitie, schulden) staan in cs_kandidaten_sensitive
// ---------------------------------------------------------------------------

const KANDIDAAT_PUBLIC_COLUMNS = [
  'id', 'display_id', 'traject_status',
  'voornaam', 'achternaam', 'geslacht', 'geboortedatum', 'leeftijd',
  'geboorteplaats', 'nationaliteit',
  'straat', 'postcode', 'woonplaats', 'ingeschreven_adres_brp', 'reden_geen_brp',
  'wijk', 'gebied',
  'telefoon', 'email', 'contactpersoon', 'whatsapp', 'eigen_vervoer', 'rijbewijs',
  'zorgverzekering',
  'uitkering', 'toestemming',
  'aanmeld_type', 'aanmelder_naam', 'aanmelder_telefoon', 'aanmelder_email',
  'door_wie_bekend', 'aanmeld_organisatie', 'gewenst_project',
  'gewenste_sector', 'certificaat_voorkeur_1', 'certificaat_voorkeur_2',
  'motivatie', 'demotivatie', 'stip_aan_de_horizon',
  'goede_eigenschappen', 'minder_goed_in', 'talen', 'hobbys',
  'klantmanager',
  'woonsituatie', 'kinderen',
  'trajecten', 'hulpverleners_betrokken', 'afspraken_hulp',
  'opleiding', 'diploma_behaald', 'opleiding_niveau', 'reden_uitval',
  'cursussen_gevolgd', 'certificaten_behaald',
  'werkervaring', 'waarom_lukte_niet', 'heeft_cv',
  'acties_afspraken', 'leefgebieden_aandacht',
  'uitstroom_status',
  'activiteit', 'csn', 'no_show', 'eenoudergezin', 'verandering',
  'foto_url', 'cv_url',
  'aanmeld_datum', 'intake_datum', 'intake_tijd', 'intake_notities',
  'created_by', 'created_at', 'updated_at',
].join(',');

export const kandidaatKeys = {
  all: ['kandidaten'] as const,
  lists: () => [...kandidaatKeys.all, 'list'] as const,
  list: (filters?: KandidaatFilters) =>
    [...kandidaatKeys.lists(), filters] as const,
  details: () => [...kandidaatKeys.all, 'detail'] as const,
  detail: (id: string) => [...kandidaatKeys.details(), id] as const,
};

// ---------------------------------------------------------------------------
// useKandidaten – list with optional filters
// ---------------------------------------------------------------------------

export function useKandidaten(filters?: KandidaatFilters) {
  return useQuery({
    queryKey: kandidaatKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('cs_kandidaten')
        .select(KANDIDAAT_PUBLIC_COLUMNS)
        .order('created_at', { ascending: false });

      if (filters?.search) {
        const term = `%${filters.search}%`;
        query = query.or(
          `voornaam.ilike.${term},achternaam.ilike.${term},email.ilike.${term},display_id.ilike.${term}`,
        );
      }

      if (filters?.traject_status) {
        if (Array.isArray(filters.traject_status)) {
          query = query.in('traject_status', filters.traject_status);
        } else {
          query = query.eq('traject_status', filters.traject_status);
        }
      }

      if (filters?.wijk) {
        query = query.eq('wijk', filters.wijk);
      }

      if (filters?.gebied) {
        query = query.eq('gebied', filters.gebied);
      }

      if (filters?.geslacht) {
        query = query.eq('geslacht', filters.geslacht);
      }

      if (filters?.klantmanager) {
        query = query.eq('klantmanager', filters.klantmanager);
      }

      if (filters?.aanmeld_datum_van) {
        query = query.gte('aanmeld_datum', filters.aanmeld_datum_van);
      }

      if (filters?.aanmeld_datum_tot) {
        query = query.lte('aanmeld_datum', filters.aanmeld_datum_tot);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as Kandidaat[];
    },
  });
}

// ---------------------------------------------------------------------------
// useKandidaat – single by ID
// ---------------------------------------------------------------------------

export function useKandidaat(id: string | undefined) {
  return useQuery({
    queryKey: kandidaatKeys.detail(id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_kandidaten')
        .select(KANDIDAAT_PUBLIC_COLUMNS)
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as unknown as Kandidaat;
    },
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// useCreateKandidaat
// ---------------------------------------------------------------------------

export function useCreateKandidaat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kandidaat: { voornaam: string; achternaam: string } & Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('cs_kandidaten')
        .insert(kandidaat)
        .select()
        .single();

      if (error) throw error;
      return data as Kandidaat;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kandidaatKeys.lists() });
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateKandidaat
// ---------------------------------------------------------------------------

export function useUpdateKandidaat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('cs_kandidaten')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Kandidaat;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: kandidaatKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: kandidaatKeys.detail(data.id),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteKandidaat
// ---------------------------------------------------------------------------

export function useDeleteKandidaat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cs_kandidaten')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (_deletedId) => {
      queryClient.invalidateQueries({ queryKey: kandidaatKeys.lists() });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteKandidaatAVG – full AVG deletion (cascade all related data)
// ---------------------------------------------------------------------------

export function useDeleteKandidaatAVG() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Get all kandidaat_trainingen IDs
      const { data: kts } = await supabase
        .from('cs_kandidaat_trainingen')
        .select('id')
        .eq('kandidaat_id', id);

      const ktIds = kts?.map((kt) => kt.id) ?? [];

      if (ktIds.length > 0) {
        // 2. Delete voortgang entries
        await supabase
          .from('cs_voortgang')
          .delete()
          .in('kandidaat_training_id', ktIds);

        // 3. Delete aanwezigheid entries
        await supabase
          .from('cs_aanwezigheid')
          .delete()
          .in('kandidaat_training_id', ktIds);

        // 4. Delete kandidaat_trainingen
        await supabase
          .from('cs_kandidaat_trainingen')
          .delete()
          .eq('kandidaat_id', id);
      }

      // 5. Delete notities
      await supabase
        .from('cs_notities')
        .delete()
        .eq('kandidaat_id', id);

      // 6. Delete documenten
      await supabase
        .from('cs_documenten')
        .delete()
        .eq('kandidaat_id', id);

      // 7. Log to audit before deleting the kandidaat
      const { data: kandidaat } = await supabase
        .from('cs_kandidaten')
        .select('display_id, voornaam, achternaam')
        .eq('id', id)
        .single();

      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('cs_audit_log').insert({
        user_id: user?.id ?? null,
        actie: 'delete',
        object_type: 'kandidaat',
        object_id: id,
        omschrijving: `AVG verwijdering: ${kandidaat?.display_id} ${kandidaat?.voornaam} ${kandidaat?.achternaam} - alle gerelateerde data verwijderd`,
      });

      // 8. Delete the kandidaat itself
      const { error } = await supabase
        .from('cs_kandidaten')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kandidaatKeys.lists() });
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateTrajectStatus – advance (or change) voortgang step
// ---------------------------------------------------------------------------

interface UpdateTrajectStatusParams {
  id: string;
  traject_status: TrajectStatus;
}

export function useUpdateTrajectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      traject_status,
    }: UpdateTrajectStatusParams) => {
      const updates: Record<string, unknown> = { traject_status };

      const now = new Date().toISOString().split('T')[0];

      if (traject_status === 'intake_gepland') {
        updates.intake_datum = now;
      }

      const { data, error } = await supabase
        .from('cs_kandidaten')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Kandidaat;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: kandidaatKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: kandidaatKeys.detail(data.id),
      });
    },
  });
}
