// ---------------------------------------------------------------------------
// RC1 P0H.3 — Activity Log Domain Types
// ---------------------------------------------------------------------------
// Enterprise audit trail for Stock Opname lifecycle.
// Subscriber of Domain Events — never called directly by UI.
// ---------------------------------------------------------------------------

export const SESSION_ACTIONS = [
  "SESSION_STARTED",
  "SESSION_PAUSED",
  "SESSION_RESUMED",
  "ITEM_COUNTED",
  "ITEM_UPDATED",
  "ITEM_SKIPPED",
  "SESSION_COMPLETED",
  "SESSION_REVIEWED",
  "SESSION_POSTED",
  "SESSION_ARCHIVED",
  "SESSION_CANCELLED",
] as const;

export type SessionAction = typeof SESSION_ACTIONS[number];

export const MODULE = "stock_opname" as const;
export const FEATURE = "session" as const;

export interface ActivityLogEntry {
  id: string;
  tenantId: string;
  branchId: string | null;
  userId: string;
  module: typeof MODULE;
  feature: typeof FEATURE;
  action: SessionAction;
  entityType: string;
  entityId: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityLogInput {
  tenantId: string;
  branchId: string | null;
  userId: string;
  action: SessionAction;
  entityType: string;
  entityId: string;
  description: string;
  metadata?: Record<string, unknown>;
}
