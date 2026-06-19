/**
 * P0.8E — Merge Engine
 *
 * Pure functions for merging duplicate purchase draft items.
 * NO state. NO side effects. NO set().
 */

import type { PurchaseDraftItem, DraftWarning } from "@/types/purchase-draft";

export interface MergeResult {
  mergedItem: PurchaseDraftItem;
  mergedFromIds: string[];
}

/**
 * Merge multiple draft items into one.
 * - Quantities are summed
 * - Buy price is calculated as quantity-weighted average
 * - Source items are marked as "merged"
 */
export function mergeItems(
  items: PurchaseDraftItem[],
  targetId: string,
  sourceIds: string[],
): { items: PurchaseDraftItem[]; mergedItem: PurchaseDraftItem | null } {
  const target = items.find((i) => i.id === targetId);
  if (!target) return { items, mergedItem: null };

  let mergedQty = target.quantity;
  const mergedWarnings: DraftWarning[] = [...target.warnings];

  const updatedItems = items.map((item) => {
    if (!sourceIds.includes(item.id)) return item;
    if (item.id === targetId) return item;

    // Sum quantities (price stays as weighted average on target)
    mergedQty += item.quantity;
    mergedWarnings.push(...item.warnings);

    return { ...item, status: "merged" as const };
  });

  const updatedTarget: PurchaseDraftItem = {
    ...target,
    quantity: mergedQty,
    warnings: mergedWarnings,
    mergedFromIds: [...(target.mergedFromIds || []), ...sourceIds],
  };

  const finalItems = updatedItems.map((item) =>
    item.id === targetId ? updatedTarget : item,
  );

  return { items: finalItems, mergedItem: updatedTarget };
}

/**
 * Calculate quantity-weighted average buy price for merged items.
 */
export function mergeWeightedPrice(
  items: PurchaseDraftItem[],
): number {
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  if (totalQty === 0) return 0;

  const weightedSum = items.reduce(
    (sum, i) => sum + i.quantity * i.enteredBuyPrice,
    0,
  );
  return Math.round(weightedSum / totalQty);
}

/**
 * Decide merge strategy for a duplicate group.
 * - All items share same matchedProductId → auto_merge
 * - No items matched → keep_separate (need manual matching)
 * - Mixed → review
 */
export function suggestMerge(
  items: PurchaseDraftItem[],
): "auto_merge" | "review" | "keep_separate" {
  const matchedIds = new Set(
    items.filter((i) => i.matchedProductId).map((i) => i.matchedProductId),
  );

  if (matchedIds.size === 1 && matchedIds.has(items[0]?.matchedProductId ?? null)) {
    return "auto_merge";
  }
  if (matchedIds.size === 0) {
    return "keep_separate";
  }
  return "review";
}

/**
 * Merge warnings from multiple items, deduplicating by code.
 */
export function mergeWarnings(
  warnings: DraftWarning[][],
): DraftWarning[] {
  const seen = new Set<string>();
  const merged: DraftWarning[] = [];

  for (const group of warnings) {
    for (const w of group) {
      if (!seen.has(w.code)) {
        seen.add(w.code);
        merged.push(w);
      }
    }
  }

  return merged;
}
