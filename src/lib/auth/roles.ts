import type { AppRole, Permission, SystemRole, TenantRole } from "@/types";

// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH: Role-to-Permission mapping
// ---------------------------------------------------------------------------
//
// Branch-scoped permissions (see @/lib/branch-access/branch-permissions):
//   inventory.stock.view, inventory.stock.adjust, products.view,
//   products.create, products.edit, cashier.transaction.create,
//   cashier.transaction.view, reports.sales.view, reports.financial.view
//
// These permissions require an active branch context.  Multi-branch admins
// (tenant_owner, admin) can use them across all branches.  Restricted users
// (pharmacist, cashier, staff) can only use them for their assigned branch.
//

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  // ====== System roles (platform/internal) ======
  super_admin: [
    "inventory.stock.view",
    "inventory.stock.edit",
    "cashier.transaction.create",
    "cashier.transaction.void",
    "reports.sales.view",
    "reports.inventory.view",
    "products.view",
    "products.edit",
    "suppliers.view",
    "suppliers.edit",
    "purchases.create",
    "purchases.view",
    "users.view",
    "users.edit",
    "tenant.users.invite",
    "settings.view",
    "settings.edit",
    "tenant.settings.edit",
    "logs.view",
    "expired.view",
    "expired.edit",
    "billing.view",
    "platform.view",
    "platform.tenants.manage",
    "platform.expansions.approve",
    "platform.quotas.manage",
    "platform.maintenance.manage",
    "platform.monitoring.view",
  ],

  developer: [
    "platform.view",
    "platform.tenants.manage",
    "platform.monitoring.view",
    "platform.maintenance.manage",
    "logs.view",
    "settings.view",
  ],

  support_ai: [
    "platform.view",
    "platform.monitoring.view",
    "platform.maintenance.manage",
    "logs.view",
  ],

  // ====== Tenant roles (per-tenant operational) ======
  tenant_owner: [
    "inventory.stock.view",
    "inventory.stock.edit",
    "cashier.transaction.create",
    "cashier.transaction.void",
    "reports.sales.view",
    "reports.inventory.view",
    "products.view",
    "products.edit",
    "suppliers.view",
    "suppliers.edit",
    "purchases.create",
    "purchases.view",
    "users.view",
    "users.edit",
    "tenant.users.invite",
    "settings.view",
    "settings.edit",
    "tenant.settings.edit",
    "logs.view",
    "expired.view",
    "expired.edit",
    "billing.view",
  ],

  admin: [
    "inventory.stock.view",
    "cashier.transaction.create",
    "cashier.transaction.void",
    "reports.sales.view",
    "reports.inventory.view",
    "products.view",
    "suppliers.view",
    "purchases.view",
    "expired.view",
    "users.view",
    "tenant.users.invite",
  ],

  pharmacist: [
    "inventory.stock.view",
    "inventory.stock.edit",
    "cashier.transaction.create",
    "cashier.transaction.void",
    "reports.sales.view",
    "reports.inventory.view",
    "products.view",
    "products.edit",
    "suppliers.view",
    "purchases.create",
    "purchases.view",
    "expired.view",
    "expired.edit",
  ],

  cashier: [
    "cashier.transaction.create",
    "inventory.stock.view",
    "expired.view",
    "products.view",
  ],

  staff: [
    "inventory.stock.view",
    "products.view",
    "reports.sales.view",
  ],
};

// ---------------------------------------------------------------------------
// Helper constants
// ---------------------------------------------------------------------------

export const SYSTEM_ROLES: readonly SystemRole[] = [
  "super_admin",
  "developer",
  "support_ai",
];

export const TENANT_ROLES: readonly TenantRole[] = [
  "tenant_owner",
  "admin",
  "pharmacist",
  "cashier",
  "staff",
];

/** @deprecated Use TENANT_ROLES instead */
export const BUSINESS_ROLES = TENANT_ROLES;

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  developer: "Developer",
  support_ai: "Support AI",
  tenant_owner: "Pemilik",
  admin: "Admin",
  pharmacist: "Apoteker",
  cashier: "Kasir",
  staff: "Staf",
};

// ---------------------------------------------------------------------------
// Re-export from permissions.ts
// ---------------------------------------------------------------------------

export { hasPermission } from "./permissions";

// ---------------------------------------------------------------------------
// Path-to-permission mapping for route access validation
// ---------------------------------------------------------------------------

const PATH_PERMISSION_MAP: Partial<Record<string, Permission>> = {
  "/admin/tenants": "platform.tenants.manage",
  "/admin/expansions": "platform.expansions.approve",
  "/admin/monitoring": "platform.monitoring.view",
  "/admin": "platform.view",
};

/**
 * Checks if a role can access a given route based on path-to-permission mapping.
 * Unlisted routes return true (accessible to authenticated users).
 */
export function validateRouteAccess(role: AppRole, path: string): boolean {
  const required = PATH_PERMISSION_MAP[path];
  if (!required) return true;
  return ROLE_PERMISSIONS[role]?.includes(required) ?? false;
}

/**
 * Returns true if the session's last active timestamp is older than maxAgeMs.
 * Default max age is 24 hours (86,400,000 ms).
 */
export function isSessionStale(
  lastActiveAt: string,
  maxAgeMs: number = 24 * 60 * 60 * 1000,
): boolean {
  const lastActive = new Date(lastActiveAt).getTime();
  const now = Date.now();
  return now - lastActive > maxAgeMs;
}

/**
 * Returns the required permission for a given path, or null if the path
 * does not require any specific permission.
 */
export function getRequiredPermissionForPath(
  path: string,
): Permission | null {
  return PATH_PERMISSION_MAP[path] ?? null;
}
