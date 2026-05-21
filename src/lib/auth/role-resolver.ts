import type { AppRole, SystemRole, TenantRole } from "@/types";

const SYSTEM_ROLE_VALUES: ReadonlySet<string> = new Set([
  "super_admin",
  "developer",
  "support_ai",
]);

const TENANT_ROLE_VALUES: ReadonlySet<string> = new Set([
  "tenant_owner",
  "admin",
  "pharmacist",
  "cashier",
  "staff",
]);

/**
 * True if the given string is a valid SystemRole (platform-level).
 * Does NOT perform a fallback — returns false for null/undefined.
 */
export function isSystemRoleType(role: string | null | undefined): role is SystemRole {
  return typeof role === "string" && SYSTEM_ROLE_VALUES.has(role);
}

/**
 * True if the given string is a valid TenantRole (business-level).
 */
export function isTenantRoleType(role: string | null | undefined): role is TenantRole {
  return typeof role === "string" && TENANT_ROLE_VALUES.has(role);
}

/**
 * True if the given string is any recognized AppRole (system or tenant).
 */
export function isAppRoleType(role: string | null | undefined): role is AppRole {
  return isSystemRoleType(role) || isTenantRoleType(role);
}

/**
 * Centralized role resolution.
 *
 * Rules (in order):
 * 1. If profileRole is a SystemRole → return it immediately (platform user).
 *    System roles bypass tenant_users entirely — a super_admin with
 *    tenant_id=NULL has NO tenant_users row and must never fall back to "staff".
 * 2. If tenantRole is a recognized TenantRole → return it.
 * 3. Otherwise → return "unaffiliated" (explicit, never a silent fallback).
 */
export function resolveUserRole(
  profileRole: string | null | undefined,
  tenantRole: string | null | undefined,
): AppRole | "unaffiliated" {
  if (isSystemRoleType(profileRole)) {
    return profileRole;
  }

  if (isTenantRoleType(tenantRole)) {
    return tenantRole;
  }

  return "unaffiliated";
}

/**
 * True if the role is a platform-level system role (super_admin, developer,
 * support_ai). Platform users have no tenant affiliation and should never
 * see tenant-scoped UI like the business sidebar or role labels.
 */
export function isPlatformUser(role: string | null | undefined): role is SystemRole {
  return isSystemRoleType(role);
}
