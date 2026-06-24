// ---------------------------------------------------------------------------
// RC1 P0D.1 — Location Normalization (Pure Functions)
// ---------------------------------------------------------------------------
// Normalizes rack location strings for consistent filtering and display.
// ---------------------------------------------------------------------------

/**
 * Normalize rack location for comparison.
 *
 * Rules:
 *   - lowercase
 *   - collapse whitespace
 *   - trim
 *   - remove dashes/underscores (treat as space)
 *
 * Examples:
 *   "Rak 1"      → "rak 1"
 *   " RAK 1 "    → "rak 1"
 *   "Rak    1"   → "rak 1"
 *   "Rak-1"      → "rak 1"
 *   "RAK_1"      → "rak 1"
 */
export function normalizeRackLocation(location: string): string {
  return location
    .trim()
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ");
}

// ============================================================================
// Higher-Level Helpers (using normalization)
// ============================================================================

export interface OpnameProductInfo {
  productId: string;
  productName: string;
  rackLocation: string | null;
}

/**
 * Extract unique normalized rack locations.
 * Deduplicates case/whitespace variations.
 */
export function extractRackLocations(
  products: OpnameProductInfo[],
): string[] {
  const normalized = new Set<string>();
  const displayNames = new Map<string, string>(); // normalized → first original

  for (const p of products) {
    const raw = p.rackLocation?.trim();
    if (!raw) continue;
    const norm = normalizeRackLocation(raw);
    if (!normalized.has(norm)) {
      normalized.add(norm);
      displayNames.set(norm, raw); // preserve original casing for display
    }
  }

  return Array.from(normalized).sort((a, b) => a.localeCompare(b, "id"));
}

/**
 * Filter products by selected locations.
 * Comparison is case/whitespace-insensitive.
 */
export function filterProductsByRackLocation(
  products: OpnameProductInfo[],
  selectedLocationIds: string[],
): OpnameProductInfo[] {
  if (selectedLocationIds.length === 0) return products;

  const normalizedSet = new Set(
    selectedLocationIds.map((id) => normalizeRackLocation(id)),
  );

  return products.filter((p) => {
    const norm = normalizeRackLocation(p.rackLocation ?? "");
    return norm.length > 0 && normalizedSet.has(norm);
  });
}

/**
 * Count products per location.
 * Returns normalized location → count map.
 */
export function groupProductsByLocation(
  products: OpnameProductInfo[],
): Record<string, number> {
  const groups: Record<string, number> = {};

  for (const p of products) {
    const norm = normalizeRackLocation(p.rackLocation ?? "");
    if (!norm) continue;
    groups[norm] = (groups[norm] ?? 0) + 1;
  }

  return groups;
}
