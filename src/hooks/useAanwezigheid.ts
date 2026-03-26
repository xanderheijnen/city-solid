import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Aanwezigheidsregistratie, AanwezigheidStatus } from '@/lib/types';

export const aanwezigheidKeys = {
  all: ['aanwezigheid'] as const,
  byGroep: (groepId: string) => [...aanwezigheidKeys.all, 'groep', groepId] as const,
};

// Fetch all attendance records for all deelnemers in a trainingsgroep
export function useAanwezigheidByGroep(groepId: string | undefined) {
  return useQuery({
    queryKey: aanwezigheidKeys.byGroep(groepId ?? ''),
    queryFn: async () => {
      // First get all kandidaat_training IDs for this groep
      const { data: deelnemers, error: dErr } = await supabase
        .from('cs_kandidaat_trainingen')
        .select('id')
        .eq('trainingsgroep_id', groepId!);

      if (dErr) throw dErr;
      if (!deelnemers?.length) return [];

      const ktIds = deelnemers.map((d) => d.id);

      const { data, error } = await supabase
        .from('cs_aanwezigheidsregistratie')
        .select('*, kandidaat_training:cs_kandidaat_trainingen(id, kandidaat_id, kandidaat:cs_kandidaten(voornaam, achternaam, display_id))')
        .in('kandidaat_training_id', ktIds)
        .order('datum', { ascending: true });

      if (error) throw error;
      return data as (Aanwezigheidsregistratie & {
        kandidaat_training: {
          id: string;
          kandidaat_id: string;
          kandidaat: { voornaam: string; achternaam: string; display_id: string };
        };
      })[];
    },
    enabled: !!groepId,
  });
}

interface UpsertAanwezigheidParams {
  kandidaat_training_id: string;
  datum: string;
  status: AanwezigheidStatus;
  notitie?: string | null;
  groepId: string; // for cache invalidation
}

export function useUpsertAanwezigheid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ kandidaat_training_id, datum, status, notitie, groepId: _ }: UpsertAanwezigheidParams) => {
      // Check if record exists
      const { data: existing } = await supabase
        .from('cs_aanwezigheidsregistratie')
        .select('id')
        .eq('kandidaat_training_id', kandidaat_training_id)
        .eq('datum', datum)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('cs_aanwezigheidsregistratie')
          .update({ status, notitie: notitie ?? null })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('cs_aanwezigheidsregistratie')
          .insert({ kandidaat_training_id, datum, status, notitie: notitie ?? null })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: aanwezigheidKeys.byGroep(vars.groepId) });
    },
  });
}
