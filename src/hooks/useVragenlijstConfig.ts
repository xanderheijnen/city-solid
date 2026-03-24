import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VragenlijstVeld {
  id: string;
  formulier: string;
  sectie: string;
  sectie_volgorde: number;
  veld_naam: string;
  label: string;
  placeholder: string | null;
  help_tekst: string | null;
  veld_type: string;
  opties: { value: string; label: string }[] | null;
  is_verplicht: boolean;
  is_actief: boolean;
  volgorde: number;
}

export interface VragenlijstSectie {
  naam: string;
  volgorde: number;
  velden: VragenlijstVeld[];
}

const configKeys = {
  all: ['vragenlijst-config'] as const,
  formulier: (f: string) => ['vragenlijst-config', f] as const,
};

export function useVragenlijstConfig(formulier: 'intake' | 'aanmelding') {
  return useQuery({
    queryKey: configKeys.formulier(formulier),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_vragenlijst_config')
        .select('*')
        .eq('formulier', formulier)
        .order('sectie_volgorde', { ascending: true })
        .order('volgorde', { ascending: true });
      if (error) throw error;
      return data as VragenlijstVeld[];
    },
  });
}

// Group into sections
export function useVragenlijstSecties(formulier: 'intake' | 'aanmelding') {
  const { data, ...rest } = useVragenlijstConfig(formulier);

  const secties: VragenlijstSectie[] = [];
  if (data) {
    const map = new Map<string, VragenlijstSectie>();
    for (const veld of data) {
      if (!map.has(veld.sectie)) {
        map.set(veld.sectie, { naam: veld.sectie, volgorde: veld.sectie_volgorde, velden: [] });
      }
      map.get(veld.sectie)!.velden.push(veld);
    }
    secties.push(...Array.from(map.values()).sort((a, b) => a.volgorde - b.volgorde));
  }

  return { secties, ...rest };
}

export function useUpdateVragenlijstVeld() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string } & Partial<Omit<VragenlijstVeld, 'id'>>) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from('cs_vragenlijst_config')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: configKeys.all }),
  });
}

export function useAddVragenlijstVeld() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (veld: Omit<VragenlijstVeld, 'id'>) => {
      const { error } = await supabase
        .from('cs_vragenlijst_config')
        .insert(veld);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: configKeys.all }),
  });
}

export function useDeleteVragenlijstVeld() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cs_vragenlijst_config').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: configKeys.all }),
  });
}
