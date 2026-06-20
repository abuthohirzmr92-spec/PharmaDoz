/**
 * P0.9A.2 — CSV Mapper (Architecture Hardened)
 *
 * Converts import rows into PurchaseDraftItem objects.
 * Uses shared ImportMapperDeps for ID strategy (shared with Excel/OCR).
 * NO matching. NO warnings. NO repositories. NO store.
 * Pure functions only.
 */

import type { ImportRow, ImportMapperDeps } from "../import/import-types";
import type { PurchaseDraftItem } from "@/types/purchase-draft";

/**
 * Convert an ImportRow to a PurchaseDraftItem.
 * All items start as "pending" — matching and warnings run later.
 */
export function mapRowToDraftItem(row: ImportRow, deps: ImportMapperDeps): PurchaseDraftItem {
  return {
    id: deps.generateItemId(),
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
export function mapRowsToDraftItems(rows: ImportRow[], deps: ImportMapperDeps): PurchaseDraftItem[] {
  return rows.map((row) => mapRowToDraftItem(row, deps));
}
