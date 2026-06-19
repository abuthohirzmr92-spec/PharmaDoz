/**
 * P0.8E — Duplicate Engine
 *
 * Pure functions for detecting duplicate items in a purchase draft.
 * NO state. NO side effects. NO set().
 */

import type { PurchaseDraftItem } from "@/types/purchase-draft";

export interface DuplicateGroup {
  normalizedName: string;
  indices: number[];
  items: PurchaseDraftItem[];
}

/**
 * Normalize product name for comparison.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detect duplicate items by normalized product name.
 * Only considers active items (not merged, not deleted).
 */
export function detectDuplicates(
  items: PurchaseDraftItem[],
): DuplicateGroup[] {
  const activeItems = items.filter(
    (i) => i.status !== "merged" && i.status !== "deleted",
  );

  const groups = new Map<string, number[]>();

  for (const [index, item] of activeItems.entries()) {
    const key = normalizeName(item.rawProductName);
    const indices = groups.get(key) || [];
    indices.push(index);
    groups.set(key, indices);
  }

  const duplicates: DuplicateGroup[] = [];

  for (const [name, indices] of groups) {
    if (indices.length > 1) {
      duplicates.push({
        normalizedName: name,
        indices,
        items: indices.map((i) => activeItems[i]!).filter(Boolean),
      });
    }
  }

  return duplicates;
}

/**
 * Group duplicate groups by severity (different match status).
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

