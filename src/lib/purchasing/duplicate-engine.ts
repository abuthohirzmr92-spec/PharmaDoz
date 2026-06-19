/**
 * P0.8G — Duplicate Engine
 *
 * Pure functions for detecting duplicate items in a purchase draft.
 * Multiple detection strategies with confidence scoring.
 *
 * NO state. NO side effects. NO store. NO DB. NO Supabase.
 * NO imports from other engines, services, or UI.
 */

import type { PurchaseDraftItem } from "@/types/purchase-draft";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DuplicateType =
  | "barcode"
  | "product_code"
  | "exact_name"
  | "normalized_name"
  | "token_similarity"
  | "matched_product_id";

export interface DuplicateGroup {
  id: string;                        // generated group ID
  items: PurchaseDraftItem[];
  reason: string;                    // human-readable reason
  confidence: number;                // 0–100
  duplicateType: DuplicateType;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize product name for comparison.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenize a normalized name.
 */
function tokenize(name: string): string[] {
  return normalizeName(name).split(" ").filter((t) => t.length > 0);
}

// ---------------------------------------------------------------------------
// Detection Strategies
// ---------------------------------------------------------------------------

/**
 * 1. Barcode duplicate (priority 100)
 * Items sharing the same non-empty barcode.
 */
function detectBarcodeDuplicates(
  activeItems: PurchaseDraftItem[],
): DuplicateGroup[] {
  const groups = new Map<string, PurchaseDraftItem[]>();

  for (const item of activeItems) {
    if (!item.rawBarcode) continue;
    const existing = groups.get(item.rawBarcode) || [];
    existing.push(item);
    groups.set(item.rawBarcode, existing);
  }

  const results: DuplicateGroup[] = [];
  for (const [barcode, items] of groups) {
    if (items.length > 1) {
      results.push({
        id: "",
        items,
        reason: `Barcode sama: ${barcode}`,
        confidence: 100,
        duplicateType: "barcode",
      });
    }
  }
  return results;
}

/**
 * 2. Matched product ID duplicate (priority 90)
 * Items matched to the same database product.
 */
function detectMatchedProductDuplicates(
  activeItems: PurchaseDraftItem[],
): DuplicateGroup[] {
  const groups = new Map<string, PurchaseDraftItem[]>();

  for (const item of activeItems) {
    if (!item.matchedProductId) continue;
    const existing = groups.get(item.matchedProductId) || [];
    existing.push(item);
    groups.set(item.matchedProductId, existing);
  }

  const results: DuplicateGroup[] = [];
  for (const [productId, items] of groups) {
    if (items.length > 1) {
      results.push({
        id: "",
        items,
        reason: `Produk sama: ${items[0]?.rawProductName ?? productId}`,
        confidence: 90,
        duplicateType: "matched_product_id",
      });
    }
  }
  return results;
}

/**
 * 3. Exact name duplicate (priority 95)
 * Items with identical raw product names (case-insensitive).
 */
function detectExactNameDuplicates(
  activeItems: PurchaseDraftItem[],
): DuplicateGroup[] {
  const groups = new Map<string, PurchaseDraftItem[]>();

  for (const item of activeItems) {
    const key = item.rawProductName.toLowerCase().trim();
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }

  const results: DuplicateGroup[] = [];
  for (const [name, items] of groups) {
    if (items.length > 1) {
      results.push({
        id: "",
        items,
        reason: `Nama produk sama: "${items[0]?.rawProductName ?? name}"`,
        confidence: 95,
        duplicateType: "exact_name",
      });
    }
  }
  return results;
}

/**
 * 4. Normalized name duplicate (priority 85)
 * Items that match after normalization (lowercase, strip punctuation).
 */
function detectNormalizedNameDuplicates(
  activeItems: PurchaseDraftItem[],
): DuplicateGroup[] {
  const groups = new Map<string, PurchaseDraftItem[]>();

  for (const item of activeItems) {
    const key = normalizeName(item.rawProductName);
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }

  const results: DuplicateGroup[] = [];
  for (const [name, items] of groups) {
    if (items.length > 1) {
      results.push({
        id: "",
        items,
        reason: `Nama produk mirip setelah normalisasi`,
        confidence: 85,
        duplicateType: "normalized_name",
      });
    }
  }
  return results;
}

/**
 * 5. Token similarity duplicate (priority 80)
 * Items where one name's tokens are fully contained in the other.
 * Example: "Paracetamol 500" vs "Paracetamol 500mg Tablet"
 */
function detectTokenSimilarityDuplicates(
  activeItems: PurchaseDraftItem[],
): DuplicateGroup[] {
  const results: DuplicateGroup[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < activeItems.length; i++) {
    const a = activeItems[i]!;
    const aTokens = tokenize(a.rawProductName);
    if (aTokens.length === 0) continue;

    for (let j = i + 1; j < activeItems.length; j++) {
      const b = activeItems[j]!;
      const bTokens = tokenize(b.rawProductName);
      if (bTokens.length === 0) continue;

      // How many tokens overlap in BOTH directions?
      const aInB = aTokens.filter((t) => bTokens.includes(t)).length;
      const bInA = bTokens.filter((t) => aTokens.includes(t)).length;

      const overlapA = aInB / aTokens.length;
      const overlapB = bInA / bTokens.length;
      const overlap = Math.min(overlapA, overlapB);

      if (overlap >= 0.75) {
        const key = [a.id, b.id].sort().join("-");
        if (seen.has(key)) continue;
        seen.add(key);

        results.push({
          id: "",
          items: [a, b],
          reason: `Token mirip: "${a.rawProductName}" ≈ "${b.rawProductName}"`,
          confidence: Math.round(overlap * 100),
          duplicateType: "token_similarity",
        });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Detect all duplicate groups across all strategies.
 *
 * Priority order (highest confidence wins):
 *   1. Barcode match → 100%
 *   2. Exact name match → 95%
 *   3. Matched product ID → 90%
 *   4. Normalized name → 85%
 *   5. Token similarity → 80%
 *
 * Items already in "merged" or "deleted" status are excluded.
 *
 * Returns deduplicated groups — if an item appears in multiple groups,
 * only the highest-confidence group is kept.
 */
export function detectDuplicates(
  items: PurchaseDraftItem[],
): DuplicateGroup[] {
  const activeItems = items.filter(
    (i) => i.status !== "merged" && i.status !== "deleted",
  );

  if (activeItems.length < 2) return [];

  // Run all strategies
  const allGroups: DuplicateGroup[] = [
    ...detectBarcodeDuplicates(activeItems),
    ...detectExactNameDuplicates(activeItems),
    ...detectMatchedProductDuplicates(activeItems),
    ...detectNormalizedNameDuplicates(activeItems),
    ...detectTokenSimilarityDuplicates(activeItems),
  ];

  // Deduplicate: if item appears in multiple groups, keep highest confidence
  const itemToBest = new Map<string, { groupIdx: number; confidence: number }>();

  for (const [idx, group] of allGroups.entries()) {
    for (const item of group.items) {
      const existing = itemToBest.get(item.id);
      if (!existing || group.confidence > existing.confidence) {
        itemToBest.set(item.id, { groupIdx: idx, confidence: group.confidence });
      }
    }
  }

  // Only keep groups that still have ≥2 items after dedup
  const keptIndices = new Set<number>();
  for (const [, { groupIdx }] of itemToBest) {
    keptIndices.add(groupIdx);
  }

  const final: DuplicateGroup[] = [];
  let idCounter = 0;
  for (const idx of keptIndices) {
    const group = allGroups[idx]!;
    const keptItems = group.items.filter(
      (item) => itemToBest.get(item.id)?.groupIdx === idx,
    );
    if (keptItems.length >= 2) {
      idCounter++;
      final.push({ ...group, id: `dup-${idCounter}`, items: keptItems });
    }
  }

  return final;
}

/**
 * Group duplicates by match status.
 */
export function groupDuplicates(
  duplicates: DuplicateGroup[],
): {
  bothMatched: DuplicateGroup[];
  oneMatched: DuplicateGroup[];
  noneMatched: DuplicateGroup[];
} {
  const bothMatched: DuplicateGroup[] = [];
  const oneMatched: DuplicateGroup[] = [];
  const noneMatched: DuplicateGroup[] = [];

  for (const group of duplicates) {
    const matchedCount = group.items.filter(
      (i) => i.matchedProductId && i.matchMethod !== "unmatched",
    ).length;

    if (matchedCount === group.items.length) {
      bothMatched.push(group);
    } else if (matchedCount > 0) {
      oneMatched.push(group);
    } else {
      noneMatched.push(group);
    }
  }

  return { bothMatched, oneMatched, noneMatched };
}
