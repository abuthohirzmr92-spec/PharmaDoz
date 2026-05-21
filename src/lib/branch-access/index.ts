// ---------------------------------------------------------------------------
// Branch Access Resolver
// ---------------------------------------------------------------------------
// Determines what branches a user can see and interact with based on their
// role.  Pure utility module — no React, no stores, no side effects.
// ---------------------------------------------------------------------------

import type { AppRole } from "@/types";
import type { Branch } from "@/lib/branch/branch-types";
import { isPlatformUser } from "@/lib/auth/role-resolver";

export type BranchAccessLevel = "all" | "assigned" | "none";

/**
 * Returns the user's branch access level.
 * - tenant_owner/admin → "all" (can see all branches within tenant)
 * - pharmacist/cashier/staff → "assigned" (can only see their assigned branch)
 * - platform users / unauthenticated → "none" (no branch access)
 */
export function getBranchAccessLevel(
  role: AppRole | null | undefined,
): BranchAccessLevel {
  // Unauthenticated users have no branch access
  if (!role) return "none";

  // Platform users (super_admin, developer, support_ai) operate at the
  // platform level and have no branch context
  if (isPlatformUser(role)) return "none";

  // Tenant owners and admins can see all branches within their tenant
  if (role === "tenant_owner" || role === "admin") return "all";

  // All other tenant roles (pharmacist, cashier, staff) are restricted to
  // their assigned branch
  return "assigned";
}

/**
 * Filters a list of branches to only those the user can access.
 * Returns an empty array when the user has no branch access.
 */
export function filterAccessibleBranches(
  branches: Branch[],
  role: AppRole | null | undefined,
  assignedBranchId?: string | null,
): Branch[] {
  const level = getBranchAccessLevel(role);

  if (level === "all") return branches;

  if (level === "assigned" && assignedBranchId) {
    return branches.filter((b) => b.id === assignedBranchId);
  }

  return [];
}

/**
 * Returns true if the user can switch between branches.
 * Only tenant_owner and admin roles have this ability.
 */
export function canSwitchBranch(role: AppRole | null | undefined): boolean {
  return getBranchAccessLevel(role) === "all";
}
