// =================================================================
// build-correction-details.ts V3.2.1 — Adapter Stage 2 (ENGINE-SPECIFIC)
// 🔒 ARCHITECTURE LOCKED — Pure function
// Responsibility: transform WorkingDiff → CorrectionDetail[]
// =================================================================

import type { CorrectionDetail } from "./correction-types";
import type { WorkingDiff } from "@/components/inventory/invoice-revision/types";

/**
 * Transform a generic WorkingDiff into engine-specific CorrectionDetail[].
 * PURE FUNCTION — no side effects, no store, no network.
 *
 * @param diff — Generic diff from build-working-diff
 * @returns CorrectionDetail[] ready for correctInvoice()
 */
export function buildCorrectionDetails(
  diff: WorkingDiff,
): CorrectionDetail[] {
  const details: CorrectionDetail[] = [];

  // TODO Sprint 4: implement detail building
  // For each FieldChange → create CorrectionDetail
  // For each added item → create CorrectionDetail with empty old values
  // For each removed item → create CorrectionDetail with empty new values

  for (const change of diff.changed) {
    details.push({
      id: crypto.randomUUID(),
      correlationId: "",
      correctionId: "",
      resourceItemId: change.itemWorkingId,
      productName: "",
      fieldName: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
      dataType: "text",
      createdAt: new Date().toISOString(),
    });
  }

  return details;
}
