import type { AppRole } from "@/types";

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

export function isCrossTenantRole(role: string): boolean {
  return ["super_admin"].includes(role);
}

export function assertSystemRole(role: string): void {
  if (!isCrossTenantRole(role)) {
    throw new Error(
      `Platform operation denied for role: ${role}. Requires system role.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Tenant ID resolution
// ---------------------------------------------------------------------------

export function resolveTenantId(
  tenantId: string | undefined,
  role: string | undefined,
): string | undefined {
  if (!role || isCrossTenantRole(role)) return undefined;
  return tenantId || undefined;
}

// ---------------------------------------------------------------------------
// Tenant access validation
// ---------------------------------------------------------------------------

export function validateTenantAccess(
  userTenantId: string | undefined,
  requestedTenantId: string,
  userRole: AppRole,
): boolean {
  if (isCrossTenantRole(userRole)) return true;
  return userTenantId === requestedTenantId;
}

export function assertTenantAccess(
  userTenantId: string | undefined,
  requestedTenantId: string,
  userRole: AppRole,
): void {
  if (!validateTenantAccess(userTenantId, requestedTenantId, userRole)) {
    throw new Error(
      "Akses ditolak: Anda tidak memiliki akses ke tenant ini.",
    );
  }
}

// ---------------------------------------------------------------------------
// Deprecated — retained for backward compatibility
// ---------------------------------------------------------------------------

/** @deprecated Use tenant_id directly in repository queries */
export function tenantFilter(pharmacyId?: string | null): Record<string, string> {
  if (!pharmacyId) return {};
  return { tenant_id: pharmacyId };
}

/** @deprecated Use BaseRepository.withTenantScope() */
export function applyTenantScope(
  query: any,
  column: string,
  pharmacyId?: string | null,
): any {
  if (!pharmacyId) return query;
  return query.eq(column, pharmacyId);
}
