// =================================================================
// InventorySnapshotProvider Adapter — Infrastructure (V10.4)
// 🔒 Architecture Baseline v1.0 (LOCKED)
//
// Concrete implementation of the Domain InventorySnapshotProvider contract.
// Wraps ProductBatch[] data for allocation validation.
//
// Responsibility: Adapt ProductBatch[] → InventorySnapshotProvider interface
// NEVER: React, Zustand, Supabase, store access
// =================================================================

import type { InventorySnapshotProvider } from "@/lib/cashier/types";
import type { ProductBatch } from "@/types/inventory";

/**
 * Creates an InventorySnapshotProvider from a ProductBatch array snapshot.
 *
 * The Application layer provides the batch data (from inventory store).
 * This adapter simply wraps it to satisfy the Domain contract.
 * Used by AllocationValidator to compare allocation against current inventory.
 *
 * @param batches — Current batch snapshot from inventory
 * @returns InventorySnapshotProvider implementation
 */
export function createInventorySnapshotProvider(
  batches: ProductBatch[],
): InventorySnapshotProvider {
  return {
    getCurrentBatches(productId: string): ProductBatch[] {
      return batches.filter((b) => b.productId === productId);
    },
  };
}
