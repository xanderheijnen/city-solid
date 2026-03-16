import type { ReactNode } from 'react';
import type { CsRole } from '@/lib/types';
import { useRole } from '@/hooks/useRole';

// ---------------------------------------------------------------------------
// PermissionGate component
// ---------------------------------------------------------------------------

interface PermissionGateProps {
  /** Roles that are allowed to see the children */
  roles: CsRole[];
  /** Content to render when the user does NOT have the required role */
  fallback?: ReactNode;
  /** Content to render when the user DOES have the required role */
  children: ReactNode;
}

/**
 * Conditionally renders children based on the current user's roles.
 *
 * @example
 * ```tsx
 * <PermissionGate roles={['admin', 'intaker']}>
 *   <Button>Nieuwe Aanmelding</Button>
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  roles,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasAnyRole, loading } = useRole();

  // While roles are loading, render nothing to avoid flash of forbidden content
  if (loading) {
    return null;
  }

  if (!hasAnyRole(roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// usePermission hook
// ---------------------------------------------------------------------------

interface UsePermissionOptions {
  /** Roles that grant permission */
  roles: CsRole[];
}

interface UsePermissionReturn {
  /** Whether the current user has permission */
  hasPermission: boolean;
  /** Whether the permission check is still loading */
  loading: boolean;
}

/**
 * Hook to check if the current user has any of the specified roles.
 *
 * @example
 * ```ts
 * const { hasPermission } = usePermission({ roles: ['admin', 'manager'] });
 * ```
 */
export function usePermission({
  roles,
}: UsePermissionOptions): UsePermissionReturn {
  const { hasAnyRole, loading } = useRole();

  return {
    hasPermission: !loading && hasAnyRole(roles),
    loading,
  };
}
