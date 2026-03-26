import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';
import { useAuth } from '@/hooks/useAuth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SensitiveKandidaatData {
  kandidaat_id: string;
  bsn_last4: string | null;
  bsn_encrypted: string | null;
  medische_bijzonderheden: string | null;
  middelengebruik: string | null;
  aanraking_politie_justitie: boolean;
  aanraking_reden: string | null;
  veroordeeld_detentie: string | null;
  lopende_zaken: string | null;
  heeft_schulden: boolean;
  schulden_reden_bedrag: string | null;
  schulden_afspraken: string | null;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const sensitiveKeys = {
  all: ['sensitive'] as const,
  detail: (id: string) => [...sensitiveKeys.all, id] as const,
};

// ---------------------------------------------------------------------------
// useSensitiveKandidaatData – fetch sensitive record with access logging
// ---------------------------------------------------------------------------

export function useSensitiveKandidaatData(kandidaatId: string | undefined) {
  const { user } = useAuth();
  const { hasAnyRole } = useRole();

  const isAuthorized = hasAnyRole(['admin', 'intaker']);

  const query = useQuery({
    queryKey: sensitiveKeys.detail(kandidaatId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_kandidaten_sensitive')
        .select('*')
        .eq('kandidaat_id', kandidaatId!)
        .single();

      if (error) throw error;

      // Log access after successful fetch
      await supabase.from('cs_sensitive_access_log').insert({
        user_id: user!.id,
        kandidaat_id: kandidaatId!,
        action: 'VIEW_SENSITIVE',
      });

      return data as SensitiveKandidaatData;
    },
    enabled: !!kandidaatId && isAuthorized,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isAuthorized,
  };
}

// ---------------------------------------------------------------------------
// useUpdateSensitiveData – mutation for updating sensitive fields
// ---------------------------------------------------------------------------

export function useUpdateSensitiveData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      kandidaat_id,
      ...updates
    }: { kandidaat_id: string } & Partial<Omit<SensitiveKandidaatData, 'kandidaat_id'>>) => {
      const { data, error } = await supabase
        .from('cs_kandidaten_sensitive')
        .update(updates)
        .eq('kandidaat_id', kandidaat_id)
        .select()
        .single();

      if (error) throw error;
      return data as SensitiveKandidaatData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: sensitiveKeys.detail(data.kandidaat_id),
      });
    },
  });
}
