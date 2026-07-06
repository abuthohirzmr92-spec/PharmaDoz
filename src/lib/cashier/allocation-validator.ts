// =================================================================
// AllocationValidator — Pure Domain Service (V10.3)
// 🔒 Architecture Baseline v1.0 (LOCKED)
//
// Validates AllocationDraft against current inventory snapshot.
// PURE FUNCTION — receives ALL data as parameters.
//
// Responsibility: Allocation validation only
//   ✅ Stock availability changes
//   ✅ Batch existence in inventory
//   ✅ Batch expiry status
//
// NEVER:
//   ❌ Price calculation → PricingEngine
//   ❌ Discount validation → PricingEngine
//   ❌ Tax calculation → PricingEngine
//   ❌ Allocation rebuild → AllocationBuilder
//   ❌ React, Zustand, Supabase, store access
//
// Architecture Rules (verified at code review):
//   ADR-002  — Validator operates on Allocation (not Pricing)
//   Inv-10   — Domain Service must be Stateless
//   Inv-13   — Domain Service must be Deterministic
// =================================================================

import type {
  ValidationResult,
  ValidationIssue,
  ValidationInput,
} from "./types";
import type { ProductBatch } from "@/types/inventory";

// ─── Validator ───

/**
 * Validate an AllocationDraft against current inventory state.
 *
 * Pure function — deterministic, zero side effects.
 * Checks stock availability, batch existence, and expiry status.
 * Does NOT validate pricing — that is PricingEngine's domain.
 *
 * @param input — ValidationInput { allocationDraft, currentBatches, referenceDate? }
 * @returns ValidationResult — VALID if allocation still matches inventory,
 *          INVALID with issues if discrepancies found
 *
 * @example
 * const result = validateAllocation({
 *   allocationDraft,
 *   currentBatches: inventorySnapshot,
 * });
 * if (result.status === "VALID") { /* proceed to freeze *\/ }
 */
export function validateAllocation(input: ValidationInput): ValidationResult {
  const { allocationDraft, currentBatches, referenceDate } = input;
  const now = referenceDate ?? new Date();
  const issues: ValidationIssue[] = [];

  // Validate each allocation entry against current inventory
  for (const entry of allocationDraft.entries) {
    const currentBatch = currentBatches.find((b) => b.id === entry.batchId);

    // Check 1: Batch still exists
    if (!currentBatch) {
      issues.push({
        type: "BATCH_MISSING",
        batchId: entry.batchId,
        description: `Batch ${entry.batchId} tidak ditemukan dalam inventory.`,
        allocatedQty: entry.allocatedQty,
      });
      continue; // Can't check further if batch is gone
    }

    // Check 2: Stock sufficiency
    if (currentBatch.quantity < entry.allocatedQty) {
      issues.push({
        type: "STOCK_CHANGED",
        batchId: entry.batchId,
        description: `Stok batch ${entry.batchId} berkurang: dialokasikan ${entry.allocatedQty}, tersedia ${currentBatch.quantity}.`,
        allocatedQty: entry.allocatedQty,
        currentQty: currentBatch.quantity,
      });
    }

    // Check 3: Batch expiry
    const expiredDate = new Date(currentBatch.expiredDate);
    if (expiredDate < now) {
      issues.push({
        type: "BATCH_EXPIRED",
        batchId: entry.batchId,
        description: `Batch ${entry.batchId} telah kadaluarsa pada ${currentBatch.expiredDate}.`,
        allocatedQty: entry.allocatedQty,
        currentQty: currentBatch.quantity,
      });
    }
  }

  return {
    status: issues.length === 0 ? "VALID" : "INVALID",
    checkedAt: new Date().toISOString(),
    issues,
  };
}
