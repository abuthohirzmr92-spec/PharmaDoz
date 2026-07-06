// =================================================================
// BatchPriceProvider Adapter — Infrastructure (V10.4)
// 🔒 Architecture Baseline v1.0 (LOCKED)
//
// Concrete implementation of the Domain BatchPriceProvider contract.
// Wraps ProductBatch[] data for pricing lookups.
//
// Responsibility: Adapt ProductBatch[] → BatchPriceProvider interface
// NEVER: React, Zustand, Supabase, store access
// =================================================================

import type { BatchPriceProvider } from "@/lib/cashier/types";
import type { ProductBatch } from "@/types/inventory";

/**
 * Creates a BatchPriceProvider from a ProductBatch array snapshot.
 *
 * The Application layer provides the batch data (from inventory store).
 * This adapter simply wraps it to satisfy the Domain contract.
 * Used by PricingEngine to look up selling and cost prices per batch.
 *
 * @param batches — Current batch snapshot from inventory
 * @param fallbackSellingPrice — Default selling price if batch not found
 * @returns BatchPriceProvider implementation
 */
export function createBatchPriceProvider(
  batches: ProductBatch[],
  fallbackSellingPrice = 0,
): BatchPriceProvider {
  return {
    getSellingPrice(batchId: string): number {
      const batch = batches.find((b) => b.id === batchId);
      return batch?.sellingPrice ?? fallbackSellingPrice;
    },

    getCostPrice(batchId: string): number {
      const batch = batches.find((b) => b.id === batchId);
      return batch?.unitPrice ?? 0;
    },
  };
}
