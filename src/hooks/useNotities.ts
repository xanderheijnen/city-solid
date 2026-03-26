import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Notitie } from '@/lib/types';

export const notitieKeys = {
  all: ['notities'] as const,
  byKandidaat: (kandidaatId: string) => [...notitieKeys.all, 'kandidaat', kandidaatId] as const,
};

export function useNotities(kandidaatId: string | undefined) {
  return useQuery({
    queryKey: notitieKeys.byKandidaat(kandidaatId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_notities')
        .select('*')
        .eq('kandidaat_id', kandidaatId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Notitie[];
    },
    enabled: !!kandidaatId,
  });
}

interface CreateNotitieParams {
  kandidaat_id: string;
  trainingsgroep_id?: string | null;
  inhoud: string;
  categorie: Notitie['categorie'];
  is_vertrouwelijk?: boolean;
}

export function useCreateNotitie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateNotitieParams) => {
      const { data, error } = await supabase
        .from('cs_notities')
        .insert({
          kandidaat_id: params.kandidaat_id,
          trainingsgroep_id: params.trainingsgroep_id ?? null,
          inhoud: params.inhoud,
          categorie: params.categorie,
          is_vertrouwelijk: params.is_vertrouwelijk ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Notitie;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: notitieKeys.byKandidaat(vars.kandidaat_id) });
    },
  });
}

export function useDeleteNotitie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, kandidaat_id }: { id: string; kandidaat_id: string }) => {
      const { error } = await supabase
        .from('cs_notities')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id, kandidaat_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: notitieKeys.byKandidaat(data.kandidaat_id) });
    },
  });
}
