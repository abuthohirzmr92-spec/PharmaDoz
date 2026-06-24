// ---------------------------------------------------------------------------
// RC1 P0C — Location Foundation (Batch-Centric Ownership)
// ---------------------------------------------------------------------------
// Architecture Decision (P0B.2):
//   BatchLocationAssignment = SOURCE OF TRUTH (stored entity)
//   ProductLocationSummary  = DERIVED VIEW (computed, NOT stored)
//
// Conflict rule: batch assignment ALWAYS wins over derived summary.
// ---------------------------------------------------------------------------

// ============================================================================
// Core Entities
// ============================================================================

export interface Location {
  id: string;
  tenantId: string;
  pharmacyId: string | null;
  name: string;
  code: string;
  description: string | null;
  isColdStorage: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocationGroup {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  locationIds: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocationReference {
  id: string;
  name: string;
  code: string;
}

// ============================================================================
// SOURCE OF TRUTH: Batch Location Assignment
// ============================================================================

/**
 * Maps a batch to a physical location.
 * THIS IS THE AUTHORITATIVE SOURCE for location data.
 *
 * Rules:
 *   ✅ Many batches → one location (same product, different batches)
 *   ✅ One product → many locations (via different batches)
 *   ❌ One batch → many ACTIVE locations (forbidden)
 *
 * Location changes create a new assignment (track history).
 */
export interface BatchLocationAssignment {
  id: string;
  tenantId: string;
  batchId: string;
  productId: string;
  locationId: string;
  /** Position within the location, e.g. "A01" */
  positionCode: string;
  isActive: boolean;
  activatedAt: string;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// DERIVED VIEW: Product Location Summary (computed, NOT stored)
// ============================================================================

/**
 * Product-level location summary.
 * COMPUTED from BatchLocationAssignment — NEVER stored as a separate entity.
 *
 * Updated when batch assignments change.
 * Used for: session filtering, reports, UI display.
 */
export interface ProductLocationSummary {
  productId: string;
  /** Number of unique locations */
  locationCount: number;
  /** Breakdown per location */
  locations: {
    locationId: string;
    locationName: string;
    /** Total quantity across all batches in this location */
    qty: number;
  }[];
}

// ============================================================================
// DEPRECATED (kept for backward compatibility)
// ============================================================================

/**
 * ⚠️ DEPRECATED since P0B.2 — do NOT use as storage model.
 * Kept for backward compatibility with existing `products.rackLocation`.
 * Product location is COMPUTED from BatchLocationAssignment.
 */
export interface ProductLocationAssignment {
  productId: string;
  locationId: string;
  positionCode: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Pure Helpers — Product Level
// ============================================================================

export function getPrimaryLocation(
  assignments: ProductLocationAssignment[],
): LocationReference | null {
  if (assignments.length === 0) return null;
  const first = assignments[0]!;
  return { id: first.locationId, name: "", code: first.positionCode };
}

export function hasLocationAssigned(
  assignments: ProductLocationAssignment[],
): boolean {
  return assignments.length > 0;
}

export function countLocations(
  assignments: ProductLocationAssignment[],
): number {
  return new Set(assignments.map((a) => a.locationId)).size;
}

// ============================================================================
// Pure Helpers — Batch Level (Source of Truth)
// ============================================================================

/**
 * Validate batch location assignments.
 *
 * ALLOWED:
 *   ✅ Many batches → one location (sharing same shelf)
 *   ✅ One product → many locations (via different batches)
 *
 * FORBIDDEN:
 *   ❌ Same batch → multiple ACTIVE locations
 *   ❌ Empty batchId or locationId
 */
export function validateBatchLocationAssignments(
  assignments: BatchLocationAssignment[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seen = new Map<string, number>(); // batchId → count

  for (const a of assignments) {
    if (!a.batchId) errors.push("batchId wajib diisi.");
    if (!a.locationId) errors.push("locationId wajib diisi.");
    if (!a.productId) errors.push("productId wajib diisi.");

    const count = (seen.get(a.batchId) ?? 0) + 1;
    seen.set(a.batchId, count);
  }

  for (const [batchId, count] of seen) {
    if (count > 1) {
      errors.push(`Batch ${batchId} memiliki ${count} assignment. Hanya boleh 1 per batch.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Pure Helper — Compute Derived View
// ============================================================================

/**
 * Compute product location summary from batch assignments.
 * Pure function. No side effects.
 *
 * Example:
 *   Batch A → Rak 1 (qty 30)
 *   Batch B → Rak 1 (qty 20)
 *   Batch C → Rak 3 (qty 40)
 *   →
 *   ProductLocationSummary {
 *     productId: "prod-1",
 *     locationCount: 2,
 *     locations: [
 *       { locationId: "rak1", locationName: "Rak 1", qty: 50 },
 *       { locationId: "rak3", locationName: "Rak 3", qty: 40 }
 *     ]
 *   }
 */
export function computeProductLocationSummary(
  productId: string,
  batchAssignments: Array<{
    batchId: string;
    locationId: string;
    locationName: string;
    quantity: number;
    isActive: boolean;
  }>,
): ProductLocationSummary {
  const active = batchAssignments.filter((a) => a.isActive);
  const locationMap = new Map<
    string,
    { locationId: string; locationName: string; qty: number }
  >();

  for (const ba of active) {
    const existing = locationMap.get(ba.locationId);
    if (existing) {
      existing.qty += ba.quantity;
    } else {
      locationMap.set(ba.locationId, {
        locationId: ba.locationId,
        locationName: ba.locationName,
        qty: ba.quantity,
      });
    }
  }

  return {
    productId,
    locationCount: locationMap.size,
    locations: Array.from(locationMap.values()),
  };
}
