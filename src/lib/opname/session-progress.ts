// ---------------------------------------------------------------------------
// RC1 P0F.1 — Session Progress Engine (Status-Based)
// ---------------------------------------------------------------------------
// Progress is based on ITEM STATUS, not on variance/difference.
// Pure functions. Zero side effects.
// ---------------------------------------------------------------------------

import type { SessionItemStatus, SessionProgress } from "@/types/opname-session";

export interface ProgressInput {
  status: SessionItemStatus;
}

// ============================================================================
// Core Progress Calculation
// ============================================================================

/**
 * Calculate session progress from item statuses.
 *
 * Formula:
 *   completedItems = counted + skipped
 *   progressPercent = completedItems / totalItems × 100
 *
 * "counted" means operator has done their work — regardless of variance.
 * "skipped" means intentionally skipped (e.g., empty shelf).
 */
export function calculateProgress(items: ProgressInput[]): SessionProgress {
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
export function calculateRemaining(items: ProgressInput[]): number {
  return items.filter((i) => i.status === "pending").length;
}

/**
 * Check if all items are done.
 */
export function isComplete(items: ProgressInput[]): boolean {
  return calculateRemaining(items) === 0;
}

/**
 * Get completion breakdown.
 */
export function getCompletionDetail(items: ProgressInput[]): {
  total: number;
  pending: number;
  counted: number;
  skipped: number;
} {
  const counted = items.filter((i) => i.status === "counted").length;
  const skipped = items.filter((i) => i.status === "skipped").length;
  const pending = items.filter((i) => i.status === "pending").length;
  return { total: items.length, pending, counted, skipped };
}
