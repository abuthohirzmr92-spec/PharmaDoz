/**
 * P0.9A.3 — Import Pipeline (Shared Core)
 *
 * Enriches raw draft items with match-engine and warning-engine results.
 * Used by CSV, Excel, OCR — no duplicated matching/warning logic.
 */

import { matchProduct } from "../match-engine";
import { generateWarnings } from "../warning-engine";
import type { ProductReference } from "../match-engine";
import type { PurchaseDraftItem } from "@/types/purchase-draft";

/**
 * Run match-engine and warning-engine on all draft items.
 * Returns enriched items with match results and warnings.
 */
export function enrichImportedItems(
  items: PurchaseDraftItem[],
  products: ProductReference[],
): PurchaseDraftItem[] {
  console.log("[P0.9Q IMPORT] products available for matching:", products.length);
  const result: PurchaseDraftItem[] = items.map((item) => {
    // 1. Match
    const match = matchProduct(item.rawProductName, products, item.rawBarcode);
    const matchStatus: PurchaseDraftItem["status"] = match.matchedProductId
      ? match.confidence >= 90
        ? "matched"
        : "fuzzy_match"
      : "unmatched";

    const matched = {
      ...item,
      matchedProductId: match.matchedProductId,
      matchConfidence: match.confidence,
      matchMethod: match.method,
      status: matchStatus,
    };

    // 2. Warnings
    const warnings = generateWarnings(matched);
    const hasCritical = warnings.some((w) => w.level === "critical");
    const hasWarning = warnings.some((w) => w.level === "warning");

    return {
      ...matched,
      warnings,
      status: hasCritical ? "error" : hasWarning ? "warning" : matchStatus,
    };
  });

  const matched = result.filter((i) => i.matchedProductId).length;
  const unmatched = result.filter((i) => !i.matchedProductId).length;
  console.log("[P0.9Q MATCH RATE]", { total: result.length, matched, unmatched, sampleUnmatched: result.filter((i) => !i.matchedProductId).slice(0, 5).map((i) => i.rawProductName) });

  return result;
}
