/**
 * P0.9A.3 — Import Status Engine (Shared Core)
 *
 * Single source of truth for computing draft status from items.
 * Used by CSV, Excel, OCR — no duplicated status logic.
 */

import type { PurchaseDraft, PurchaseDraftItem } from "@/types/purchase-draft";

/**
 * Calculate draft status from its items.
 * Priority: error > warning/unmatched/fuzzy > ready
 */
export function calculateImportStatus(
  items: PurchaseDraftItem[],
): PurchaseDraft["status"] {
  const hasError = items.some((i) => i.status === "error");
  if (hasError) return "has_error";

  const needsReview = items.some(
    (i) =>
      i.status === "warning" ||
      i.status === "unmatched" ||
      i.status === "fuzzy_match",
  );
  if (needsReview) return "has_warning";

  return "ready";
}
