import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuditLogEntry, AuditAction } from '@/lib/types';
import { apiFetch } from '@/lib/api';

export const auditKeys = {
  all: ['audit-log'] as const,
  list: (filters?: { search?: string; actie?: AuditAction }) =>
    [...auditKeys.all, 'list', filters] as const,
};

interface AuditFilters {
  search?: string;
  actie?: AuditAction;
}

export function useAuditLog(filters?: AuditFilters) {
  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.actie) params.set('actie', filters.actie);
      if (filters?.search) params.set('search', filters.search);
      const qs = params.toString();
      return apiFetch<AuditLogEntry[]>(`/api/audit/log${qs ? '?' + qs : ''}`);
    },
  });
}

interface LogAuditParams {
  actie: AuditAction;
  object_type: string;
  object_id?: string;
  omschrijving?: string;
  oude_waarden?: Record<string, unknown>;
  nieuwe_waarden?: Record<string, unknown>;
}

export function useLogAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LogAuditParams) => {
      return apiFetch<{ ok: boolean }>('/api/audit/log', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auditKeys.all });
    },
  });
}
