// ---------------------------------------------------------------------------
// RC1 P0L.1 — Effective Location (Main Entry Point)
// ---------------------------------------------------------------------------
// SINGLE ENTRY POINT for all location consumers.
// Combines resolution chain output with location master data.
//
// PURE: zero React, Store, Supabase, side effects.
//
// ADR-007: Storage Location Engine is the Single Source of Truth.
// INV-008: Every displayed location must come from this engine.
// INV-010: No UI may calculate effective location.
// ---------------------------------------------------------------------------

import type {
  EffectiveLocation,
  LocationMaster,
  LocationResolutionInput,
  LocationResolutionOutput,
  LocationResolutionSource,
} from "./location-types";
import { buildDisplayLabel } from "./location-mapper";
import { resolveLocationChain } from "./location-resolution";
import { applyLocationPolicy } from "./location-policy";
import type { LocationPolicy } from "./location-types";

// ============================================================================
// Effective Location Resolver
// ============================================================================

/**
 * Resolve the effective storage location for a batch/product combination.
 *
 * This is the MAIN ENTRY POINT for all location consumers (INV-008).
 *
 * Flow:
 *   1. Resolve chain → LocationResolutionOutput
 *   2. Look up master data
 *   3. Apply policy (NORMAL, QUARANTINE, etc.)
 *   4. Return EffectiveLocation DTO
 */
export function resolveEffectiveLocation(
  input: LocationResolutionInput,
  master: LocationMasterLookup,
  policy: LocationPolicy = "NORMAL",
): EffectiveLocation {
  const resolution = resolveLocationChain(input);
  const location = lookupMaster(resolution, master);
  const displayLabel = buildDisplayLabel(resolution.source, resolution.isRelocated);

  return applyLocationPolicy(
    {
      storageAreaId: resolution.storageAreaId,
      storageAreaCode: location?.code ?? null,
      storageAreaName: location?.name ?? null,
      storageSlot: resolution.storageSlot,
      source: resolution.source,
      isRelocated: resolution.isRelocated,
      displayLabel,
    },
    policy,
  );
}

// ============================================================================
// Master Lookup
// ============================================================================

export type LocationMasterLookup = Map<string, LocationMaster>;

function lookupMaster(
  resolution: LocationResolutionOutput,
  master: LocationMasterLookup,
): LocationMaster | null {
  if (!resolution.storageAreaId) return null;
  const exact = master.get(resolution.storageAreaId);
  if (exact) return exact;

  // Legacy fallback: case-insensitive match by code or name
  if (resolution.isLegacy) {
    const query = (resolution.storageSlot ?? "").toLowerCase().trim();
    for (const [, loc] of master) {
      if (loc.code.toLowerCase() === query || loc.name.toLowerCase() === query) {
        return loc;
      }
    }
  }
  return null;
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function resolveEffectiveLocationId(
  input: LocationResolutionInput,
): EffectiveLocation {
  return resolveEffectiveLocation(input, new Map());
}

export function effectiveLocationFromMaster(
  master: LocationMaster,
  isRelocated: boolean = false,
): EffectiveLocation {
  const source: LocationResolutionSource = isRelocated ? "batch" : "product";
  return {
    storageAreaId: master.id,
    storageAreaCode: master.code,
    storageAreaName: master.name,
    storageSlot: null,
    source,
    isRelocated,
    displayLabel: buildDisplayLabel(source, isRelocated),
  };
}
