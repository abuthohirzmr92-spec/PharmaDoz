// =================================================================
// validate-revision.ts V3.2.1 — Validation Layer
// 🔒 ARCHITECTURE LOCKED — Pure function
// Responsibility: UI-level validation only
// NEVER: CorrectionDetail, Engine, Timeline, Audit
// =================================================================

import type { WorkingPurchaseItem, ValidationResult } from "@/components/inventory/invoice-revision/types";

/**
 * Validate revision before submission.
 * PURE FUNCTION — no side effects, no store, no network.
 *
 * @param workingItems — Working copy items
 * @param reason — Revision reason
 * @returns ValidationResult with errors (block save) and warnings (inform only)
 */
export function validateRevision(
  workingItems: WorkingPurchaseItem[],
  reason: string,
): ValidationResult {
  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];

  // TODO Sprint 4: implement validation logic

  // Reason check
  if (reason.trim().length < 20) {
    errors.push({
      field: "reason",
      message: "Alasan revisi minimal 20 karakter.",
      code: "REASON_TOO_SHORT",
    });
  }

  // At least one change
  const hasChanges = workingItems.some((i) => i._state !== "UNCHANGED");
  if (!hasChanges) {
    errors.push({
      field: "items",
      message: "Tidak ada perubahan terdeteksi.",
      code: "NO_CHANGES",
    });
  }

  // Per-item validation
  for (const item of workingItems) {
    if (item._state === "DELETED" || item._state === "UNCHANGED") continue;

    if (!item.productId) {
      errors.push({
        field: "productId",
        itemWorkingId: item.workingId,
        message: `Produk wajib dipilih untuk "${item.productName || "item baru"}".`,
        code: "MISSING_PRODUCT",
      });
    }

    if (item.quantity <= 0) {
      errors.push({
        field: "quantity",
        itemWorkingId: item.workingId,
        message: `Qty harus lebih dari 0 untuk "${item.productName || "item"}".`,
        code: "INVALID_QTY",
      });
    }

    if (item.unitPrice <= 0) {
      errors.push({
        field: "unitPrice",
        itemWorkingId: item.workingId,
        message: `Harga beli harus lebih dari 0 untuk "${item.productName || "item"}".`,
        code: "MISSING_PRICE",
      });
    }

    if (!item.expiredDate) {
      errors.push({
        field: "expiredDate",
        itemWorkingId: item.workingId,
        message: `Tanggal kadaluarsa wajib diisi untuk "${item.productName || "item"}".`,
        code: "MISSING_EXPIRED",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      errorCount: errors.length,
      warningCount: warnings.length,
      hasBlockingError: errors.length > 0,
      hasWarning: warnings.length > 0,
    },
  };
}
