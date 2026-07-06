// =================================================================
// BatchProvider Adapter — Infrastructure (V10.4)
// 🔒 Architecture Baseline v1.0 (LOCKED)
//
// Concrete implementation of the Domain BatchProvider contract.
// Wraps ProductBatch[] data provided by the Application layer.
//
// Responsibility: Adapt ProductBatch[] → BatchProvider interface
// NEVER: React, Zustand, Supabase, store access
// =================================================================

import type { BatchProvider } from "@/lib/cashier/types";
import type { ProductBatch } from "@/types/inventory";

/**
 * Creates a BatchProvider from a ProductBatch array snapshot.
 *
 * The Application layer provides the batch data (from inventory store).
 * This adapter simply wraps it to satisfy the Domain contract.
 *
 * @param batches — Current batch snapshot from inventory
 * @returns BatchProvider implementation
 */
export function createBatchProvider(batches: ProductBatch[]): BatchProvider {
  return {
    getBatchesByProduct(productId: string): ProductBatch[] {
      return batches.filter((b) => b.productId === productId && b.quantity > 0);
    },

    getBatchById(batchId: string): ProductBatch | undefined {
      return batches.find((b) => b.id === batchId);
    },
  };
}
