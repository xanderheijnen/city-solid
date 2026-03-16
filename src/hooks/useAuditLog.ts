import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AuditLogEntry, AuditAction } from '@/lib/types';

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
      let query = supabase
        .from('cs_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters?.actie) {
        query = query.eq('actie', filters.actie);
      }
      if (filters?.search) {
        query = query.or(
          `omschrijving.ilike.%${filters.search}%,object_type.ilike.%${filters.search}%`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLogEntry[];
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
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('cs_audit_log').insert({
        user_id: user?.id ?? null,
        actie: params.actie,
        object_type: params.object_type,
        object_id: params.object_id ?? null,
        omschrijving: params.omschrijving ?? null,
        oude_waarden: params.oude_waarden ?? null,
        nieuwe_waarden: params.nieuwe_waarden ?? null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auditKeys.all });
    },
  });
}
