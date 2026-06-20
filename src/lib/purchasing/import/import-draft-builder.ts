/**
 * P0.9A.3 — Import Draft Builder (Shared Core)
 *
 * Constructs an immutable PurchaseDraft from enriched items.
 * Used by CSV, Excel, OCR — no duplicated draft construction logic.
 */

import { calculateDraftTotals } from "../draft-engine";
import { calculateImportStatus } from "./import-status";
import { buildSourceReference } from "./import-source";
import type { ImportDeps } from "./import-service.types";
import type { DraftSource, PurchaseDraft, PurchaseDraftItem } from "@/types/purchase-draft";

/**
 * Build a complete PurchaseDraft from enriched items.
 * Immutable — no post-creation mutation.
 */
export function buildImportDraft(
  items: PurchaseDraftItem[],
  source: DraftSource,
  deps: ImportDeps,
): PurchaseDraft {
  const now = new Date().toISOString();

  const temp: PurchaseDraft = {
    id: deps.generateDraftId(),
    tenantId: deps.tenantId,
    branchId: deps.branchId,
    sourceType: source,
    sourceReference: buildSourceReference(source),
    supplierId: null,
    supplierName: null,
    invoiceNumber: null,
    purchaseDate: now,
    dueDate: null,
    items,
    subtotal: 0,
    discountTotal: 0,
    grandTotal: 0,
    status: calculateImportStatus(items),
    createdBy: deps.userId,
    createdAt: now,
    updatedAt: now,
  };

  const totals = calculateDraftTotals(temp);

  return {
    ...temp,
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    grandTotal: totals.grandTotal,
  };
}
