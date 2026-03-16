import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  Training,
  Trainingsgroep,
  TrainingenFilters,
  TrainingsgroepFilters,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const trainingKeys = {
  all: ['trainingen'] as const,
  lists: () => [...trainingKeys.all, 'list'] as const,
  list: (filters?: TrainingenFilters) =>
    [...trainingKeys.lists(), filters] as const,
  details: () => [...trainingKeys.all, 'detail'] as const,
  detail: (id: string) => [...trainingKeys.details(), id] as const,
};

export const trainingsgroepKeys = {
  all: ['trainingsgroepen'] as const,
  lists: () => [...trainingsgroepKeys.all, 'list'] as const,
  list: (filters?: TrainingsgroepFilters) =>
    [...trainingsgroepKeys.lists(), filters] as const,
  details: () => [...trainingsgroepKeys.all, 'detail'] as const,
  detail: (id: string) => [...trainingsgroepKeys.details(), id] as const,
};

// ===========================================================================
// Training hooks
// ===========================================================================

export function useTrainingen(filters?: TrainingenFilters) {
  return useQuery({
    queryKey: trainingKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('cs_trainingen')
        .select('*')
        .order('naam', { ascending: true });

      if (filters?.search) {
        const term = `%${filters.search}%`;
        query = query.or(`naam.ilike.${term},omschrijving.ilike.${term}`);
      }

      if (filters?.is_actief !== undefined) {
        query = query.eq('is_actief', filters.is_actief);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Training[];
    },
  });
}

export function useTraining(id: string | undefined) {
  return useQuery({
    queryKey: trainingKeys.detail(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_trainingen')
        .select('*')
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as Training;
    },
    enabled: !!id,
  });
}

export function useCreateTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (training: { naam: string } & Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('cs_trainingen')
        .insert(training)
        .select()
        .single();

      if (error) throw error;
      return data as Training;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.lists() });
    },
  });
}

export function useUpdateTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('cs_trainingen')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Training;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: trainingKeys.detail(data.id),
      });
    },
  });
}

export function useDeleteTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cs_trainingen')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.lists() });
    },
  });
}

// ===========================================================================
// Trainingsgroep hooks
// ===========================================================================

export function useTrainingsgroepen(filters?: TrainingsgroepFilters) {
  return useQuery({
    queryKey: trainingsgroepKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('cs_trainingsgroepen')
        .select('*, training:cs_trainingen(*)')
        .order('start_datum', { ascending: false });

      if (filters?.training_id) {
        query = query.eq('training_id', filters.training_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.trainer_id) {
        query = query.eq('trainer_id', filters.trainer_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Trainingsgroep[];
    },
  });
}

export function useTrainingsgroep(id: string | undefined) {
  return useQuery({
    queryKey: trainingsgroepKeys.detail(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_trainingsgroepen')
        .select('*, training:cs_trainingen(*)')
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as Trainingsgroep;
    },
    enabled: !!id,
  });
}

export function useCreateTrainingsgroep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groep: { training_id: string; start_datum: string } & Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('cs_trainingsgroepen')
        .insert(groep)
        .select()
        .single();

      if (error) throw error;
      return data as Trainingsgroep;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trainingsgroepKeys.lists(),
      });
    },
  });
}

export function useUpdateTrainingsgroep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('cs_trainingsgroepen')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Trainingsgroep;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: trainingsgroepKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: trainingsgroepKeys.detail(data.id),
      });
    },
  });
}

export function useDeleteTrainingsgroep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cs_trainingsgroepen')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trainingsgroepKeys.lists(),
      });
    },
  });
}
