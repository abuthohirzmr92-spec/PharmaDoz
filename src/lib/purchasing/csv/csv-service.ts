/**
 * P0.9A.1 — CSV Service (Hardened)
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
import { calculateDraftTotals } from "../draft-engine";
import type { MapperDeps } from "./mapper";
import type { ProductReference } from "../match-engine";
import type { PurchaseDraft, PurchaseDraftItem } from "@/types/purchase-draft";

export interface CsvImportDeps extends MapperDeps {
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
 *   2. Map rows → PurchaseDraftItem[] (via mapper with deps)
 *   3. Run match-engine on each item
 *   4. Run warning-engine on each item
 *   5. Calculate totals via draft-engine
 *   6. Create PurchaseDraft with results
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

  // 2. Map to draft items (mapper deps for ID strategy)
  const draftItems = mapCsvRowsToDraftItems(parseResult.rows, deps);

  // 3. Run match-engine on each item
  const matchedItems: PurchaseDraftItem[] = draftItems.map((item) => {
    const match = matchProduct(item.rawProductName, products, item.rawBarcode);
    const status: PurchaseDraftItem["status"] =
      match.matchedProductId
        ? match.confidence >= 90 ? "matched" : "fuzzy_match"
        : "unmatched";

    return { ...item, matchedProductId: match.matchedProductId, matchConfidence: match.confidence, matchMethod: match.method as PurchaseDraftItem["matchMethod"], status };
  });

  // 4. Run warning-engine on each item
  const warnedItems: PurchaseDraftItem[] = matchedItems.map((item) => {
    const warnings = generateWarnings(item);
    const hasCritical = warnings.some((w) => w.level === "critical");
    const hasWarning = warnings.some((w) => w.level === "warning");
    const status: PurchaseDraftItem["status"] =
      hasCritical ? "error" : hasWarning ? "warning" : item.status;

    return { ...item, warnings, status };
  });

  // 5. Build draft with source reference
  const now = new Date().toISOString();
  const draft: PurchaseDraft = {
    id: deps.generateDraftId(),
    tenantId: deps.tenantId,
    branchId: deps.branchId,
    sourceType: "csv",
    sourceReference: "csv-import",
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

  // 6. Calculate proper totals via draft-engine
  const totals = calculateDraftTotals(draft);
  draft.subtotal = totals.subtotal;
  draft.discountTotal = totals.discountTotal;
  draft.grandTotal = totals.grandTotal;

  return { draft, parseErrors: parseResult.invalidRows };
}
