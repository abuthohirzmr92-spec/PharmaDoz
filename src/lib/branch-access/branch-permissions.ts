// ---------------------------------------------------------------------------
// Branch-Scoped Permission Checks
// ---------------------------------------------------------------------------
// Extends the existing permission system (@/lib/auth/permissions) to add
// branch context awareness.  Certain permissions (e.g. inventory.stock.view)
// require an active branch context.  Multi-branch admins (tenant_owner, admin)
// can use them across all branches.  Restricted users (pharmacist, cashier,
// staff) can only use them for their assigned branch.
//
// Pure utility module — no React, no stores, no side effects.
// ---------------------------------------------------------------------------

import type { AppRole, Permission } from "@/types";
import { hasPermission } from "@/lib/auth/permissions";
import { isPlatformUser } from "@/lib/auth/role-resolver";

/**
 * Permissions that require branch scoping.
 * When a user has one of these permissions, it must be checked WITHIN a branch
 * context rather than at the tenant level.
 */
export const BRANCH_SCOPED_PERMISSIONS: ReadonlySet<string> = new Set([
  "inventory.stock.view",
  "inventory.stock.adjust",
  "products.view",
  "products.create",
  "products.edit",
  "cashier.transaction.create",
  "cashier.transaction.view",
  "reports.sales.view",
  "reports.financial.view",
]);

/**
 * Returns true if the permission is branch-scoped (requires branch context).
 */
export function isBranchScopedPermission(
  permission: Permission | string,
): boolean {
  return BRANCH_SCOPED_PERMISSIONS.has(permission);
}

/**
 * Validates that a user can perform an action in the given branch context.
 *
 * Rules:
 * 1. If the role does not have the permission at all → false.
 * 2. If the permission is NOT branch-scoped → true (tenant-level permission
 *    is sufficient).
 * 3. If the permission IS branch-scoped but no branchId is given → false.
 * 4. If the user is restricted ("assigned" level) and has an assigned branch,
 *    the branchId must match that assigned branch.
 * 5. Otherwise → true.
 */
export function canPerformInBranch(
  role: AppRole | null | undefined,
  permission: Permission,
  branchId: string | null | undefined,
  assignedBranchId?: string | null,
): boolean {
  // Must have a valid role
  if (!role) return false;

  // Platform users do not operate in branch contexts
  if (isPlatformUser(role)) return false;

  // Check base permission
  if (!hasPermission(role, permission)) return false;

  // Non-branch-scoped permissions are always valid
  if (!isBranchScopedPermission(permission)) return true;

  // Branch-scoped permission: must have a branch context
  if (!branchId) return false;

  // Restricted users can only act on their assigned branch
  if (assignedBranchId && branchId !== assignedBranchId) return false;

  return true;
}
