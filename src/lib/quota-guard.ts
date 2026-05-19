import type { AppRole } from "@/types";

/* ------------------------------------------------------------------ */
/*  Quota Types                                                         */
/* ------------------------------------------------------------------ */

export interface TenantQuota {
  packageName: string;
  maxUsers: number;
  currentUsers: number;
  maxBranches: number;
  currentBranches: number;
  maxProducts: number;
}

export interface QuotaCheck {
  allowed: boolean;
  current: number;
  max: number;
  resource: "users" | "branches" | "products";
}

/* ------------------------------------------------------------------ */
/*  Package defaults (offline / demo mode fallback)                     */
/* ------------------------------------------------------------------ */

const PACKAGE_DEFAULTS: Record<string, Omit<TenantQuota, "currentUsers" | "currentBranches">> = {
  basic:        { packageName: "basic", maxUsers: 3,  maxBranches: 1,  maxProducts: 200 },
  professional: { packageName: "professional", maxUsers: 10, maxBranches: 3,  maxProducts: 1000 },
  enterprise:   { packageName: "enterprise", maxUsers: 50, maxBranches: 10, maxProducts: 10000 },
};

/* ------------------------------------------------------------------ */
/*  Role slot limits per package                                        */
/* ------------------------------------------------------------------ */

const PACKAGE_ROLE_SLOTS: Record<string, Partial<Record<AppRole, number>>> = {
  basic:        { owner: 1, pharmacist: 1, admin: 1, cashier: 2 },
  professional: { owner: 1, pharmacist: 3, admin: 2, cashier: 5 },
  enterprise:   { owner: 2, pharmacist: 10, admin: 5, cashier: 20 },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Returns the maximum allowed users for a given package.
 * Used offline (demo mode) or when DB is unavailable.
 */
export function getPackageUserLimit(packageName = "basic"): number {
  return PACKAGE_DEFAULTS[packageName]?.maxUsers ?? 3;
}

/**
 * Returns the maximum allowed branches for a given package.
 */
export function getPackageBranchLimit(packageName = "basic"): number {
  return PACKAGE_DEFAULTS[packageName]?.maxBranches ?? 1;
}

/**
 * Returns role slot limits for a given package and role.
 */
export function getRoleSlotLimit(packageName: string, role: AppRole): number {
  return PACKAGE_ROLE_SLOTS[packageName]?.[role] ?? 0;
}

/**
 * Checks whether a given tenant can add another user.
 * Returns { allowed, current, max } for the "users" resource.
 */
export function canAddUser(
  currentCount: number,
  packageName = "basic",
): QuotaCheck {
  const max = getPackageUserLimit(packageName);
  return {
    allowed: currentCount < max,
    current: currentCount,
    max,
    resource: "users",
  };
}

/**
 * Checks whether a given tenant can add another branch.
 */
export function canAddBranch(
  currentCount: number,
  packageName = "basic",
): QuotaCheck {
  const max = getPackageBranchLimit(packageName);
  return {
    allowed: currentCount < max,
    current: currentCount,
    max,
    resource: "branches",
  };
}

/**
 * Returns the quota lock message in Indonesian.
 */
export function getQuotaLockMessage(resource: "users" | "branches", max: number): string {
  const labels: Record<string, string> = {
    users: `Batas pengguna tercapai (maks ${max}). Hubungi Super Admin untuk upgrade paket.`,
    branches: `Batas cabang tercapai (maks ${max}). Hubungi Super Admin untuk upgrade paket.`,
  };
  return labels[resource] ?? "Batas tercapai. Hubungi Super Admin untuk upgrade.";
}
