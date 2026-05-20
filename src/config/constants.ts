export const APP_NAME = "Apotek Manage";

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 68;
export const MOBILE_BOTTOM_NAV_HEIGHT = 56;

export const TOAST_DURATION = 4000;

export const QUERY_STALE_TIME = 1000 * 60 * 5; // 5 min
export const QUERY_RETRY = 2;

/** Business day boundary hour (0-23). A business day runs from this hour
 *  to the same hour the next day. Default 05:00 (5 AM). */
export const BUSINESS_DAY_HOUR = 5;

/** Max sync retry attempts for failed pending entries */
export const MAX_SYNC_RETRIES = 3;

/** Default maintenance banner message (Indonesian) */
export const MAINTENANCE_DEFAULT_MESSAGE =
  "Sistem sedang dalam pemeliharaan. Transaksi baru sementara ditutup. Silakan selesaikan transaksi aktif.";

/** Quota warning threshold — warn when usage reaches this percentage */
export const QUOTA_WARNING_THRESHOLD = 0.8;

/** Max hours a sync batch remains valid before expiry */
export const SYNC_BATCH_MAX_AGE_HOURS = 24;

/** Enterprise hardening */

/** Days of audit entries retained before pruning */
export const AUDIT_RETENTION_DAYS = 90;

/** Max entries in operational event ring buffer */
export const EVENT_LOG_MAX_SIZE = 1000;

/** Max retry attempts for recovery actions */
export const RECOVERY_MAX_RETRIES = 3;

/** Base delay between recovery retries (ms) */
export const RECOVERY_RETRY_DELAY_MS = 2000;

/** Interval for flushing metrics collection (ms) */
export const METRICS_FLUSH_INTERVAL_MS = 30000;

/** Number of backup checkpoints retained */
export const BACKUP_CHECKPOINT_COUNT = 5;

/** Per-page limit for audit log tables */
export const MAX_AUDIT_PAGE_SIZE = 50;

/** Default page size for paginated queries */
export const DEFAULT_PAGE_SIZE = 20;

/** Regex pattern for valid tenant slugs */
export const TENANT_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** All available roles in the system */
export const ROLES = ["super_admin", "tenant_owner", "admin", "pharmacist", "cashier", "staff"] as const;

/** Platform-level system roles */
export const SYSTEM_ROLES = ["super_admin"] as const;

/** Per-tenant operational roles */
export const TENANT_ROLES = ["tenant_owner", "admin", "pharmacist", "cashier", "staff"] as const;
