// ---------------------------------------------------------------------------
// System roles (platform/internal — SaaS)
// ---------------------------------------------------------------------------
export type SystemRole = "super_admin" | "developer" | "support_ai";

// ---------------------------------------------------------------------------
// Tenant roles (per-tenant operational)
// ---------------------------------------------------------------------------
export type TenantRole = "tenant_owner" | "admin" | "pharmacist" | "cashier" | "staff";

// ---------------------------------------------------------------------------
// Combined role for auth store
// ---------------------------------------------------------------------------
export type AppRole = SystemRole | TenantRole;

// ---------------------------------------------------------------------------
// Deprecated — use TenantRole instead
// ---------------------------------------------------------------------------
/** @deprecated Use TenantRole instead */
export type BusinessRole = TenantRole;

/** @deprecated Use BusinessRole instead */
export type Role = BusinessRole;

// ---------------------------------------------------------------------------
// Permissions (25+ granular permissions following "<domain>.<action>" pattern)
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
  | "tenant.users.invite"
  | "settings.view"
  | "settings.edit"
  | "tenant.settings.edit"
  | "logs.view"
  | "expired.view"
  | "expired.edit"
  | "billing.view"
  | "platform.view"
  | "platform.tenants.manage"
  | "platform.expansions.approve"
  | "platform.quotas.manage"
  | "platform.maintenance.manage"
  | "platform.monitoring.view"
  | "finance.wallet.view"
  | "finance.wallet.manage"
  | "finance.wallet.transfer"
  | "finance.wallet.reports";

// ---------------------------------------------------------------------------
// Financial Wallet Types
// ---------------------------------------------------------------------------
export type WalletType = "cash" | "bank" | "digital";
export type WalletTransactionType = "credit" | "debit";
export type WalletSourceType =
  | "sale"
  | "purchase"
  | "expense"
  | "transfer_in"
  | "transfer_out"
  | "adjustment"
  | "capital_in"
  | "capital_out";
export type WalletTransferStatus = "pending" | "completed" | "rejected";
export type WalletCategoryType = "income" | "expense";

