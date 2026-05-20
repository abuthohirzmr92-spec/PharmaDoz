import type { AppRole, Permission } from "@/types";
import { ROLE_PERMISSIONS } from "./roles";

/**
 * Check if a role has a specific permission.
 * Pure function — no React dependency, usable anywhere.
 */
export function hasPermission(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
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
 */
export function isSystemRole(role: AppRole): boolean {
  return ["super_admin"].includes(role);
}

/**
 * Check if a role is the tenant owner.
 */
export function isTenantOwner(role: AppRole): boolean {
  return role === "tenant_owner";
}
