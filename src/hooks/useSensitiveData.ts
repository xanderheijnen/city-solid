import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRole } from '@/hooks/useRole';
import { apiFetch } from '@/lib/api';

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
// useSensitiveKandidaatData – fetch via backend (Zone B)
// Access logging happens server-side, not bypassable
// ---------------------------------------------------------------------------

export function useSensitiveKandidaatData(kandidaatId: string | undefined) {
  const { hasAnyRole } = useRole();
  const isAuthorized = hasAnyRole(['admin', 'intaker']);

  const query = useQuery({
    queryKey: sensitiveKeys.detail(kandidaatId ?? ''),
    queryFn: async () => {
      return apiFetch<SensitiveKandidaatData>(`/api/sensitive/${kandidaatId}`);
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
// useUpdateSensitiveData – mutation via backend (Zone B)
// ---------------------------------------------------------------------------

export function useUpdateSensitiveData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      kandidaat_id,
      ...updates
    }: { kandidaat_id: string } & Partial<Omit<SensitiveKandidaatData, 'kandidaat_id'>>) => {
      return apiFetch<{ ok: boolean }>(`/api/sensitive/${kandidaat_id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: sensitiveKeys.detail(variables.kandidaat_id),
      });
    },
  });
}
