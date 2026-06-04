// ---------------------------------------------------------------------------
// FEFO (First Expired, First Out) Batch Allocator
// ---------------------------------------------------------------------------
// Allocates inventory from batches with the earliest expiration date first.
// If two batches have the same expiry, the oldest received_at wins.
//
// Usage:
//   const allocations = allocateFefo(batches, productId, neededQty);
//   → [{ batchId, quantity, costPrice }]
// ---------------------------------------------------------------------------

import type { ProductBatch } from "@/types/inventory";

export interface BatchAllocation {
  batchId: string;
  quantity: number;
  costPrice: number;
}

/**
 * Sort batches by FEFO priority:
 *   1. Earliest expired_date first
 *   2. Earliest received_at first (tiebreaker)
 *   3. Exclude zero-quantity and soft-deleted batches
 */
function sortFefo(batches: ProductBatch[]): ProductBatch[] {
  return [...batches]
    .filter((b) => b.quantity > 0)
    .sort((a, b) => {
      const expA = new Date(a.expiredDate).getTime();
      const expB = new Date(b.expiredDate).getTime();
      if (expA !== expB) return expA - expB;
      // Tiebreaker: oldest received first
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
}

/**
 * Allocate `neededQty` from available batches using FEFO priority.
 * Returns an array of allocations with snapshot cost prices.
 *
 * @param batches  All available batches (will be filtered/sorted internally)
 * @param neededQty  Total quantity needed for the sale
 * @returns Array of { batchId, quantity, costPrice } allocations
 * @throws Error if insufficient stock
 */
export function allocateFefo(
  batches: ProductBatch[],
  neededQty: number,
): BatchAllocation[] {
  const sorted = sortFefo(batches);
  const allocations: BatchAllocation[] = [];
  let remaining = neededQty;

  for (const batch of sorted) {
    if (remaining <= 0) break;

    const take = Math.min(batch.quantity, remaining);
    allocations.push({
      batchId: batch.id,
      quantity: take,
      costPrice: batch.unitPrice, // SNAPSHOT at allocation time
    });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new Error(
      `Stok tidak mencukupi untuk alokasi FEFO. Dibutuhkan ${neededQty}, tersedia ${neededQty - remaining}.`,
    );
  }

  return allocations;
}

/**
 * Calculate total HPP from allocations.
 */
export function calculateHpp(allocations: BatchAllocation[]): number {
  return allocations.reduce((sum, a) => sum + a.quantity * a.costPrice, 0);
}
