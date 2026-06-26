// ---------------------------------------------------------------------------
// RC1 P0L.1 — Location History (Business Domain)
// ---------------------------------------------------------------------------
// PURE domain contracts + factory functions. Zero side effects.
//
// ADR-009: Activity Log is Audit. Location History is Business History.
// INV-012: Location History is append-only — never modified after creation.
//
// Location History answers: "Where was this batch, when, and why?"
//
// Separation from Activity Log:
//   Activity Log  → generic event stream (who did what, when)
//   Location Hist → domain-specific entries (batch, old loc, new loc, reason)
// ---------------------------------------------------------------------------

import type {
  LocationHistoryEntry,
  LocationHistorySource,
} from "./location-types";

// ============================================================================
// History Entry Factory
// ============================================================================

/** Parameters for creating a location history entry. */
export interface LocationHistoryParams {
  tenantId: string;
  batchId: string;
  productId: string;
  oldLocationId: string | null;
  newLocationId: string | null;
  changedBy: string;
  reason?: string | null;
  source: LocationHistorySource;
}

/**
 * Create a new Location History entry.
 *
 * 100% DETERMINISTIC factory — same inputs = same outputs.
 * Does NOT persist. Does NOT generate IDs. Does NOT use system clock.
 * Caller must provide `id` and `changedAt` explicitly.
 *
 * INV-012: Once created, the entry must NEVER be modified.
 * There is no update function. There is no delete function.
 * Correction = new entry with reason "Koreksi entri sebelumnya".
 *
 * @param params    Entry parameters
 * @param id        Unique entry ID (required — no auto-generation)
 * @param changedAt ISO timestamp (required — no Date.now())
 * @returns         Frozen, immutable LocationHistoryEntry
 */
export function createHistoryEntry(
  params: LocationHistoryParams,
  id: string,
  changedAt: string,
): LocationHistoryEntry {
  return Object.freeze({
    id,
    tenantId: params.tenantId,
    batchId: params.batchId,
    productId: params.productId,
    oldLocationId: params.oldLocationId,
    newLocationId: params.newLocationId,
    changedAt,
    changedBy: params.changedBy,
    reason: params.reason ?? null,
    source: params.source,
  });
}

// ============================================================================
// History Query Helpers (Pure — no DB calls)
// ============================================================================

/**
 * Filter history entries by batch ID.
 * Pure function — filters in-memory array.
 */
export function filterHistoryByBatch(
  entries: LocationHistoryEntry[],
  batchId: string,
): LocationHistoryEntry[] {
  return entries.filter((e) => e.batchId === batchId);
}

/**
 * Filter history entries by product ID.
 * Pure function — filters in-memory array.
 */
export function filterHistoryByProduct(
  entries: LocationHistoryEntry[],
  productId: string,
): LocationHistoryEntry[] {
  return entries.filter((e) => e.productId === productId);
}

/**
 * Get the most recent location change for a batch.
 * Returns null if no history exists.
 */
export function getLatestLocationChange(
  entries: LocationHistoryEntry[],
  batchId: string,
): LocationHistoryEntry | null {
  const batchEntries = filterHistoryByBatch(entries, batchId);
  if (batchEntries.length === 0) return null;

  return batchEntries.reduce((latest, entry) =>
    entry.changedAt > latest.changedAt ? entry : latest,
  );
}

/**
 * Get the current location of a batch from its history.
 * The current location = newLocationId of the most recent entry.
 * Returns null if no history exists or the batch was cleared.
 */
export function getCurrentLocationFromHistory(
  entries: LocationHistoryEntry[],
  batchId: string,
): string | null {
  const latest = getLatestLocationChange(entries, batchId);
  return latest?.newLocationId ?? null;
}

// ============================================================================
// History Statistics (Pure — no DB calls)
// ============================================================================

/**
 * Count how many times a batch has been relocated.
 */
export function countRelocations(
  entries: LocationHistoryEntry[],
  batchId: string,
): number {
  return filterHistoryByBatch(entries, batchId).filter(
    (e) => e.source === "manual",
  ).length;
}

/**
 * Build a timeline of location changes for display.
 */
export function buildLocationTimeline(
  entries: LocationHistoryEntry[],
  batchId: string,
): LocationHistoryEntry[] {
  return filterHistoryByBatch(entries, batchId).sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  );
}

// ============================================================================
// Deprecation — Attempted Mutation Detection
// ============================================================================

/**
 * INV-012 Guard: this symbol marks frozen entries.
 * Any attempt to modify a frozen entry will throw in strict mode.
 *
 * createHistoryEntry() calls Object.freeze() on the returned entry.
 * This is a runtime guard ensuring append-only compliance.
 */
export const LOCATION_HISTORY_FROZEN = Symbol("location-history-frozen");
