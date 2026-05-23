import type { AppRole, Permission, TenantRole } from "@/types";
import { ROLE_PERMISSIONS } from "./roles";
import { isSuperAdmin } from "./super-admin";
import { ALL_PERMISSIONS } from "@/lib/permissions/all-permissions";

export interface PermissionOverride {
  permission: Permission | string;
  granted: boolean;
}

/**
 * Check if a role has a specific permission.
 * Pure function — no React dependency, usable anywhere.
 */
export function hasPermission(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has a specific permission, with per-user overrides applied.
 * Override `granted=true` adds permission even if role doesn't have it.
 * Override `granted=false` removes permission even if role has it.
 * No override → fall back to role default.
 */
export function hasEffectivePermission(
  role: AppRole,
  overrides: PermissionOverride[] | undefined | null,
  permission: Permission,
): boolean {
  const override = overrides?.find((o) => o.permission === permission);
  if (override) return override.granted;
  return hasPermission(role, permission);
}

/**
 * Resolve all tenant permissions to their effective boolean state
 * by merging ROLE_PERMISSIONS defaults with per-user overrides.
 */
export function getEffectivePermissions(
  role: AppRole,
  overrides: PermissionOverride[] | undefined | null,
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const perm of ALL_PERMISSIONS) {
    result[perm] = hasEffectivePermission(role, overrides, perm);
  }
  return result;
}

/**
 * Check if a role has ANY of the given permissions.
 */
export function hasAnyPermission(
  role: AppRole,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Check if a role has ALL of the given permissions.
 */
export function hasAllPermissions(
  role: AppRole,
  permissions: Permission[],
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role is a system role (platform/internal).
 * Delegates to the canonical isSuperAdmin helper.
 */
export function isSystemRole(role: AppRole): boolean {
  return isSuperAdmin(role);
}

/**
 * Check if a role is the tenant owner.
 */
export function isTenantOwner(role: AppRole): boolean {
  return role === "tenant_owner";
}
