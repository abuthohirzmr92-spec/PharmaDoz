// ---------------------------------------------------------------------------
// RC1 P0 — Stock Opname Session Foundation
// ---------------------------------------------------------------------------
// Future-ready for: Location, Pause, Resume, Progress, Multi-day opname.
// Additive only — zero changes to existing performOpname().
// ---------------------------------------------------------------------------

import type { MultiUnitCount } from "@/lib/unit-opname";

// ============================================================================
// Session Status
// ============================================================================

export type SessionStatus = "draft" | "in_progress" | "paused" | "completed" | "posted" | "archived";

// ============================================================================
// Session Progress
// ============================================================================

export interface SessionProgress {
  /** Total items in this session */
  totalItems: number;
  /** Items that have been counted (status !== pending) */
  completedItems: number;
  /** Percentage complete (0-100) */
  progressPercent: number;
}

// ============================================================================
// Session Item Status
// ============================================================================

export type SessionItemStatus = "pending" | "counted" | "skipped";

// ============================================================================
// Stock Opname Session
// ============================================================================

export interface StockOpnameSession {
  /** Unique session ID */
  id: string;
  /** Human-readable title, e.g. "SO Juni 2026" */
  title: string;
  /** Current status */
  status: SessionStatus;
  /** ISO timestamp — when session was created */
  startedAt: string;
  /** ISO timestamp — last activity */
  updatedAt: string;
  /** ISO timestamp — when completed */
  completedAt: string | null;
  /** ISO timestamp — when posted (adjustments applied) */
  postedAt: string | null;
  /** ISO timestamp — when archived */
  archivedAt: string | null;
  /** Who initiated this session */
  conductedBy: string;

  /** Progress tracking */
  totalItems: number;
  completedItems: number;
  progressPercent: number;

  /** Resume support: which location is currently being counted */
  activeLocationId: string | null;
  /** Resume support: key of last counted product batch */
  activeProductKey: string | null;
  /** RC1 P0A — Session scope: which locations are included. [] = all locations */
  selectedLocationIds: string[];

  /** Optional notes */
  notes: string;
}

// ============================================================================
// Session Item
// ============================================================================

export interface StockOpnameSessionItem {
  /** Composite key: `${productId}:${batchId}` */
  key: string;
  productId: string;
  batchId: string;
  productName: string;
  batchNumber: string;
  /** System quantity at session start (snapshot) */
  systemQty: number;
  /** User-entered physical quantity */
  physicalQty: number;
  /** Counting status */
  status: SessionItemStatus;
  /** Multi-unit breakdown (Level-3) */
  multiUnitCounts?: MultiUnitCount[];
  /** Product base unit, e.g. "Tablet" */
  baseUnit?: string;
  /** Optional note per item */
  note: string;
}

// ============================================================================
// Pure Functions: Progress Engine
// ============================================================================

/**
 * Calculate progress from session items.
 * Pure function — zero side effects.
 */
export function calculateProgress(
  items: Array<{ status: SessionItemStatus }>,
): SessionProgress {
  const totalItems = items.length;
  const completedItems = items.filter(
    (i) => i.status === "counted" || i.status === "skipped",
  ).length;
  const progressPercent =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  return { totalItems, completedItems, progressPercent };
}

/**
 * Calculate remaining items to count.
 */
export function calculateRemaining(
  items: Array<{ status: SessionItemStatus }>,
): number {
  return items.filter((i) => i.status === "pending").length;
}

// ============================================================================
// Session Scope Helpers (RC1 P0A)
// ============================================================================

/**
 * Calculate session scope summary.
 *
 * Examples:
 *   []            → { locationCount: 0, isFullStore: true }
 *   ["rak-1"]     → { locationCount: 1, isFullStore: false }
 *   ["r1","r2"]   → { locationCount: 2, isFullStore: false }
 */
export function calculateSessionScope(selectedLocationIds: string[]): {
  locationCount: number;
  isFullStore: boolean;
} {
  const valid = selectedLocationIds.filter((id) => id.trim().length > 0);
  return {
    locationCount: valid.length,
    isFullStore: valid.length === 0,
  };
}

/**
 * Validate session scope for duplicates and empty strings.
 * Pure function.
 */
export function validateSessionScope(selectedLocationIds: string[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const raw of selectedLocationIds) {
    const id = raw.trim().toLowerCase();
    if (id.length === 0) {
      errors.push("Location ID tidak boleh kosong.");
    } else if (seen.has(id)) {
      errors.push(`Location "${raw.trim()}" duplikat.`);
    }
    seen.add(id);
  }
  return { valid: errors.length === 0, errors };
}

// RC1 P0A.1: filterItemsByLocation removed — location is not attached to
// inventory items yet. Filtering logic belongs to RC1 P0B
// Location Assignment Foundation, after product→location mapping exists.

/**
 * Check if session is complete (all items counted or skipped).
 */
export function isSessionComplete(
  items: Array<{ status: SessionItemStatus }>,
): boolean {
  return items.every((i) => i.status === "counted" || i.status === "skipped");
}

/**
 * Create a new empty session.
 */
export function createSession(
  id: string,
  title: string,
  conductedBy: string,
  selectedLocationIds: string[] = [],
): StockOpnameSession {
  const now = new Date().toISOString();
  return {
    id,
    title,
    status: "draft",
    startedAt: now,
    updatedAt: now,
    completedAt: null,
    postedAt: null,
    archivedAt: null,
    conductedBy,
    totalItems: 0,
    completedItems: 0,
    progressPercent: 0,
    activeLocationId: null,
    activeProductKey: null,
    selectedLocationIds,
    notes: "",
  };
}
