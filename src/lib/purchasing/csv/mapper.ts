/**
 * P0.9A — CSV Mapper
 *
 * Converts CSV rows into PurchaseDraftItem objects.
 * NO matching. NO warnings. NO repositories. NO store.
 * Pure functions only.
 */

import type { CsvRow } from "./types";
import type { PurchaseDraftItem } from "@/types/purchase-draft";

/**
 * Convert a CsvRow to a PurchaseDraftItem.
 * IDs are generated deterministically via crypto.randomUUID().
 * All items start as "pending" — matching and warnings run later.
 */
export function mapCsvRowToDraftItem(row: CsvRow): PurchaseDraftItem {
  const id = crypto.randomUUID();

  return {
    id,
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
export function mapCsvRowsToDraftItems(rows: CsvRow[]): PurchaseDraftItem[] {
  return rows.map(mapCsvRowToDraftItem);
}
