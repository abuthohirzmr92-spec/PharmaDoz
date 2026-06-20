/**
 * P0.9A.2 — CSV Service (Architecture Hardened)
 *
 * Orchestration layer for CSV → Purchase Draft pipeline.
 * Coordinates: parser → mapper → match-engine → warning-engine → draft.
 *
 * Uses shared ImportMapperDeps (SSOT with Excel/OCR).
 * NO store imports. NO inventory logic. NO DB writes.
 * NEVER bypasses: match-engine → warning-engine → confirmDraft() → addPurchase()
 */

import { parseCsv } from "./parser";
import { mapRowsToDraftItems } from "./mapper";
import { matchProduct } from "../match-engine";
import { generateWarnings } from "../warning-engine";
import { calculateDraftTotals } from "../draft-engine";
import type { ImportMapperDeps } from "../import/import-types";
import type { ProductReference } from "../match-engine";
import type { PurchaseDraft, PurchaseDraftItem } from "@/types/purchase-draft";

export interface CsvImportDeps extends ImportMapperDeps {
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
 *   1. Parse CSV text → ImportRow[]
 *   2. Map rows → PurchaseDraftItem[] (via mapper with deps)
 *   3. Run match-engine on each item
 *   4. Run warning-engine on each item
 *   5. Calculate totals via draft-engine
 *   6. Return immutable PurchaseDraft
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

  // 2. Map to draft items (shared ImportMapperDeps)
  const draftItems = mapRowsToDraftItems(parseResult.rows, deps);

  // 3. Run match-engine on each item
  const matchedItems: PurchaseDraftItem[] = draftItems.map((item) => {
    const match = matchProduct(item.rawProductName, products, item.rawBarcode);
    const status: PurchaseDraftItem["status"] =
      match.matchedProductId
        ? match.confidence >= 90 ? "matched" : "fuzzy_match"
        : "unmatched";

    return { ...item, matchedProductId: match.matchedProductId, matchConfidence: match.confidence, matchMethod: match.method, status };
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

  // 5. Determine status
  const draftStatus: PurchaseDraft["status"] =
    warnedItems.some((i) => i.status === "error")
      ? "has_error"
      : warnedItems.some((i) => i.status === "warning" || i.status === "unmatched" || i.status === "fuzzy_match")
        ? "has_warning"
        : "ready";

  const now = new Date().toISOString();

  // 6. Build draft with totals from engine (immutable — no post-creation mutation)
  const temp: PurchaseDraft = {
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
    status: draftStatus,
    createdBy: deps.userId,
    createdAt: now,
    updatedAt: now,
  };

  const totals = calculateDraftTotals(temp);

  return {
    draft: {
      ...temp,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      grandTotal: totals.grandTotal,
    },
    parseErrors: parseResult.invalidRows,
  };
}
