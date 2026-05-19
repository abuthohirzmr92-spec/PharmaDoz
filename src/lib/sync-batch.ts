// ---------------------------------------------------------------------------
// Sync batch helpers — staged replacement strategy
// ---------------------------------------------------------------------------
// Flow:
//   1. Upload snapshot to staging
//   2. Validate staging snapshot
//   3. Replace production daily bucket safely
//   4. Finalize sync batch
// ---------------------------------------------------------------------------

import type { SyncBatch } from "@/types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Generate a random hexadecimal string of the given length.
 * Uses crypto.getRandomValues where available; falls back to Math.random.
 */
function randomHex(length: number): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(Math.ceil(length / 2));
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, length);
  }

  // Fallback: Math.random (not cryptographically secure)
  return Math.random()
    .toString(16)
    .slice(2, 2 + length)
    .padEnd(length, "0");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a unique, human-readable batch identifier.
 *
 * Format: `batch_{pharmacyId}_{businessDay}_{randomSuffix}`
 *
 * @example generateBatchId("pharm-001", "2026-05-19")
 *          => "batch_pharm-001_2026-05-19_a3f8c2b1"
 */
export function generateBatchId(
  pharmacyId: string,
  businessDay: string,
): string {
  const suffix = randomHex(8);
  return `batch_${pharmacyId}_${businessDay}_${suffix}`;
}

/**
 * Generate an idempotency key to prevent duplicate transaction/movement replay.
 *
 * Format: `idem_{prefix}_{timestamp}_{random}`
 *
 * @example generateIdempotencyKey("txn")
 *          => "idem_txn_1716000000000_x7k2"
 */
export function generateIdempotencyKey(prefix: string): string {
  const ts = Date.now().toString();
  const rand = randomHex(4);
  return `idem_${prefix}_${ts}_${rand}`;
}

/**
 * Serialise `data` to a deterministic JSON string suitable for checksumming.
 * Object keys are sorted alphabetically so identical data always
 * produces the same string regardless of key insertion order.
 */
export function serializeForChecksum(data: unknown): string {
  return JSON.stringify(data, (_key: string, value: unknown): unknown => {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  });
}

/**
 * Compute a SHA-256 checksum of `data` and return it as a lowercase hex string.
 *
 * Wraps the Web Crypto API (crypto.subtle.digest).
 * Falls back to a non-cryptographic DJB2 hash when SubtleCrypto is unavailable
 * (e.g., restrictive CSP, older Edge, or some server-side runtimes).
 *
 * @example await computeChecksum({ foo: "bar" })
 *          => "fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9"
 */
export async function computeChecksum(data: unknown): Promise<string> {
  const serialized = serializeForChecksum(data);

  // ---- Primary: SHA-256 via SubtleCrypto ----
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.subtle?.digest === "function"
  ) {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(serialized);
    const buffer = await crypto.subtle.digest("SHA-256", encoded);
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // ---- Fallback: DJB2 (non-cryptographic) ----
  return djb2Hex(serialized);
}

/**
 * Non-cryptographic DJB2 hash fallback.
 * Only reached when SubtleCrypto is unavailable.
 * Returns a 32-bit hex string (8 chars) — NOT suitable for
 * security-sensitive integrity verification.
 */
function djb2Hex(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  // Convert signed 32-bit integer to unsigned hex
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Factory function that creates a SyncBatch object in the "staging" stage.
 */
export function createSyncBatch(
  pharmacyId: string,
  businessDay: string,
  entryCount: number,
  checksum: string,
): SyncBatch {
  return {
    batchId: generateBatchId(pharmacyId, businessDay),
    businessDay,
    pharmacyId,
    entryCount,
    checksum,
    stage: "staging",
    createdAt: new Date().toISOString(),
  };
}
