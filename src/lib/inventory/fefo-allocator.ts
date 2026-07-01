// ---------------------------------------------------------------------------
// FEFO (First Expired, First Out) Batch Allocator
// ⚠️ BACKWARD-COMPATIBLE WRAPPER — delegates to IAE (Inventory Allocation Engine)
//    New code should use: import { allocate } from "@/lib/inventory/allocation-engine"
// ---------------------------------------------------------------------------

import type { ProductBatch } from "@/types/inventory";
import type { BatchAllocation } from "./allocation-types";
import { allocate } from "./allocation-engine";

export type { BatchAllocation };

/**
 * Allocate using FEFO priority. Delegates to IAE internally.
 * Preserved for backward compatibility.
 */
export function allocateFefo(
  batches: ProductBatch[],
  neededQty: number,
): BatchAllocation[] {
  const result = allocate(
    { productId: "", neededQty, strategy: "FEFO" },
    batches,
  );
  if (!result.isFullyAllocated) {
    throw new Error(
      `Stok tidak mencukupi untuk alokasi FEFO. Dibutuhkan ${neededQty}, tersedia ${result.totalAllocated}.`,
    );
  }
  return result.allocations;
}

/**
 * Calculate total HPP from allocations.
 * Will move to HPP Engine (SPR-CORE-003).
 */
export function calculateHpp(allocations: BatchAllocation[]): number {
  return allocations.reduce((sum, a) => sum + a.quantity * a.costPrice, 0);
}
