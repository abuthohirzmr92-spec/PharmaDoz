/**
 * P0.9A.3 — CSV Service (Thin Orchestration)
 *
 * Coordinates shared import core for CSV → Purchase Draft.
 * No business logic — all logic in import/ core.
 */

import { parseCsv } from "./parser";
import { mapRowsToDraftItems } from "../import/import-mapper";
import { enrichImportedItems } from "../import/import-pipeline";
import { buildImportDraft } from "../import/import-draft-builder";
import type { ImportDeps } from "../import/import-service.types";
import type { ProductReference } from "../match-engine";
import type { PurchaseDraft } from "@/types/purchase-draft";

export interface CsvImportResult {
  draft: PurchaseDraft;
  parseErrors: number;
}

/**
 * Full CSV → Draft pipeline:
 *
 *   parseCsv → mapRowsToDraftItems → enrichImportedItems → buildImportDraft
 *
 * All steps delegate to shared import/ core.
 * Does NOT call addPurchase(). Draft is returned for human review.
 */
export function importCsvToDraft(
  csvText: string,
  products: ProductReference[],
  deps: ImportDeps,
): CsvImportResult {
  const parseResult = parseCsv(csvText);
  const items = mapRowsToDraftItems(parseResult.rows, deps);
  const enriched = enrichImportedItems(items, products);
  const draft = buildImportDraft(enriched, "csv", deps);

  return { draft, parseErrors: parseResult.invalidRows };
}
