// ---------------------------------------------------------------------------
// RC1 P0L.1 — Location Mapper / View-Model Boundary
// ---------------------------------------------------------------------------
// Formatting, display labels, UI helper functions.
// This is the ONLY file that produces human-readable location strings.
//
// SEPARATION OF CONCERNS:
//   Domain (types, resolution, policy, validator, history) = logic only
//   Mapper (this file) = formatting / display / view-model
//
// UI should use this mapper for display strings.
// Domain files should NOT contain formatting logic.
//
// ADR-003: UI must use business terminology.
//   "Lokasi Utama Produk" — when following product default.
//   "Lokasi Dipindahkan" — when batch was explicitly relocated.
// ---------------------------------------------------------------------------

import type { LocationResolutionSource } from "./location-types";

// ============================================================================
// Display Labels (ADR-003)
// ============================================================================

export const LOCATION_DISPLAY_LABELS = {
  productDefault: "Lokasi Utama Produk",
  relocated: "Lokasi Dipindahkan",
  legacy: "Lokasi (Legacy)",
  none: "—",
} as const;

// ============================================================================
// Display Label Builder
// ============================================================================

/** Build a human-readable display label for a resolved location. */
export function buildDisplayLabel(
  source: LocationResolutionSource,
  isRelocated: boolean,
): string {
  if (isRelocated) return LOCATION_DISPLAY_LABELS.relocated;

  switch (source) {
    case "product":
      return LOCATION_DISPLAY_LABELS.productDefault;
    case "legacy":
      return LOCATION_DISPLAY_LABELS.legacy;
    case "batch":
      return LOCATION_DISPLAY_LABELS.productDefault;
    default:
      return LOCATION_DISPLAY_LABELS.none;
  }
}

// ============================================================================
// Badge Helpers (RC2 — visual indicator formatting)
// ============================================================================

/**
 * Get the CSS class modifier for a location badge.
 * RC2: implement when UI integration begins.
 */
export function getLocationBadgeVariant(
  isRelocated: boolean,
): "default" | "relocated" {
  return isRelocated ? "relocated" : "default";
}

// ============================================================================
// Future: Location Display Name Builder
// ============================================================================

/**
 * Build a full location display name with code prefix.
 * Example: "R01 — Rak 1"
 *
 * @param code  Location code (e.g. "R01")
 * @param name  Location name (e.g. "Rak 1")
 */
export function formatLocationDisplay(
  code: string | null,
  name: string | null,
): string {
  if (code && name) return `${code} — ${name}`;
  if (name) return name;
  if (code) return code;
  return LOCATION_DISPLAY_LABELS.none;
}
