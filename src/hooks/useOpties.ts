import { useQuery } from '@tanstack/react-query';
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
