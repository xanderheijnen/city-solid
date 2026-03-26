import { useEffect, useState } from 'react';
import type { CsRole } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseRoleReturn {
  currentRoles: CsRole[];
  loading: boolean;
  hasRole: (role: CsRole) => boolean;
  hasAnyRole: (roles: CsRole[]) => boolean;
  isAdmin: boolean;
  isIntaker: boolean;
  isTrainer: boolean;
  isManager: boolean;
  isReadonly: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRole(): UseRoleReturn {
  const { user } = useAuth();
  const [currentRoles, setCurrentRoles] = useState<CsRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCurrentRoles([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRoles() {
      setLoading(true);
      const { data, error } = await supabase
        .from('cs_user_roles')
        .select('role')
        .eq('user_id', user!.id);

      if (!cancelled) {
        if (error) {
          // Silent: role fetch failure handled by empty roles array
          setCurrentRoles([]);
        } else {
          setCurrentRoles((data ?? []).map((row) => row.role as CsRole));
        }
        setLoading(false);
      }
    }

    fetchRoles();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // -- Helper functions ------------------------------------------------------

  const hasRole = (role: CsRole): boolean => currentRoles.includes(role);

  const hasAnyRole = (roles: CsRole[]): boolean =>
    roles.some((role) => currentRoles.includes(role));

  // -- Return ----------------------------------------------------------------

  return {
    currentRoles,
    loading,
    hasRole,
    hasAnyRole,
    isAdmin: hasRole('admin'),
    isIntaker: hasRole('intaker'),
    isTrainer: hasRole('trainer'),
    isManager: hasRole('manager'),
    isReadonly: hasRole('readonly'),
  };
}
