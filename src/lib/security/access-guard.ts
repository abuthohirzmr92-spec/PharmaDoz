// ---------------------------------------------------------------------------
// Access Guard — Tenant & Branch Access Enforcement
// ---------------------------------------------------------------------------
// Pure utility layer that checks whether a user (identified by role,
// tenantId, and optionally branchId) is permitted to access a given
// branch scope.  All error messages use Bahasa Indonesia.
//
// This module MUST remain free of React hooks and context imports to
// avoid circular dependencies.
// ---------------------------------------------------------------------------

import type { AppRole } from "@/types";
import { isSystemRoleType } from "@/lib/auth/role-resolver";

// ---------------------------------------------------------------------------
// Scope level — describes the effective operating scope of a user
// ---------------------------------------------------------------------------
// The hierarchy is:
//   platform  >  tenant  >  branch  >  none
export type ScopeLevel = "platform" | "tenant" | "branch" | "none";

// ---------------------------------------------------------------------------
// Branch access
// ---------------------------------------------------------------------------

/**
 * Check whether a user can access a given branch.
 *
 * Rules:
 * - System‑role users (super_admin, developer, support_ai) may access any
 *   branch regardless of tenant.
 * - Tenant‑role users may **only** access branches that belong to their own
 *   tenant (branchTenantId === userTenantId).
 *
 * @param userTenantId  The tenant the user belongs to (undefined for system
 *                      roles or unauthenticated users).
 * @param branchTenantId The tenant that owns the target branch.
 * @param userRole       The resolved application role.
 */
export function canAccessBranch(
  userTenantId: string | undefined,
  branchTenantId: string,
  userRole: AppRole,
): boolean {
  // System roles bypass tenant-scope checks entirely.
  if (isSystemRoleType(userRole)) {
    return true;
  }

  // Tenant roles must belong to the same tenant as the branch.
  return typeof userTenantId === "string" && userTenantId === branchTenantId;
}

/**
 * Assert that the user may access a branch.  Throws a descriptive error
 * (in Bahasa Indonesia) when access is denied.
 *
 * @throws Error if access is not permitted.
 */
export function assertBranchAccess(
  userTenantId: string | undefined,
  branchTenantId: string,
  userRole: AppRole,
): void {
  if (!canAccessBranch(userTenantId, branchTenantId, userRole)) {
    throw new Error(
      `Akses ditolak: Anda tidak memiliki akses ke cabang ini. ` +
        `Akses terbatas pada cabang dalam tenant Anda sendiri.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Context validation
// ---------------------------------------------------------------------------

/**
 * Determine whether the user has a **valid** tenant / branch context for
 * application operations.
 *
 * - System roles → always valid (they operate at the platform level and do
 *   not require a tenant or branch id).
 * - Tenant roles → valid **only** when a `tenantId` is present.  A branch id
 *   is optional: if omitted or null, the user can still operate at the tenant
 *   scope; if provided, it must be a non‑empty string (actual existence is
 *   a separate concern).
 * - `"unaffiliated"` or null/undefined → **not** valid.
 *
 * @param role     Resolved role (AppRole, "unaffiliated", or nullish).
 * @param tenantId The user's current tenant id (may be undefined).
 * @param branchId Optional branch id to also check.
 */
export function hasValidContext(
  role: AppRole | "unaffiliated" | null | undefined,
  tenantId: string | undefined,
  branchId?: string | null,
): boolean {
  // System roles are always valid — they work at the platform level.
  if (typeof role === "string" && isSystemRoleType(role)) {
    return true;
  }

  // Recognised tenant roles need at least a tenant id.
  if (
    typeof role === "string" &&
    role !== "unaffiliated" &&
    !isSystemRoleType(role)
  ) {
    if (typeof tenantId !== "string" || tenantId.length === 0) {
      return false;
    }
    // If a branchId was explicitly provided, require it to be truthy.
    if (arguments.length >= 3 && (branchId === undefined || branchId === null)) {
      return false;
    }
    return true;
  }

  // unaffiliated, null, undefined — none of these have valid context.
  return false;
}

// ---------------------------------------------------------------------------
// Effective scope
// ---------------------------------------------------------------------------

/**
 * Return the **effective scope level** that applies to the user based on
 * their role and the presence of tenant / branch identifiers.
 *
 * Returns one of:
 *   "platform" — system role (operates across all tenants / branches).
 *   "branch"   — tenant role with both tenantId and branchId set.
 *   "tenant"   — tenant role with tenantId set but no branchId.
 *   "none"     — no viable context.
 *
 * @param role     Resolved role (AppRole, string, or nullish).
 * @param tenantId Optional tenant id.
 * @param branchId Optional branch id.
 */
export function getEffectiveScope(
  role: AppRole | string | null | undefined,
  tenantId?: string | null,
  branchId?: string | null,
): ScopeLevel {
  // ── platform scope ──────────────────────────────────────────────
  if (typeof role === "string" && isSystemRoleType(role)) {
    return "platform";
  }

  // ── tenant / branch scope ───────────────────────────────────────
  if (
    typeof role === "string" &&
    typeof tenantId === "string" &&
    tenantId.length > 0
  ) {
    if (typeof branchId === "string" && branchId.length > 0) {
      return "branch";
    }
    return "tenant";
  }

  // ── no valid context ────────────────────────────────────────────
  return "none";
}
