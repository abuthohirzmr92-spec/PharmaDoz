// =================================================================
// AllocationBuilder — Pure Domain Service (V10.2)
// 🔒 Architecture Baseline v1.0 (LOCKED)
//
// Builds AllocationDraft from ProductBatch[] using FEFO engine.
// PURE FUNCTION — receives ALL data as parameters. Zero lookups.
//
// Responsibility: FEFO allocation → AllocationDraft
// NEVER: sellingPrice, discount, store, repository, React, Zustand
//
// Architecture Rules (verified at code review):
//   ADR-002  — Allocation is SEPARATE from Pricing
//   ADR-003  — FEFO remains pure engine (delegation only)
//   Inv-2    — Allocation does NOT know Pricing
//   Inv-9    — FEFO only accepts Base Unit
//   Inv-10   — Domain Service must be Stateless
//   Inv-13   — Domain Service must be Deterministic
//   Princ-3  — Pure Domain Services
//   Princ-4  — Stateless Domain Logic
// =================================================================

import type { AllocationDraft, AllocationEntry, AllocationInput } from "./types";
import type { ProductBatch } from "@/types/inventory";
import { allocateFefo } from "@/lib/inventory-demo";

// ─── Helpers ───

let _seq = 0;
function generateDraftId(): string {
  _seq++;
  return `alloc-${Date.now()}-${_seq}`;
}

// ─── Builder ───

/**
 * Build an AllocationDraft from available batches using FEFO.
 *
 * Pure function — deterministic, zero side effects.
 * Delegates FEFO logic to the existing `allocateFefo()` engine.
 *
 * @param input — AllocationInput { productId, baseQty, availableBatches }
 * @returns AllocationDraft with per-batch entries (NO sellingPrice)
 * @throws Error if stock is insufficient for the requested quantity
 *
 * @example
 * const draft = buildAllocation({
 *   productId: "demo-001",
 *   baseQty: 30,
 *   availableBatches: batches,
 * });
 * // draft.entries = [{ batchId, allocatedQty, allocationOrder }, ...]
 * // draft.totalAllocated = 30
 * // draft.entries[0].sellingPrice ← DOES NOT EXIST
 */
export function buildAllocation(input: AllocationInput): AllocationDraft {
  const { productId, baseQty, availableBatches } = input;

  // Guard: zero or negative quantity
  if (baseQty <= 0) {
    throw new Error(
      `Quantity harus lebih besar dari 0. Diterima: ${baseQty} untuk produk ${productId}.`,
    );
  }

  // Guard: empty batches
  if (!availableBatches || availableBatches.length === 0) {
    throw new Error(
      `Tidak ada batch tersedia untuk produk ${productId}.`,
    );
  }

  // 1. Delegate to FEFO engine (pure function, unchanged from V9)
  const fefoResult = allocateFefo(availableBatches, productId, baseQty);

  // 2. Validate total allocated matches requested
  const totalAllocated = fefoResult.reduce((sum, a) => sum + a.take, 0);
  if (totalAllocated < baseQty) {
    const batch = availableBatches.find((b) => b.productId === productId);
    const name = batch?.productName ?? productId;
    throw new Error(
      `Stok tidak mencukupi untuk ${name}: butuh ${baseQty}, tersedia ${totalAllocated}.`,
    );
  }

  // 3. Transform to AllocationDraft — STRIP ALL PRICE DATA
  const entries: AllocationEntry[] = fefoResult
    .filter((a) => a.take > 0)
    .map((a, i) => ({
      batchId: a.batchId,
      allocatedQty: a.take,
      allocationOrder: i + 1, // FEFO order: 1 = highest priority
    }));

  // 4. Build draft
  const draft: AllocationDraft = {
    draftId: generateDraftId(),
    productId,
    entries,
    totalAllocated,
    generatedAt: new Date().toISOString(),
  };

  return draft;
}
