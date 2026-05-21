/* ------------------------------------------------------------------ */
/*  Package & Limits Utilities                                         */
/*  Extends src/lib/quota-guard.ts for billing-specific helpers.       */
/* ------------------------------------------------------------------ */

import type { TenantPackage, QuotaCheckResult, TenantQuotaInfo } from "@/types";
import { canAddBranch as guardCanAddBranch, canAddUser as guardCanAddUser } from "@/lib/quota-guard";

/* ------------------------------------------------------------------ */
/*  Package defaults (mirrors quota-guard.ts for re-export)            */
/* ------------------------------------------------------------------ */

const PACKAGE_DEFAULTS: Record<TenantPackage, Omit<TenantQuotaInfo, "currentUsers" | "currentBranches">> = {
  basic: { packageName: "basic", maxUsers: 3, maxBranches: 1, maxProducts: 200 },
  professional: { packageName: "professional", maxUsers: 10, maxBranches: 3, maxProducts: 1000 },
  enterprise: { packageName: "enterprise", maxUsers: 50, maxBranches: 10, maxProducts: 10000 },
};

/* ------------------------------------------------------------------ */
/*  Re-export compatible helpers                                       */
/* ------------------------------------------------------------------ */

/**
 * Returns a copy of the package default limits (without current usage).
 */
export { PACKAGE_DEFAULTS };

/**
 * Returns the max limits for a given package.
 */
export function getPackageLimits(pkg: TenantPackage): Omit<TenantQuotaInfo, "currentUsers" | "currentBranches"> {
  return { ...PACKAGE_DEFAULTS[pkg] };
}

/**
 * Build a QuotaCheckResult for a resource.
 */
export function checkQuotaAllowed(
  current: number,
  max: number,
  resource: "users" | "branches" | "products",
): QuotaCheckResult {
  return {
    allowed: current < max,
    current,
    max,
    resource,
  };
}

/* ------------------------------------------------------------------ */
/*  Branch & User helpers                                              */
/* ------------------------------------------------------------------ */

/**
 * Check if a tenant can add more branches.
 */
export function canAddBranch(currentBranches: number, packageName: TenantPackage): QuotaCheckResult {
  return checkQuotaAllowed(currentBranches, PACKAGE_DEFAULTS[packageName].maxBranches, "branches");
}

/**
 * Check if a tenant can add more users.
 */
export function canAddUser(currentUsers: number, packageName: TenantPackage): QuotaCheckResult {
  return checkQuotaAllowed(currentUsers, PACKAGE_DEFAULTS[packageName].maxUsers, "users");
}

/* ------------------------------------------------------------------ */
/*  Labels & Features                                                  */
/* ------------------------------------------------------------------ */

const PACKAGE_LABELS: Record<TenantPackage, string> = {
  basic: "Basic",
  professional: "Professional",
  enterprise: "Enterprise",
};

/**
 * Get display name for package (Indonesian context).
 */
export function getPackageLabel(pkg: TenantPackage): string {
  return PACKAGE_LABELS[pkg];
}

const PACKAGE_FEATURES: Record<TenantPackage, string[]> = {
  basic: [
    "Maksimal 3 pengguna",
    "Maksimal 1 cabang",
    "Hingga 200 produk",
    "Laporan penjualan dasar",
    "Dukungan email",
  ],
  professional: [
    "Maksimal 10 pengguna",
    "Maksimal 3 cabang",
    "Hingga 1.000 produk",
    "Laporan penjualan & inventaris",
    "Manajemen stok lengkap",
    "Dukungan prioritas",
    "Multi-cabang",
  ],
  enterprise: [
    "Maksimal 50 pengguna",
    "Maksimal 10 cabang",
    "Hingga 10.000 produk",
    "Semua fitur Professional",
    "API akses",
    "White-label",
    "Dedicated support",
    "SLA terjamin",
    "Audit log lengkap",
  ],
};

/**
 * Get feature list for a package.
 */
export function getPackageFeatures(pkg: TenantPackage): string[] {
  return [...PACKAGE_FEATURES[pkg]];
}
