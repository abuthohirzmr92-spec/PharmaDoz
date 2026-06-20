/**
 * P0.9A.3 — Import Mapper (Shared Core)
 *
 * Converts ImportRow → PurchaseDraftItem.
 * Used by CSV, Excel, OCR, Supplier API.
 * NO matching. NO warnings. NO repositories. NO store.
 * Pure functions only.
 */

import type { ImportRow } from "./import-types";
import type { ImportIdentityStrategy } from "./import-service.types";
import type { PurchaseDraftItem } from "@/types/purchase-draft";

/**
 * Convert an ImportRow to a PurchaseDraftItem.
 * All items start as "pending" — matching and warnings run later.
 */
export function mapRowToDraftItem(
  row: ImportRow,
  ids: ImportIdentityStrategy,
): PurchaseDraftItem {
  return {
    id: ids.generateItemId(),
    rawProductName: row.productName,
    rawBarcode: null,
    matchedProductId: null,
    matchConfidence: 0,
    matchMethod: "unmatched",

    enteredBuyPrice: row.buyPrice,
    previousBuyPrice: null,
    currentSellingPrice: 0,
    discountPercent: 0,

    quantity: row.quantity,
    unit: "pcs",

    batchNumber: row.batchNumber ?? null,
    expiredDate: row.expiredDate ?? null,

    supplierName: null,

    notes: null,

    status: "pending",
    warnings: [],
    mergedFromIds: [],
  };
}

/**
 * Convert all parsed rows into PurchaseDraftItem array.
 */
export function mapRowsToDraftItems(
  rows: ImportRow[],
  ids: ImportIdentityStrategy,
): PurchaseDraftItem[] {
  return rows.map((row) => mapRowToDraftItem(row, ids));
}
