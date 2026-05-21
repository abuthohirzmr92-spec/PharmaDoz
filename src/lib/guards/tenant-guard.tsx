"use client";

import { useAuthStore } from "@/store/auth-store";
import { isPlatformUser } from "@/lib/auth/role-resolver";

interface RequireTenantContextProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * RequireTenantContext — ensures tenant users have an active tenant context
 * (tenantId is set). Platform users bypass the check entirely since they
 * operate at system level without tenant affiliation.
 *
 * - Platform user (no tenant needed) => renders children
 * - Tenant user with tenantId          => renders children
 * - Tenant user without tenantId       => renders fallback (default null)
 */
export function RequireTenantContext({
  children,
  fallback = null,
}: RequireTenantContextProps) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading || !isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  // Platform users don't need a tenant context
  if (isPlatformUser(user.role)) {
    return <>{children}</>;
  }

  // Tenant users must have a tenantId
  if (!user.tenantId) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
