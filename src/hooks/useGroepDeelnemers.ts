import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { KandidaatTraining, Kandidaat } from '@/lib/types';

export const groepDeelnemerKeys = {
  all: ['groep-deelnemers'] as const,
  byGroep: (groepId: string) => [...groepDeelnemerKeys.all, groepId] as const,
};

export interface DeelnemerMetKandidaat extends KandidaatTraining {
  kandidaat: Kandidaat;
}

export function useGroepDeelnemers(groepId: string | undefined) {
  return useQuery({
    queryKey: groepDeelnemerKeys.byGroep(groepId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_kandidaat_trainingen')
        .select('*, kandidaat:cs_kandidaten(*)')
        .eq('trainingsgroep_id', groepId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DeelnemerMetKandidaat[];
    },
    enabled: !!groepId,
  });
}

export function useAddDeelnemer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ kandidaat_id, trainingsgroep_id }: { kandidaat_id: string; trainingsgroep_id: string }) => {
      const { data, error } = await supabase
        .from('cs_kandidaat_trainingen')
        .insert({ kandidaat_id, trainingsgroep_id })
        .select()
        .single();

      if (error) throw error;
      return data as KandidaatTraining;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: groepDeelnemerKeys.byGroep(variables.trainingsgroep_id),
      });
    },
  });
}

export function useRemoveDeelnemer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, trainingsgroep_id }: { id: string; trainingsgroep_id: string }) => {
      const { error } = await supabase
        .from('cs_kandidaat_trainingen')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, trainingsgroep_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: groepDeelnemerKeys.byGroep(data.trainingsgroep_id),
      });
    },
  });
}
