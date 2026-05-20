import type { AppRole } from "@/types";

/**
 * Returns true if the given role is super_admin — a platform-level role
 * that has NO tenant affiliation (tenant_id = NULL).
 */
export function isSuperAdmin(role: AppRole | null | undefined): boolean {
  return role === "super_admin";
}

/**
 * Throws if the given role is NOT super_admin.
 * Use in actions that require platform-level access.
 */
export function requireSuperAdmin(role: AppRole | null | undefined): void {
  if (!isSuperAdmin(role)) {
    throw new Error("Akses ditolak: hanya Super Admin yang dapat melakukan tindakan ini.");
  }
}

/**
 * Returns true if the profile has no tenant (tenant_id = NULL),
 * which indicates a platform-level super_admin.
 */
export function isPlatformAdmin(role: AppRole | null | undefined, tenantId: string | null | undefined): boolean {
  return isSuperAdmin(role) && (tenantId === null || tenantId === undefined);
}
