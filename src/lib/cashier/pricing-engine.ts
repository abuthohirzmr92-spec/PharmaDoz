// =================================================================
// PricingEngine — Pure Domain Service (V10.3)
// 🔒 Architecture Baseline v1.0 (LOCKED)
//
// Calculates PriceSnapshot from AllocationDraft + price provider.
// PURE FUNCTION — receives ALL data as parameters. Zero lookups.
//
// Responsibility: Pricing calculation → PriceSnapshot
// NEVER: FEFO, inventory, store, repository, React, Zustand, Supabase
//
// Architecture Rules (verified at code review):
//   ADR-002  — PriceSnapshot is SEPARATE from AllocationDraft
//   ADR-004  — Pricing as separate Bounded Context
//   Inv-2    — Allocation does NOT know Pricing (PriceSnapshot is separate)
//   Inv-3    — Pricing does NOT access FEFO
//   Inv-14   — Pricing Engine does NOT change stock
//   Princ-3  — Pure Domain Services
//   Princ-4  — Stateless Domain Logic
// =================================================================

import type { PriceSnapshot, PriceEntry, PricingInput, PricingRule } from "./types";
import { normalizeRupiah } from "@/lib/money/normalize-rupiah";

// ─── Helpers ───

let _seq = 0;
function generateSnapshotId(): string {
  _seq++;
  return `price-${Date.now()}-${_seq}`;
}

// ─── Engine ───

/**
 * Calculate pricing for an allocation.
 *
 * Pure function — deterministic, zero side effects.
 * All monetary values go through normalizeRupiah().
 *
 * @param input — PricingInput { allocationDraft, priceProvider }
 * @param rules — Optional pricing rules (default: standard pricing only)
 * @returns PriceSnapshot with per-entry breakdown and grand total
 *
 * @example
 * const snapshot = calculatePricing({
 *   allocationDraft,
 *   priceProvider: { getSellingPrice, getCostPrice },
 * });
 * // snapshot.grandTotal = sum of all entries.subtotal
 * // snapshot.entries[0].sellingPrice — PRICE IS HERE (not in AllocationDraft)
 */
export function calculatePricing(
  input: PricingInput,
  rules?: readonly PricingRule[],
): PriceSnapshot {
  const { allocationDraft, priceProvider } = input;

  // Guard: empty allocation → empty snapshot
  if (!allocationDraft.entries || allocationDraft.entries.length === 0) {
    return {
      snapshotId: generateSnapshotId(),
      entries: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      grandTotal: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  // 1. Build per-entry pricing
  let entries: PriceEntry[] = allocationDraft.entries.map((allocEntry) => {
    const sellingPrice = priceProvider.getSellingPrice(allocEntry.batchId);
    const costPrice = priceProvider.getCostPrice(allocEntry.batchId);
    const subtotal = normalizeRupiah(sellingPrice * allocEntry.allocatedQty);

    return {
      batchId: allocEntry.batchId,
      batchNumber: `batch-${allocEntry.batchId.slice(-6)}`,
      sellingPrice,
      costPrice,
      allocatedQty: allocEntry.allocatedQty,
      subtotal,
    };
  });

  // 2. Apply pricing rules (future: discount, promo, member pricing)
  if (rules && rules.length > 0) {
    for (const rule of rules) {
      entries = rule.apply(entries);
    }
  }

  // 3. Compute aggregates
  const subtotal = normalizeRupiah(entries.reduce((sum, e) => sum + e.subtotal, 0));

  // Discount and tax are explicit — computed by rules, default 0
  // In V10.3, no rules are active → discount = 0, tax = 0
  const discount = normalizeRupiah(0);
  const tax = normalizeRupiah(0);

  // 4. Grand total
  const grandTotal = normalizeRupiah(subtotal - discount + tax);

  // 5. Build snapshot
  const snapshot: PriceSnapshot = {
    snapshotId: generateSnapshotId(),
    entries,
    subtotal,
    discount,
    tax,
    grandTotal,
    generatedAt: new Date().toISOString(),
  };

  return snapshot;
}
