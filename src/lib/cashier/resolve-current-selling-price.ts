// =================================================================
// resolveCurrentSellingPrice — Pure Business Utility (Mini-Sprint)
// 🔒 Architecture Baseline v1.0 (LOCKED)
//
// Resolves the Current Active Selling Price from product batches.
// PURE FUNCTION — receives ALL data as parameters.
//
// Business Rule (Architecture Board — 2026-07-06):
//   "The selling price of the first SELLABLE batch according to FEFO."
//   Criteria: stock > 0, not expired, valid batch, first FEFO candidate.
//   If no sellable batch exists → fallback to product defaultSellingPrice.
//   NEVER average historical batches.
//
// Responsibility: Active selling price computation
// NEVER: React, Zustand, Supabase, Repository, store access
// =================================================================

import type { ProductBatch } from "@/types/inventory";

/**
 * Resolve the Current Active Selling Price for a product.
 *
 * Pure function — deterministic, zero side effects.
 * Uses FEFO to find the first sellable batch and returns its sellingPrice.
 * Falls back to product's defaultSellingPrice if no sellable batch exists.
 *
 * @param productId — Product identifier
 * @param batches — All batches for this product
 * @param defaultSellingPrice — Fallback price from product catalog
 * @returns Current active selling price (integer)
 *
 * @example
 * const price = resolveCurrentSellingPrice("demo-001", batches, 15000);
 * // Returns the sellingPrice of the first FEFO batch with stock > 0
 */
export function resolveCurrentSellingPrice(
  productId: string,
  batches: ProductBatch[],
  defaultSellingPrice: number,
): number {
  // 1. Filter: matching product, stock > 0
  const activeBatches = batches.filter(
    (b) => b.productId === productId && b.quantity > 0,
  );

  if (activeBatches.length === 0) {
    return defaultSellingPrice;
  }

  // 2. FEFO sort: earliest expiry first
  const fefo = [...activeBatches].sort(
    (a, b) =>
      new Date(a.expiredDate).getTime() - new Date(b.expiredDate).getTime(),
  );

  // 3. First sellable batch = Current Active Selling Price (Business Rule)
  const first = fefo[0]!;

  // 4. Expiry check: if first batch is expired, fall back
  const now = new Date();
  if (new Date(first.expiredDate) < now) {
    // Try to find next non-expired batch
    const nextValid = fefo.find(
      (b) => new Date(b.expiredDate) >= now,
    );
    return nextValid?.sellingPrice ?? defaultSellingPrice;
  }

  return first.sellingPrice;
}
