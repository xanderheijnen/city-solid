import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Voortgang } from '@/lib/types';

export const voortgangKeys = {
  all: ['voortgang'] as const,
  byGroep: (groepId: string) => [...voortgangKeys.all, 'groep', groepId] as const,
  byKandidaatTraining: (ktId: string) => [...voortgangKeys.all, 'kt', ktId] as const,
};

export function useVoortgangByGroep(groepId: string | undefined) {
  return useQuery({
    queryKey: voortgangKeys.byGroep(groepId!),
    queryFn: async () => {
      const { data: deelnemers, error: dErr } = await supabase
        .from('cs_kandidaat_trainingen')
        .select('id')
        .eq('trainingsgroep_id', groepId!);

      if (dErr) throw dErr;
      if (!deelnemers?.length) return [];

      const ktIds = deelnemers.map((d) => d.id);

      const { data, error } = await supabase
        .from('cs_voortgang')
        .select('*, kandidaat_training:cs_kandidaat_trainingen(id, kandidaat_id, kandidaat:cs_kandidaten(voornaam, achternaam, display_id))')
        .in('kandidaat_training_id', ktIds)
        .order('datum', { ascending: false });

      if (error) throw error;
      return data as (Voortgang & {
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

interface CreateVoortgangParams {
  kandidaat_training_id: string;
  omschrijving: string;
  datum: string;
  type: Voortgang['type'];
  score?: number | null;
  behaald?: boolean;
  groepId: string; // for cache invalidation
}

export function useCreateVoortgang() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groepId: _, ...params }: CreateVoortgangParams) => {
      const { data, error } = await supabase
        .from('cs_voortgang')
        .insert({
          kandidaat_training_id: params.kandidaat_training_id,
          omschrijving: params.omschrijving,
          datum: params.datum,
          type: params.type,
          score: params.score ?? null,
          behaald: params.behaald ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Voortgang;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: voortgangKeys.byGroep(vars.groepId) });
    },
  });
}
