/**
 * P0.9B — Excel Service (Thin Orchestration)
 *
 * Coordinates shared import core for Excel → Purchase Draft.
 * No business logic — all logic in import/ core.
 * Same pipeline as CSV.
 */

import { parseExcel } from "./parser";
import { mapRowsToDraftItems } from "../import/import-mapper";
import { enrichImportedItems } from "../import/import-pipeline";
import { buildImportDraft } from "../import/import-draft-builder";
import type { ImportDeps } from "../import/import-service.types";
import type { ProductReference } from "../match-engine";
import type { PurchaseDraft } from "@/types/purchase-draft";

export interface ExcelImportResult {
  draft: PurchaseDraft;
  parseErrors: number;
}

/**
 * Full Excel → Draft pipeline:
 *
 *   parseExcel → mapRowsToDraftItems → enrichImportedItems → buildImportDraft
 *
 * All steps delegate to shared import/ core.
 * Does NOT call addPurchase(). Draft is returned for human review.
 */
export async function importExcelToDraft(
  file: File,
  products: ProductReference[],
  deps: ImportDeps,
): Promise<ExcelImportResult> {
  const parseResult = await parseExcel(file);
  const items = mapRowsToDraftItems(parseResult.rows, deps);
  const enriched = enrichImportedItems(items, products);
  const draft = buildImportDraft(enriched, "excel", deps);

  return { draft, parseErrors: parseResult.invalidRows };
}
