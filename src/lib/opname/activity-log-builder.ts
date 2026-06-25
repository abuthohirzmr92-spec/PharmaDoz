// ---------------------------------------------------------------------------
// RC1 P0H.3 — Activity Log Builder (PURE)
// ---------------------------------------------------------------------------
// Converts Domain Events → ActivityLogEntry.
// Never reads Store, Repository, React, Supabase, or Zustand.
// ---------------------------------------------------------------------------

import type { SessionAction, ActivityLogInput } from "./activity-log-types";

export interface SessionDomainEvent {
  type: SessionAction;
  sessionId: string;
  userId: string;
  tenantId: string;
  branchId: string | null;
  timestamp: string;
  itemKey?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Build an ActivityLogInput from a SessionDomainEvent.
 * PURE function — deterministic, no side effects.
 */
export function buildActivityLog(event: SessionDomainEvent): ActivityLogInput {
  const base: ActivityLogInput = {
    tenantId: event.tenantId,
    branchId: event.branchId,
    userId: event.userId,
    action: event.type,
    entityType: "session",
    entityId: event.sessionId,
    description: event.description ?? getDefaultDescription(event),
    metadata: event.metadata ?? {},
  };

  // Per-item events have entityType = "session_item"
  if (event.itemKey) {
    base.entityType = "session_item";
    base.entityId = event.itemKey;
  }

  return base;
}

function getDefaultDescription(event: SessionDomainEvent): string {
  switch (event.type) {
    case "SESSION_STARTED":    return `Session dimulai.`;
    case "SESSION_PAUSED":     return `Session dijeda.`;
    case "SESSION_RESUMED":    return `Session dilanjutkan.`;
    case "ITEM_COUNTED":       return `Item dihitung${event.itemKey ? `: ${event.itemKey}` : ""}.`;
    case "ITEM_UPDATED":       return `Item diperbarui${event.itemKey ? `: ${event.itemKey}` : ""}.`;
    case "ITEM_SKIPPED":       return `Item dilewati${event.itemKey ? `: ${event.itemKey}` : ""}.`;
    case "SESSION_COMPLETED":  return `Semua item selesai dihitung.`;
    case "SESSION_REVIEWED":   return `Session direview.`;
    case "SESSION_POSTED":     return `Adjustment diposting.`;
    case "SESSION_ARCHIVED":   return `Session diarsipkan.`;
    case "SESSION_CANCELLED":  return `Session dibatalkan.`;
    default:                   return event.type;
  }
}

// ============================================================================
// Bulk builder — for batch events (e.g., all items counted in one opname)
// ============================================================================

export function buildItemCountedLogs(
  sessionId: string,
  userId: string,
  tenantId: string,
  branchId: string | null,
  itemKeys: string[],
): ActivityLogInput[] {
  return itemKeys.map((key) => ({
    tenantId,
    branchId,
    userId,
    action: "ITEM_COUNTED" as SessionAction,
    entityType: "session_item",
    entityId: key,
    description: `Item dihitung: ${key}`,
  }));
}
