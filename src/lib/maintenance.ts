import type { MaintenanceConfig } from "@/types";

/* ------------------------------------------------------------------ */
/*  Maintenance Utility Functions                                      */
/* ------------------------------------------------------------------ */

/**
 * Returns true if maintenance is currently active for the given tenant.
 *
 * - "none"                     → false
 * - "global" scope             → applies to all tenants
 * - "tenant" scope             → only if pharmacyId is in tenantIds
 */
export function isMaintenanceActive(
  config: MaintenanceConfig,
  pharmacyId?: string,
): boolean {
  if (config.mode === "none") return false;

  if (config.scope === "global") return true;

  // tenant scope
  if (!pharmacyId) return false;
  return config.tenantIds.includes(pharmacyId);
}

/**
 * Returns true if new transactions can be created under the given config.
 *
 * - "none" or "readonly" → true (readonly allows completing existing work)
 * - "full" or "scheduled"  → false (during active window)
 */
export function canCreateTransaction(
  config: MaintenanceConfig,
  pharmacyId?: string,
): boolean {
  if (config.mode === "none") return true;
  if (config.mode === "readonly") return true;

  // For "full" and "scheduled": check if it applies to this tenant
  if (!isMaintenanceActive(config, pharmacyId)) return true;

  return false;
}

/**
 * Returns true if the current time falls within a scheduled maintenance
 * window, or if maintenance is already active (readonly / full).
 *
 * - "scheduled": compares now against startedAt → scheduledEndAt
 * - "none":      false
 * - "readonly", "full": true (already active)
 */
export function isInMaintenanceWindow(
  config: MaintenanceConfig,
): boolean {
  if (config.mode === "none") return false;

  if (config.mode === "readonly" || config.mode === "full") return true;

  // scheduled: check window
  if (config.mode === "scheduled") {
    const now = Date.now();
    const start = config.startedAt ? new Date(config.startedAt).getTime() : null;
    const end = config.scheduledEndAt
      ? new Date(config.scheduledEndAt).getTime()
      : null;

    if (start !== null && end !== null) {
      return now >= start && now < end;
    }
    if (start !== null) {
      return now >= start;
    }
    return false;
  }

  return false;
}

/**
 * Format an ISO timestamp to Indonesian locale string.
 *
 * Example: "19 Mei 2026, 14:30"
 */
export function formatMaintenanceTime(isoTime: string): string {
  const date = new Date(isoTime);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
