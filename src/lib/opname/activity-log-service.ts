// ---------------------------------------------------------------------------
// RC1 P0H.3 — Activity Log Service (Orchestration)
// ---------------------------------------------------------------------------
// Subscribes to Domain Events. Called by PostingService and SessionStore.
// UI never touches this file.
// ---------------------------------------------------------------------------

import { buildActivityLog, type SessionDomainEvent } from "./activity-log-builder";
import type { ActivityLogInput } from "./activity-log-types";
import { logActivity } from "@/lib/audit/activity-logger";

/**
 * Log a session domain event to the activity trail.
 * Non-blocking — failures are silently ignored.
 *
 * RC1: Uses existing logActivity() from audit module.
 * RC2: Can be swapped to use Repository pattern (ActivityLogRepository).
 */
export async function logSessionEvent(event: SessionDomainEvent): Promise<void> {
  const entry = buildActivityLog(event);

  // Use existing audit infrastructure (Phase 1A already integrated)
  logActivity({
    action: entry.action,
    resourceType: entry.entityType,
    resourceId: entry.entityId,
    reference: event.sessionId,
    severity: getSeverity(event.type),
    metadata: {
      ...entry.metadata,
      module: "stock_opname",
      feature: "session",
      tenantId: entry.tenantId,
      branchId: entry.branchId,
      userId: entry.userId,
      timestamp: event.timestamp,
    },
  }).catch(() => {
    // Silent — activity log failure never blocks operations
  });
}

function getSeverity(action: string): "info" | "warning" | "critical" {
  switch (action) {
    case "SESSION_CANCELLED":
    case "SESSION_POSTED":
      return "warning";
    default:
      return "info";
  }
}

/**
 * Log multiple events at once (batch).
 * Each event is independent — one failure doesn't affect others.
 */
export async function logSessionEvents(events: SessionDomainEvent[]): Promise<void> {
  for (const event of events) {
    await logSessionEvent(event).catch(() => {});
  }
}
