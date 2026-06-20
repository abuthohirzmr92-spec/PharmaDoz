/**
 * P0.9A.1 — CSV Mapper (Hardened)
 *
 * Converts CSV rows into PurchaseDraftItem objects.
 * NO matching. NO warnings. NO repositories. NO store.
 * NO random ID generation — accepts deps for ID strategy.
 * Pure functions only.
 */

import type { CsvRow } from "./types";
import type { PurchaseDraftItem } from "@/types/purchase-draft";

export interface MapperDeps {
  /** Generate a unique ID for each draft item */
  generateItemId: () => string;
}

/**
 * Convert a CsvRow to a PurchaseDraftItem.
 * All items start as "pending" — matching and warnings run later.
 */
export function mapCsvRowToDraftItem(row: CsvRow, deps: MapperDeps): PurchaseDraftItem {
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
 * Convert all parsed CSV rows into PurchaseDraftItem array.
 */
export function mapCsvRowsToDraftItems(rows: CsvRow[], deps: MapperDeps): PurchaseDraftItem[] {
  return rows.map((row) => mapCsvRowToDraftItem(row, deps));
}
