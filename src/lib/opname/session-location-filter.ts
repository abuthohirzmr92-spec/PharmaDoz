// ---------------------------------------------------------------------------
// RC1 P0D.1 — Session Location Filtering (Re-exports from normalizer)
// ---------------------------------------------------------------------------
// All filtering logic now lives in location-normalizer.ts.
// This file remains for backward compatibility.
// ---------------------------------------------------------------------------

export {
  normalizeRackLocation,
  extractRackLocations,
  filterProductsByRackLocation,
  groupProductsByLocation,
} from "./location-normalizer";

export type { OpnameProductInfo } from "./location-normalizer";

/**
 * Count how many products would be filtered by given location selection.
 * Wrapper for backward compatibility.
 */
export function countProductsByRackLocation(
  products: import("./location-normalizer").OpnameProductInfo[],
  selectedLocationIds: string[],
): { total: number; filtered: number } {
  const { filterProductsByRackLocation } = require("./location-normalizer");
  const filtered = filterProductsByRackLocation(products, selectedLocationIds);
  return { total: products.length, filtered: filtered.length };
}
