import type { AppRole } from "@/types";

/**
 * Returns a pharmacy_id filter for repository queries.
 * Returns empty object (no filter) when pharmacyId is missing.
 */
export function tenantFilter(pharmacyId?: string | null): Record<string, string> {
  if (!pharmacyId) return {};
  return { pharmacy_id: pharmacyId };
}

/**
 * Wraps a Supabase query builder with tenant scoping.
 */
export function applyTenantScope(
  query: any,
  column: string,
  pharmacyId?: string | null,
): any {
  if (!pharmacyId) return query;
  return query.eq(column, pharmacyId);
}

/**
 * System roles can operate across all tenants.
 */
export function isCrossTenantRole(role: string): boolean {
  return ["super_admin", "developer", "support"].includes(role);
}

/**
 * Throws if the given role is NOT a system role.
 * Use to guard platform-level operations.
 */
export function assertSystemRole(role: string): void {
  if (!isCrossTenantRole(role)) {
    throw new Error(
      `Platform operation denied for role: ${role}. Requires system role.`,
    );
  }
}

/**
 * Returns the tenant ID for scoping queries.
 * System roles return undefined (cross-tenant access).
 * Business roles return their pharmacyId.
 */
export function resolveTenantId(
  pharmacyId: string | undefined,
  role: string | undefined,
): string | undefined {
  if (!role || isCrossTenantRole(role)) return undefined;
  return pharmacyId || undefined;
}

// ---------------------------------------------------------------------------
// Tenant access validation helpers
// ---------------------------------------------------------------------------

/**
 * Validates that a user has access to a specific tenant scope.
 * System roles always pass (cross-tenant access).
 * Business roles pass only if their pharmacyId matches the requested tenant.
 */
export function validateTenantAccess(
  userPharmacyId: string | undefined,
  requestedPharmacyId: string,
  userRole: AppRole,
): boolean {
  if (isCrossTenantRole(userRole)) return true;
  return userPharmacyId === requestedPharmacyId;
}

/**
 * Validates tenant access and throws with an Indonesian error message
 * if the user does not have access to the requested tenant.
 */
export function assertTenantAccess(
  userPharmacyId: string | undefined,
  requestedPharmacyId: string,
  userRole: AppRole,
): void {
  if (!validateTenantAccess(userPharmacyId, requestedPharmacyId, userRole)) {
    throw new Error(
      "Akses ditolak: Anda tidak memiliki akses ke tenant ini.",
    );
  }
}
