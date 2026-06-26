// ---------------------------------------------------------------------------
// RC1 P0L.1 — Storage Location Resolution Chain
// ---------------------------------------------------------------------------
// PURE function. Zero side effects. Zero dependencies beyond types.
//
// ADR-004 (REVISED): Resolution chain priority:
//   batch.storage_area_id + batch.storage_slot   ← REALITY (ADR-008)
//   product.default_storage_area_id + default_storage_slot ← SUGGESTION
//   product.rack_location  ← LEGACY FALLBACK (ADR-001)
//
// ADR-006: Purchase NOT in resolution chain (assignment only).
// ADR-010: Product Default is inheritance for NEW batches only.
// ---------------------------------------------------------------------------

import type {
  LocationResolutionInput,
  LocationResolutionOutput,
  LocationResolutionSource,
} from "./location-types";

// ============================================================================
// Resolution Chain
// ============================================================================

/**
 * Walk the resolution chain and return the winning storage location.
 *
 * Priority (highest → lowest):
 *   1. batch.storage_area_id + batch.storage_slot   — explicit (reality)
 *   2. product.default_storage_area_id + default_storage_slot — default (suggestion)
 *   3. product.rack_location                        — legacy free-text fallback
 *   4. null                                          — no location
 *
 * ADR-010: Once a batch has its own storage_area_id,
 *   product default changes are irrelevant.
 */
export function resolveLocationChain(
  input: LocationResolutionInput,
): LocationResolutionOutput {
  const batch = input.batch ?? null;
  const product = input.product ?? null;

  // Layer 1: Batch location (REALITY — ADR-008)
  if (batch?.storageAreaId) {
    return {
      storageAreaId: batch.storageAreaId,
      storageSlot: batch.storageSlot ?? null,
      source: "batch" as LocationResolutionSource,
      isRelocated: batch.isRelocated ?? true,
      isLegacy: false,
    };
  }

  // Layer 2: Product default (SUGGESTION — ADR-008)
  if (product?.defaultStorageAreaId) {
    return {
      storageAreaId: product.defaultStorageAreaId,
      storageSlot: product.defaultStorageSlot ?? null,
      source: "product" as LocationResolutionSource,
      isRelocated: false,
      isLegacy: false,
    };
  }

  // Layer 3: Legacy rack_location (FALLBACK — ADR-001)
  if (product?.rackLocation) {
    return {
      storageAreaId: null,
      storageSlot: product.rackLocation,
      source: "legacy" as LocationResolutionSource,
      isRelocated: false,
      isLegacy: true,
    };
  }

  // Layer 4: Nothing
  return {
    storageAreaId: null,
    storageSlot: null,
    source: "none" as LocationResolutionSource,
    isRelocated: false,
    isLegacy: false,
  };
}

// ============================================================================
// Resolution Source Helpers
// ============================================================================

export function isExplicitAssignment(output: LocationResolutionOutput): boolean {
  return output.source === "batch";
}

export function isLegacyResolution(output: LocationResolutionOutput): boolean {
  return output.isLegacy;
}

export function hasLocation(output: LocationResolutionOutput): boolean {
  return output.storageAreaId !== null;
}

export function shouldInheritFromProduct(
  input: LocationResolutionInput,
): boolean {
  const batch = input.batch ?? null;
  return !batch?.storageAreaId;
}
