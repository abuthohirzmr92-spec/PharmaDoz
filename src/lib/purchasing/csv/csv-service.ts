/**
 * P0.9A — CSV Service
 *
 * Orchestration layer for CSV → Purchase Draft pipeline.
 * Coordinates: parser → mapper → match-engine → warning-engine → draft.
 *
 * NO store imports. NO inventory logic. NO DB writes.
 * NEVER bypasses: match-engine → warning-engine → confirmDraft() → addPurchase()
 */

import { parseCsv } from "./parser";
import { mapCsvRowsToDraftItems } from "./mapper";
import { matchProduct } from "../match-engine";
import { generateWarnings } from "../warning-engine";
import type { ProductReference } from "../match-engine";
import type { PurchaseDraft, PurchaseDraftItem } from "@/types/purchase-draft";

export interface CsvImportDeps {
  /** Generate a draft ID */
  generateDraftId: () => string;
  /** Tenant ID for the draft */
  tenantId: string;
  /** Current branch ID */
  branchId: string | null;
  /** Current user ID */
  userId: string | null;
}

export interface CsvImportResult {
  draft: PurchaseDraft;
  parseErrors: number;
}

/**
 * Full CSV → Draft pipeline:
 *
 *   1. Parse CSV text → CsvRow[]
 *   2. Map rows → PurchaseDraftItem[]
 *   3. Run match-engine on each item
 *   4. Run warning-engine on each item
 *   5. Create PurchaseDraft with results
 *
 * Does NOT call addPurchase(). Draft is returned for human review.
 */
export function importCsvToDraft(
  csvText: string,
  products: ProductReference[],
  deps: CsvImportDeps,
): CsvImportResult {
  // 1. Parse CSV
  const parseResult = parseCsv(csvText);

  // 2. Map to draft items
  const draftItems = mapCsvRowsToDraftItems(parseResult.rows);

  // 3. Run match-engine on each item
  const matchedItems: PurchaseDraftItem[] = draftItems.map((item) => {
    const match = matchProduct(item.rawProductName, products, item.rawBarcode);

    return {
      ...item,
      matchedProductId: match.matchedProductId,
      matchConfidence: match.confidence,
      matchMethod: match.method,
      status: match.matchedProductId ? (match.confidence >= 90 ? "matched" : "fuzzy_match") : "unmatched",
    } as PurchaseDraftItem;
  });

  // 4. Run warning-engine on each item
  const warnedItems: PurchaseDraftItem[] = matchedItems.map((item) => {
    const warnings = generateWarnings(item);
    const hasCritical = warnings.some((w) => w.level === "critical");
    const hasWarning = warnings.some((w) => w.level === "warning");

    return {
      ...item,
      warnings,
      status: hasCritical ? "error" : hasWarning ? "warning" : item.status,
    };
  });

  // 5. Build draft
  const now = new Date().toISOString();
  const draft: PurchaseDraft = {
    id: deps.generateDraftId(),
    tenantId: deps.tenantId,
    branchId: deps.branchId,
    sourceType: "csv",
    sourceReference: null,
    supplierId: null,
    supplierName: null,
    invoiceNumber: null,
    purchaseDate: now,
    dueDate: null,
    items: warnedItems,
    subtotal: 0,
    discountTotal: 0,
    grandTotal: 0,
    status: warnedItems.some((i) => i.status === "error")
      ? "has_error"
      : warnedItems.some((i) => i.status === "warning" || i.status === "unmatched" || i.status === "fuzzy_match")
        ? "has_warning"
        : "ready",
    createdBy: deps.userId,
    createdAt: now,
    updatedAt: now,
  };

  return { draft, parseErrors: parseResult.invalidRows };
}