export interface FinancialWallet {
  id: string;
  tenantId: string;
  name: string;
  type: WalletType;
  branchId: string | null;
  currency: string;
  isActive: boolean;
  isArchived: boolean;
  allowOverdraft: boolean;
  overdraftLimit: number;
  balance: number; // computed
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  runningBalance: number;
  sourceType: WalletSourceType;
  sourceId: string | null;
  description: string | null;
  branchId: string | null;
  transactionDate: string;
  accountCode: string | null;
  isReconciled: boolean;
  reconciledAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Sales Return Types
// ---------------------------------------------------------------------------
export interface SalesReturn {
  id: string;
  tenantId: string;
  originalTransactionId: string;
  referenceNumber: string;
  returnDate: string;
  reason: string | null;
  refundMethod: string;
  refundWalletId: string | null;
  refundAmount: number;
  status: "confirmed" | "refunded";
  conductedBy: string | null;
  notes: string | null;
  items: SalesReturnItem[];
  allocations: SalesReturnAllocation[];
  createdAt: string;
  updatedAt: string;
}

export interface SalesReturnItem {
  id: string;
  returnId: string;
  originalTransactionItemId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: string;
}

export interface SalesReturnAllocation {
  id: string;
  returnId: string;
  saleAllocationId: string;
  batchId: string;
  quantity: number;
  costPrice: number;
  subtotalCost: number;
  tenantId: string | null;
  createdAt: string;
}

export interface WalletTransfer {
  id: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  fee: number;
  status: WalletTransferStatus;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WalletCategory {
  id: string;
  tenantId: string | null;
  name: string;
  type: WalletCategoryType;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Financial Insight Types — Owner Capital
// ---------------------------------------------------------------------------
export interface CapitalTransaction {
  id: string;
  tenantId: string;
  branchId: string | null;
  walletId: string | null;
  type: "deposit" | "withdrawal";
  amount: number;
  description: string | null;
  transactionDate: string;
  actorId: string | null;
  createdAt: string;
}

export interface WalletAuditLog {
  id: string;
  tenantId: string;
  walletId: string;
  action: string;
  actorId: string;
  previousBalance: number | null;
  newBalance: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ---------------------------------------------------------------------------
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
  // Legacy fields (pharmacy-scoped)
  pharmacyId?: string;
  pharmacyName?: string;
  // New fields (tenant-scoped)
  tenantId?: string;
  tenantName?: string;
  avatarUrl?: string | null;
  phone?: string | null;
  lastLoginAt?: string | null;
}

// ---------------------------------------------------------------------------
// Tenant — core SaaS entity
// ---------------------------------------------------------------------------
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  settings?: Record<string, unknown>;
  isActive: boolean;
  packageId?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// ---------------------------------------------------------------------------
// Profile — links auth.users to tenant context
// ---------------------------------------------------------------------------
export interface Profile {
  id: string; // = auth.users.id
  tenantId?: string | null;
  displayName: string;
  system_role?: string | null; // "super_admin" | "developer" | "support_ai" | null
  avatarUrl?: string | null;
  phone?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// TenantUser — role assignment within a tenant
// ---------------------------------------------------------------------------
export interface TenantUser {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantRole;
  isActive: boolean;
  invitedAt?: string | null;
  joinedAt?: string | null;
}

// ---------------------------------------------------------------------------
// Subscription — tenant billing & plan
// ---------------------------------------------------------------------------
export interface Subscription {
  id: string;
  tenantId: string;
  packageId: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "expired";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string | null;
  canceledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Payment — subscription payment record
// ---------------------------------------------------------------------------
export interface Payment {
  id: string;
  subscriptionId?: string | null;
  tenantId: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "refunded";
  paymentMethod?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Subscription events — lifecycle audit trail
// ---------------------------------------------------------------------------
export interface SubscriptionEvent {
  id: string;
  subscriptionId: string;
  tenantId: string;
  eventType:
    | "trial_started"
    | "trial_ended"
    | "trial_converted"
    | "subscription_created"
    | "subscription_updated"
    | "upgraded"
    | "downgraded"
    | "suspended"
    | "reactivated"
    | "canceled"
    | "expired"
    | "renewed"
    | "package_changed";
  previousPackageId?: string | null;
  newPackageId?: string | null;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Package Feature — feature-to-package mapping
// ---------------------------------------------------------------------------
export interface PackageFeature {
  id: string;
  packageId: string;
  featureKey: string;
  isEnabled: boolean;
  config?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Invoice — billing invoice
// ---------------------------------------------------------------------------
export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId?: string | null;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "canceled" | "refunded";
  dueDate?: string | null;
  paidAt?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// ActivityLog — audit trail / activity events
// ---------------------------------------------------------------------------
export interface ActivityLog {
  id: string;
  tenantId?: string | null;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// SyncQueueEntry — offline sync queue
// ---------------------------------------------------------------------------
export interface SyncQueueEntry {
  id: string;
  tenantId: string;
  businessDay: string;
  entryType: "transaction" | "stock_movement" | "stock_opname" | "purchase_invoice" | "product" | "batch";
  payload: Record<string, unknown>;
  idempotencyKey: string;
  status: "pending" | "syncing" | "synced" | "failed";
  attempts: number;
  lastError?: string | null;
  createdAt: string;
  syncedAt?: string | null;
}

// ---------------------------------------------------------------------------
// OfflineSession — tracks device offline periods
// ---------------------------------------------------------------------------
export interface OfflineSession {
  id: string;
  tenantId: string;
  deviceId?: string | null;
  startedAt: string;
  lastHeartbeat: string;
  endedAt?: string | null;
  transactionCount: number;
}

// ---------------------------------------------------------------------------
// Context Types
// ---------------------------------------------------------------------------
export interface TenantContext {
  tenantId: string;
  role: AppRole;
  userId: string;
}

// ---------------------------------------------------------------------------
// Tenant Branding — white-label theming per tenant
// ---------------------------------------------------------------------------
export interface TenantBranding {
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  themeMode?: "light" | "dark" | "system";
  customDomain?: string | null;
  faviconUrl?: string | null;
  companyName?: string | null;
  receiptFooter?: string | null;
  address?: string | null;
  phone?: string | null;
}

// ---------------------------------------------------------------------------
// API Types
// ---------------------------------------------------------------------------
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
// Platform stats (multi-tenancy dashboard)
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

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------
export type MaintenanceMode = "none" | "readonly" | "scheduled" | "full";

export type MaintenanceScope = "global" | "tenant";

export interface MaintenanceConfig {
  mode: MaintenanceMode;
  scope: MaintenanceScope;
  message: string;
  startedAt: string | null;
  scheduledEndAt: string | null;
  /** Tenant IDs affected when scope is "tenant" */
  tenantIds: string[];
}

// ---------------------------------------------------------------------------
// Store Expansion
// ---------------------------------------------------------------------------
export type ExpansionStatus = "pending" | "approved" | "rejected" | "provisioned";

export interface ExpansionRequest {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  ownerId: string;
  ownerName: string;
  requestedStoreName: string;
  requestedLocation: string;
  reason: string;
  status: ExpansionStatus;
  approverId: string | null;
  approverName: string | null;
  approvalNotes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// ---------------------------------------------------------------------------
// Tenant Governance
// ---------------------------------------------------------------------------
export interface TenantSummary {
  pharmacyId: string;
  pharmacyName: string;
  packageName: TenantPackage;
  ownerName: string;
  userCount: number;
  branchCount: number;
  isActive: boolean;
  lastActiveAt: string | null;
  lastSyncAt: string | null;
  transactionVolume: number;
  createdAt: string;
}

export interface TenantDetail extends TenantSummary {
  quotaUsage: TenantQuotaInfo;
  recentTransactions: number;
  pendingExpansions: number;
  activeMaintenance: boolean;
}

// ---------------------------------------------------------------------------
// Category & Supplier Master
// ---------------------------------------------------------------------------
export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
  createdAt: string;
}

export interface SupplierActivity {
  id: string;
  supplierId: string;
  type: "purchase" | "payment" | "update" | "note";
  description: string;
  amount: number | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Platform Monitoring
// ---------------------------------------------------------------------------
export interface PlatformHealth {
  activeTenants: number;
  totalTenants: number;
  failedTransactions24h: number;
  offlineTenants: number;
  syncFailures24h: number;
  activeMaintenances: number;
  quotaAlerts: number;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Audit Trail
// ---------------------------------------------------------------------------
export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.session_expired"
  | "auth.role_switch"
  | "transaction.create"
  | "transaction.void"
  | "inventory.movement"
  | "inventory.opname"
  | "inventory.expired_writeoff"
  | "expansion.approve"
  | "expansion.reject"
  | "quota.change"
  | "maintenance.enable"
  | "maintenance.disable"
  | "tenant.suspend"
  | "tenant.activate";

export interface AuditEntry {
  id: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  pharmacyId: string | null;
  resourceType: string;
  resourceId: string;
  /** JSON snapshot before change */
  before: Record<string, unknown> | null;
  /** JSON snapshot after change */
  after: Record<string, unknown> | null;
  /** Additional structured metadata */
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditFilter {
  action?: AuditAction;
  actorId?: string;
  resourceType?: string;
  from?: string;
  to?: string;
}

// ---------------------------------------------------------------------------
// Operational Event Logging
// ---------------------------------------------------------------------------
export type EventLevel = "debug" | "info" | "warn" | "error" | "critical";

export type EventCategory =
  | "transaction"
  | "auth"
  | "sync"
  | "maintenance"
  | "network"
  | "permission"
  | "recovery"
  | "backup";

export interface OperationalEvent {
  id: string;
  level: EventLevel;
  category: EventCategory;
  message: string;
  details: Record<string, unknown> | null;
  pharmacyId: string | null;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Recovery & Resilience
// ---------------------------------------------------------------------------
export type RecoveryState = "idle" | "retrying" | "recovering" | "degraded" | "restored";

export interface RecoveryAction {
  id: string;
  type: string;
  status: "pending" | "retrying" | "completed" | "failed";
  attempts: number;
  maxAttempts: number;
  lastAttempt: string | null;
  error: string | null;
  result: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Operational Metrics
// ---------------------------------------------------------------------------
export type MetricName =
  | "transaction.latency_ms"
  | "transaction.volume"
  | "auth.success_rate"
  | "auth.failure_rate"
  | "sync.pending_count"
  | "sync.failure_rate"
  | "network.offline_duration_s"
  | "network.degraded_count"
  | "maintenance.active"
  | "tenant.active_count"
  | "recovery.attempts"
  | "queue.backlog_depth";

export interface MetricPoint {
  name: MetricName;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp: string;
}

export interface HealthSnapshot {
  overall: "healthy" | "degraded" | "down";
  components: Record<string, "healthy" | "degraded" | "down">;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Backup & Disaster Recovery
// ---------------------------------------------------------------------------
export type BackupType = "snapshot" | "incremental" | "full";

export type BackupStatus = "pending" | "in_progress" | "completed" | "failed";

export interface BackupMetadata {
  id: string;
  type: BackupType;
  status: BackupStatus;
  pharmacyId: string | null;
  startedAt: string;
  completedAt: string | null;
  size: number | null;
  checksum: string | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Branch — multi-branch pharmacy location
// ---------------------------------------------------------------------------
export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isMain: boolean;
  isActive: boolean;
  openingTime?: string | null;
  closingTime?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// ---------------------------------------------------------------------------
// OnboardingState — tenant onboarding wizard progress
// ---------------------------------------------------------------------------
export type OnboardingStep =
  | "welcome"
  | "profile_setup"
  | "branch_setup"
  | "product_setup"
  | "team_invite"
  | "done";

export interface OnboardingStepRecord {
  step: OnboardingStep | "provisioned";
  completedAt: string | null;
  completedBy: string | null;
}

export interface OnboardingState {
  id: string;
  tenantId: string;
  currentStep: OnboardingStep;
  stepsCompleted: OnboardingStepRecord[];
  data: Record<string, unknown>;
  isCompleted: boolean;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Provisioning — tenant provisioning types
// ---------------------------------------------------------------------------
export interface ProvisioningInput {
  ownerEmail: string;
  ownerDisplayName: string;
  tenantName: string;
  slug?: string;          // auto-generated from tenantName if empty
  domain?: string | null;
  packageSlug?: string;   // "basic" | "professional" | "enterprise", defaults to "basic"
  settings?: Record<string, unknown>;
}

export type ProvisioningStatus = "success" | "success_with_warning" | "failure";

export interface ProvisioningWarning {
  type: "email_delivery_failed" | "rpc_response_unreliable" | "auth_rate_limited";
  message: string;
  recoverable: boolean;
}

export interface ProvisioningResult {
  status: ProvisioningStatus;
  tenantId?: string;
  ownerUserId?: string;
  ownerEmail?: string;
  errors?: ProvisioningError[];
  warnings?: ProvisioningWarning[];
}

export interface ProvisioningError {
  code: ProvisioningErrorCode;
  message: string;
  field?: string;
  retryable: boolean;
  suggestion?: string;
}

export type ProvisioningErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "RACE_CONSTRAINT"
  | "DATABASE_ERROR"
  | "NETWORK_ERROR"
  | "UNAUTHORIZED";

export type ProvisioningAuditStatus =
  | "pending"
  | "success"
  | "failed"
  | "NEEDS_MANUAL_REVIEW";

export interface ProvisioningAudit {
  id: string;
  actorId: string;
  ownerEmail: string;
  ownerUserId?: string | null;
  tenantName: string;
  slug: string;
  packageId?: string | null;
  tenantId?: string | null;
  status: ProvisioningAuditStatus;
  errorMessage?: string | null;
  errorStep?: string | null;
  compensationAttempted: boolean;
  compensationError?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}
