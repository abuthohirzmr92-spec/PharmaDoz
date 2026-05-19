// ---------------------------------------------------------------------------
// System roles (platform/internal — future SaaS)
// ---------------------------------------------------------------------------
export type SystemRole = "super_admin" | "developer" | "support";

// ---------------------------------------------------------------------------
// Business roles (apotek operational)
// ---------------------------------------------------------------------------
export type BusinessRole = "owner" | "pharmacist" | "admin" | "cashier";

// ---------------------------------------------------------------------------
// Combined role for auth store
// ---------------------------------------------------------------------------
export type AppRole = SystemRole | BusinessRole;

// ---------------------------------------------------------------------------
// Deprecated — use BusinessRole instead
// ---------------------------------------------------------------------------
/** @deprecated Use BusinessRole instead */
export type Role = BusinessRole;

// ---------------------------------------------------------------------------
// Permissions (18 granular permissions following "<domain>.<action>" pattern)
// ---------------------------------------------------------------------------
export type Permission =
  | "inventory.stock.view"
  | "inventory.stock.edit"
  | "cashier.transaction.create"
  | "cashier.transaction.void"
  | "reports.sales.view"
  | "reports.inventory.view"
  | "products.view"
  | "products.edit"
  | "suppliers.view"
  | "suppliers.edit"
  | "purchases.create"
  | "purchases.view"
  | "users.view"
  | "users.edit"
  | "settings.view"
  | "settings.edit"
  | "logs.view"
  | "expired.view"
  | "expired.edit";

// ---------------------------------------------------------------------------
// Auth mode
// ---------------------------------------------------------------------------
export type AuthMode = "demo" | "supabase";

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  systemRole?: SystemRole;
  isActive: boolean;
  pharmacyId?: string;
  pharmacyName?: string;
}

// ---------------------------------------------------------------------------
// Tenant packages & quotas (SaaS foundation)
// ---------------------------------------------------------------------------
export type TenantPackage = "basic" | "professional" | "enterprise";

export interface TenantQuotaInfo {
  packageName: TenantPackage;
  maxUsers: number;
  currentUsers: number;
  maxBranches: number;
  currentBranches: number;
  maxProducts: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  max: number;
  resource: "users" | "branches" | "products";
}

// ---------------------------------------------------------------------------
// Platform stats (preparatory — multi-tenancy dashboard)
// ---------------------------------------------------------------------------
export interface PlatformStats {
  totalPharmacies: number;
  totalUsers: number;
  pendingExpansions: number;
  activePackages: { basic: number; professional: number; enterprise: number };
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
export interface NavItemConfig {
  label: string;
  href: string;
  icon: string;
  permission?: Permission;
  children?: NavItemConfig[];
}

// ---------------------------------------------------------------------------
// Network & Sync State
// ---------------------------------------------------------------------------
export type NetworkStatus = "online" | "offline" | "degraded" | "syncing";

export type SyncEntryStatus = "pending" | "syncing" | "synced" | "failed";

// ---------------------------------------------------------------------------
// Business Day & Daily Bucket
// ---------------------------------------------------------------------------
export interface DailyBucket {
  /** ISO date key (YYYY-MM-DD) of the business day */
  businessDay: string;
  /** When the bucket was opened (ISO) */
  openedAt: string;
  /** When the bucket was closed (ISO), null if still open */
  closedAt: string | null;
  /** Pharmacy tenant scope */
  pharmacyId: string;
  /** Count of transactions in this bucket */
  transactionCount: number;
  /** SHA-256 checksum of serialized bucket data */
  checksum: string | null;
}

// ---------------------------------------------------------------------------
// Pending Sync (offline queue entries)
// ---------------------------------------------------------------------------
export interface PendingSyncEntry {
  /** Unique idempotency key */
  id: string;
  /** Business day this entry belongs to */
  businessDay: string;
  /** Type of operation queued */
  type: "transaction" | "movement" | "opname" | "purchase";
  /** Serialized payload */
  payload: unknown;
  /** Creation timestamp (ISO) */
  createdAt: string;
  /** Current sync status */
  syncStatus: SyncEntryStatus;
  /** Number of sync attempts */
  attempts: number;
  /** Last error message if failed */
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// Sync Batch (staged replacement target)
// ---------------------------------------------------------------------------
export interface SyncBatch {
  /** Unique batch ID for idempotent sync */
  batchId: string;
  /** Business day this batch covers */
  businessDay: string;
  /** Tenant scope */
  pharmacyId: string;
  /** Entries included in this batch */
  entryCount: number;
  /** SHA-256 checksum of all entries */
  checksum: string;
  /** Current stage: staging → validated → replaced → finalized */
  stage: "staging" | "validated" | "replaced" | "finalized";
  /** When the batch was created (ISO) */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Sync Validation Result
// ---------------------------------------------------------------------------
export interface SyncValidationResult {
  valid: boolean;
  checksumMatch: boolean;
  transactionCountMatch: boolean;
  errors: string[];
}
