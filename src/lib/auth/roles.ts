import type { AppRole, Permission, SystemRole, BusinessRole } from "@/types";

// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH: Role-to-Permission mapping
// ---------------------------------------------------------------------------

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
    "settings.view",
    "settings.edit",
    "logs.view",
    "expired.view",
    "expired.edit",
    "platform.view",
    "platform.tenants.manage",
    "platform.expansions.approve",
    "platform.quotas.manage",
    "platform.maintenance.manage",
    "platform.monitoring.view",
  ],

  developer: [
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
    "settings.view",
    "settings.edit",
    "logs.view",
    "expired.view",
    "expired.edit",
    "platform.view",
    "platform.tenants.manage",
    "platform.expansions.approve",
    "platform.quotas.manage",
    "platform.maintenance.manage",
    "platform.monitoring.view",
  ],

  support: [
    "inventory.stock.view",
    "reports.sales.view",
    "reports.inventory.view",
    "products.view",
    "suppliers.view",
    "purchases.view",
    "users.view",
    "settings.view",
    "logs.view",
    "expired.view",
  ],

  // ====== Business roles (apotek operational) ======
  owner: [
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
    "settings.view",
    "settings.edit",
    "logs.view",
    "expired.view",
    "expired.edit",
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
  ],

  cashier: [
    "cashier.transaction.create",
    "inventory.stock.view",
    "expired.view",
    "products.view",
  ],
};

// ---------------------------------------------------------------------------
// Helper constants
// ---------------------------------------------------------------------------

export const SYSTEM_ROLES: readonly SystemRole[] = [
  "super_admin",
  "developer",
  "support",
];

export const BUSINESS_ROLES: readonly BusinessRole[] = [
  "owner",
  "pharmacist",
  "admin",
  "cashier",
];

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  developer: "Developer",
  support: "Support",
  owner: "Pemilik",
  pharmacist: "Apoteker",
  admin: "Admin",
  cashier: "Kasir",
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
