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
