/**
 * P0.9A.3 — Source Reference Builder (Shared Core)
 *
 * Builds deterministic source reference strings for audit trail.
 * No magic strings scattered across importers.
 */

import type { DraftSource } from "@/types/purchase-draft";

const SOURCE_LABELS: Record<DraftSource, string> = {
  manual: "manual",
  csv: "csv-import",
  excel: "excel-import",
  ocr: "ocr-import",
};

/**
 * Build source reference string from source type.
 */
export function buildSourceReference(source: DraftSource): string {
  return SOURCE_LABELS[source];
}
