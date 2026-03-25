import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Optie } from '@/lib/types';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const optieKeys = {
  all: ['opties'] as const,
  byCategorie: (categorie: string) =>
    [...optieKeys.all, categorie] as const,
};

// ---------------------------------------------------------------------------
// useOpties – fetch dropdown options by category
// ---------------------------------------------------------------------------

export function useOpties(categorie: string) {
  return useQuery({
    queryKey: optieKeys.byCategorie(categorie),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_opties')
        .select('*')
        .eq('categorie', categorie)
        .eq('is_actief', true)
        .order('volgorde', { ascending: true });

      if (error) throw error;
      return data as Optie[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useAllOpties – fetch all active options (all categories)
// ---------------------------------------------------------------------------

export function useAllOpties() {
  return useQuery({
    queryKey: optieKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_opties')
        .select('*')
        .eq('is_actief', true)
        .order('categorie', { ascending: true })
        .order('volgorde', { ascending: true });

      if (error) throw error;
      return data as Optie[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useAllOptiesIncludingInactive – for admin management
// ---------------------------------------------------------------------------

export function useAllOptiesIncludingInactive(categorie?: string) {
  return useQuery({
    queryKey: [...optieKeys.all, 'admin', categorie ?? 'all'] as const,
    queryFn: async () => {
      let query = supabase
        .from('cs_opties')
        .select('*')
        .order('volgorde', { ascending: true });

      if (categorie) {
        query = query.eq('categorie', categorie);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Optie[];
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations: create, update, delete
// ---------------------------------------------------------------------------

export function useCreateOptie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (optie: { categorie: string; waarde: string; volgorde?: number }) => {
      const { data, error } = await supabase
        .from('cs_opties')
        .insert({
          categorie: optie.categorie,
          waarde: optie.waarde,
          volgorde: optie.volgorde ?? 0,
          is_actief: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Optie;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: optieKeys.all });
    },
  });
}

export function useUpdateOptie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Optie> & { id: string }) => {
      const { data, error } = await supabase
        .from('cs_opties')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Optie;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: optieKeys.all });
    },
  });
}

export function useDeleteOptie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('cs_opties')
        .update({ is_actief: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: optieKeys.all });
    },
  });
}

export function useRestoreOptie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cs_opties')
        .update({ is_actief: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: optieKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Helper: group options by category
// ---------------------------------------------------------------------------

export function groupOptiesByCategorie(
  opties: Optie[],
): Record<string, Optie[]> {
  return opties.reduce<Record<string, Optie[]>>((acc, optie) => {
    const cat = optie.categorie;
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(optie);
    return acc;
  }, {});
}
