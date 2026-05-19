// ---------------------------------------------------------------------------
// Sync validation helpers — staged replacement flow
// ---------------------------------------------------------------------------
// Validates batch integrity (checksum, count), checks expiry,
// determines retry eligibility, and generates replay-guard keys.
// ---------------------------------------------------------------------------

import type { SyncBatch, SyncValidationResult } from "@/types";
import { MAX_SYNC_RETRIES } from "@/config/constants";
import { computeChecksum } from "@/lib/sync-batch";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a staged sync batch against the given data and expected
 * transaction count.
 *
 * Steps:
 *   1. Compute the SHA-256 checksum of `stagingData`.
 *   2. Compare it against `batch.checksum`.
 *   3. Compare `expectedTransactionCount` against `batch.entryCount`.
 *
 * Returns a `SyncValidationResult` with detailed error messages.
 */
export async function validateSyncBatch(
  batch: SyncBatch,
  stagingData: unknown,
  expectedTransactionCount: number,
): Promise<SyncValidationResult> {
  const errors: string[] = [];

  // ---- Checksum verification ----
  const computedChecksum = await computeChecksum(stagingData);
  const checksumMatch = computedChecksum === batch.checksum;

  if (!checksumMatch) {
    errors.push(
      `Checksum mismatch: expected ${batch.checksum}, got ${computedChecksum}`,
    );
  }

  // ---- Transaction count verification ----
  const transactionCountMatch = expectedTransactionCount === batch.entryCount;

  if (!transactionCountMatch) {
    errors.push(
      `Transaction count mismatch: expected ${expectedTransactionCount}, got ${batch.entryCount}`,
    );
  }

  return {
    valid: checksumMatch && transactionCountMatch,
    checksumMatch,
    transactionCountMatch,
    errors,
  };
}

/**
 * Check whether a sync batch is too old to be finalised.
 *
 * Batches older than `maxAgeHours` (default 24) should not be
 * finalised — the staging data is stale and may not reflect the
 * current state of the daily bucket.
 */
export function isSyncBatchExpired(
  batch: SyncBatch,
  maxAgeHours: number = 24,
): boolean {
  const createdAt = new Date(batch.createdAt).getTime();
  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

  return now - createdAt > maxAgeMs;
}

/**
 * Determine whether a failed sync entry can be retried.
 *
 * Returns `true` when `entry.attempts` is strictly less than
 * `MAX_SYNC_RETRIES` (defined in config/constants — currently 3).
 */
export function canRetrySync(entry: {
  attempts: number;
  lastError: string | null;
}): boolean {
  return entry.attempts < MAX_SYNC_RETRIES;
}

/**
 * Generate a replay-prevention key for a given transaction and business day.
 *
 * This key can be persisted server-side (or in local storage) so that
 * if the same transaction is submitted again, the system knows it has
 * already been processed and skips it.
 *
 * Format: `replay_{businessDay}_{transactionId}`
 *
 * @example generateReplayGuard("txn_abc123", "2026-05-19")
 *          => "replay_2026-05-19_txn_abc123"
 */
export function generateReplayGuard(
  transactionId: string,
  businessDay: string,
): string {
  return `replay_${businessDay}_${transactionId}`;
}
