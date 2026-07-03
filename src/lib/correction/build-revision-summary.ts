// =================================================================
// build-revision-summary.ts V3.2.1 — Summary Builder
// 🔒 ARCHITECTURE LOCKED — Pure function
// Responsibility: compute summary stats from working copy
// NEVER: render, call store, access DB
// =================================================================

import type { WorkingPurchaseItem, RevisionSummaryData } from "@/components/inventory/invoice-revision/types";

/**
 * Compute revision summary from working copy.
 * PURE FUNCTION — no side effects, no store, no network.
 *
 * @param workingItems — Working copy items
 * @returns RevisionSummaryData for display
 */
export function buildRevisionSummary(
  workingItems: WorkingPurchaseItem[],
): RevisionSummaryData {
  // TODO Sprint 4: implement full computation

  const changed = workingItems.filter((i) => i._state === "MODIFIED");
  const added = workingItems.filter((i) => i._state === "NEW");
  const deleted = workingItems.filter((i) => i._state === "DELETED");

  let qtyChanges = 0;
  let priceChanges = 0;
  let batchChanges = 0;
  let expiryChanges = 0;
  let locationChanges = 0;

  for (const item of changed) {
    if (!item._original) continue;
    if (item.quantity !== item._original.quantity) qtyChanges++;
    if (item.unitPrice !== item._original.unitPrice || item.sellingPrice !== item._original.sellingPrice) priceChanges++;
    if (item.batchNumber !== item._original.batchNumber) batchChanges++;
    if (item.expiredDate !== item._original.expiredDate) expiryChanges++;
    if (item.storageAreaId !== item._original.storageAreaId || item.storageSlot !== item._original.storageSlot) locationChanges++;
  }

  const totalOld = workingItems
    .filter((i) => i._state !== "NEW")
    .reduce((s, i) => s + (i._original?.quantity ?? i.quantity) * (i._original?.unitPrice ?? i.unitPrice), 0);

  const totalNew = workingItems
    .filter((i) => i._state !== "DELETED")
    .reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  return {
    itemsChanged: changed.length,
    itemsAdded: added.length,
    itemsDeleted: deleted.length,
    qtyChanges,
    priceChanges,
    batchChanges,
    expiryChanges,
    locationChanges,
    totalOld,
    totalNew,
    deltaAmount: totalNew - totalOld,
  };
}
