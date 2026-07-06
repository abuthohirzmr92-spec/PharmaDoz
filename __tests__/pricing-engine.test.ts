/* ------------------------------------------------------------------ */
/*  PricingEngine Unit Tests — Sprint V10.3 Task 2                    */
/*  Run with: npx vitest run                                           */
/* ────────────────────────────────────────────────────────────────── */
/*  Architecture Compliance:                                           */
/*    ADR-002  — Pricing SEPARATE from Allocation                     */
/*    ADR-004  — Pricing as separate Bounded Context                  */
/*    Inv-2    — Allocation does NOT know Pricing                      */
/*    Inv-3    — Pricing does NOT access FEFO                          */
/*    Inv-14   — Pricing Engine does NOT change stock                  */
/*    Princ-3  — Pure Domain Services                                  */
/*    Princ-4  — Stateless Domain Logic                                */
/* ------------------------------------------------------------------ */

import { describe, it, expect } from "vitest";
import { calculatePricing } from "@/lib/cashier/pricing-engine";
import type {
  AllocationDraft,
  PricingInput,
  PriceSnapshot,
  PriceEntry,
  BatchPriceProvider,
} from "@/lib/cashier/types";

/* ---- helpers ---- */

function makeAllocation(entries: AllocationDraft["entries"]): AllocationDraft {
  return {
    draftId: "alloc-test",
    productId: "test-prod",
    entries,
    totalAllocated: entries.reduce((s, e) => s + e.allocatedQty, 0),
    generatedAt: "2026-07-05T10:00:00.000Z",
  };
}

function makeProvider(
  overrides: Partial<BatchPriceProvider> = {},
): BatchPriceProvider {
  return {
    getSellingPrice: (id: string) => {
      if (id === "bat-1") return 15000;
      if (id === "bat-2") return 25000;
      if (id === "bat-3") return 35000;
      return 10000;
    },
    getCostPrice: (id: string) => {
      if (id === "bat-1") return 8000;
      if (id === "bat-2") return 14000;
      if (id === "bat-3") return 20000;
      return 5000;
    },
    ...overrides,
  };
}

function makeInput(
  overrides: Partial<PricingInput> = {},
): PricingInput {
  return {
    allocationDraft: makeAllocation([
      { batchId: "bat-1", allocatedQty: 10, allocationOrder: 1 },
    ]),
    priceProvider: makeProvider(),
    ...overrides,
  };
}

/* ---- tests ---- */

describe("PricingEngine.calculatePricing()", () => {
  /* ── Basic Functionality ── */

  it("calculates correct subtotal for a single batch allocation", () => {
    const result = calculatePricing(makeInput());

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]!.sellingPrice).toBe(15000);
    expect(result.entries[0]!.costPrice).toBe(8000);
    expect(result.entries[0]!.allocatedQty).toBe(10);
    expect(result.entries[0]!.subtotal).toBe(150000); // 15000 × 10
  });

  it("calculates correct grand total = sum of all subtotals", () => {
    const result = calculatePricing(
      makeInput({
        allocationDraft: makeAllocation([
          { batchId: "bat-1", allocatedQty: 10, allocationOrder: 1 },
          { batchId: "bat-2", allocatedQty: 5, allocationOrder: 2 },
        ]),
      }),
    );

    // bat-1: 15000 × 10 = 150000
    // bat-2: 25000 × 5 = 125000
    // grandTotal: 275000
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]!.subtotal).toBe(150000);
    expect(result.entries[1]!.subtotal).toBe(125000);
    expect(result.subtotal).toBe(275000);
    expect(result.grandTotal).toBe(275000);
  });

  /* ── Multi-Batch with Different Prices ── */

  it("handles batches with different selling prices correctly", () => {
    const result = calculatePricing(
      makeInput({
        allocationDraft: makeAllocation([
          { batchId: "bat-1", allocatedQty: 3, allocationOrder: 1 },
          { batchId: "bat-3", allocatedQty: 5, allocationOrder: 2 },
        ]),
      }),
    );

    // bat-1: 15000 × 3 = 45000
    // bat-3: 35000 × 5 = 175000
    expect(result.subtotal).toBe(220000);
    expect(result.grandTotal).toBe(220000);
  });

  it("handles FEFO allocation correctly — first batch cheapest/most-expensive doesn't matter", () => {
    const result = calculatePricing(
      makeInput({
        allocationDraft: makeAllocation([
          { batchId: "bat-3", allocatedQty: 2, allocationOrder: 1 }, // 35000
          { batchId: "bat-1", allocatedQty: 10, allocationOrder: 2 }, // 15000
        ]),
      }),
    );

    // bat-3: 35000 × 2 = 70000
    // bat-1: 15000 × 10 = 150000
    expect(result.subtotal).toBe(220000);
    expect(result.grandTotal).toBe(220000);
  });

  /* ── Edge Cases ── */

  it("returns empty snapshot for empty allocation", () => {
    const result = calculatePricing(
      makeInput({
        allocationDraft: makeAllocation([]),
      }),
    );

    expect(result.entries).toHaveLength(0);
    expect(result.subtotal).toBe(0);
    expect(result.grandTotal).toBe(0);
    expect(result.discount).toBe(0);
    expect(result.tax).toBe(0);
  });

  it("handles single unit allocation (quantity = 1)", () => {
    const result = calculatePricing(
      makeInput({
        allocationDraft: makeAllocation([
          { batchId: "bat-2", allocatedQty: 1, allocationOrder: 1 },
        ]),
      }),
    );

    expect(result.entries[0]!.subtotal).toBe(25000); // 25000 × 1
    expect(result.grandTotal).toBe(25000);
  });

  it("handles large quantities without overflow or floating point errors", () => {
    const result = calculatePricing(
      makeInput({
        allocationDraft: makeAllocation([
          { batchId: "bat-1", allocatedQty: 9999, allocationOrder: 1 },
        ]),
      }),
    );

    const expected = 15000 * 9999;
    expect(result.entries[0]!.subtotal).toBe(expected);
    expect(result.grandTotal).toBe(expected);
    expect(Number.isInteger(result.grandTotal)).toBe(true);
  });

  /* ── normalizeRupiah Compliance ── */

  it("all monetary values are integers (normalizeRupiah applied)", () => {
    const result = calculatePricing(makeInput());

    expect(Number.isInteger(result.subtotal)).toBe(true);
    expect(Number.isInteger(result.grandTotal)).toBe(true);
    expect(Number.isInteger(result.discount)).toBe(true);
    expect(Number.isInteger(result.tax)).toBe(true);

    for (const entry of result.entries) {
      expect(Number.isInteger(entry.subtotal)).toBe(true);
      expect(Number.isInteger(entry.sellingPrice)).toBe(true);
    }
  });

  it("rounds decimal subtotals via normalizeRupiah (Math.round)", () => {
    const fracProvider = makeProvider({
      getSellingPrice: () => 33333.6, // non-integer price
    });

    const result = calculatePricing({
      allocationDraft: makeAllocation([
        { batchId: "bat-x", allocatedQty: 3, allocationOrder: 1 },
      ]),
      priceProvider: fracProvider,
    });

    // 33333.6 × 3 = 100000.8 → Math.round = 100001
    expect(Number.isInteger(result.entries[0]!.subtotal)).toBe(true);
    expect(result.entries[0]!.subtotal).toBe(100001);
    expect(Number.isInteger(result.grandTotal)).toBe(true);
  });

  /* ── Deterministic & Pure ── */

  it("is deterministic — same input produces identical output (5 calls)", () => {
    const input = makeInput();
    const results: PriceSnapshot[] = [];
    for (let i = 0; i < 5; i++) {
      results.push(calculatePricing(input));
    }

    const first = results[0]!;
    for (let i = 1; i < results.length; i++) {
      expect(results[i]!.grandTotal).toBe(first.grandTotal);
      expect(results[i]!.subtotal).toBe(first.subtotal);
      expect(results[i]!.entries).toEqual(first.entries);
    }
  });

  it("does NOT mutate the input allocation", () => {
    const alloc = makeAllocation([
      { batchId: "bat-1", allocatedQty: 10, allocationOrder: 1 },
    ]);
    const snapshot = JSON.stringify(alloc);

    calculatePricing({ allocationDraft: alloc, priceProvider: makeProvider() });

    // Allocation must be unchanged
    expect(JSON.stringify(alloc)).toBe(snapshot);
  });

  /* ── Discount & Tax ── */

  it("discount defaults to 0 (no pricing rules active)", () => {
    const result = calculatePricing(makeInput());
    expect(result.discount).toBe(0);
  });

  it("tax defaults to 0 (no pricing rules active)", () => {
    const result = calculatePricing(makeInput());
    expect(result.tax).toBe(0);
  });

  it("grandTotal = subtotal - discount + tax", () => {
    const result = calculatePricing(makeInput());
    expect(result.grandTotal).toBe(
      result.subtotal - result.discount + result.tax,
    );
  });

  /* ── Pricing Rules (extensibility) ── */

  it("applies a simple discount rule when provided", () => {
    const input = makeInput();

    const discountRule = {
      ruleId: "flat-5000",
      ruleName: "Flat Discount Rp 5,000",
      apply: (entries: PriceEntry[]) =>
        entries.map((e) => ({
          ...e,
          subtotal: e.subtotal - 5000,
        })),
    };

    const result = calculatePricing(input, [discountRule]);
    expect(result.entries[0]!.subtotal).toBe(145000);
  });

  /* ── PriceSnapshot Structure ── */

  it("PriceSnapshot has all required fields", () => {
    const result = calculatePricing(makeInput());

    expect(result).toHaveProperty("snapshotId");
    expect(result).toHaveProperty("entries");
    expect(result).toHaveProperty("subtotal");
    expect(result).toHaveProperty("discount");
    expect(result).toHaveProperty("tax");
    expect(result).toHaveProperty("grandTotal");
    expect(result).toHaveProperty("generatedAt");
  });

  it("snapshotId is unique per call", () => {
    const a = calculatePricing(makeInput());
    const b = calculatePricing(makeInput());

    expect(a.snapshotId).not.toBe(b.snapshotId);
  });

  it("each PriceEntry has batchId, batchNumber, sellingPrice, costPrice, allocatedQty, subtotal", () => {
    const result = calculatePricing(makeInput());

    const entry = result.entries[0]!;
    expect(entry).toHaveProperty("batchId");
    expect(entry).toHaveProperty("batchNumber");
    expect(entry).toHaveProperty("sellingPrice");
    expect(entry).toHaveProperty("costPrice");
    expect(entry).toHaveProperty("allocatedQty");
    expect(entry).toHaveProperty("subtotal");
  });

  /* ── Architecture Invariant Verification ── */

  describe("Architecture Invariants", () => {
    it("Inv-2: PriceSnapshot does NOT expose allocation-only data", () => {
      const result = calculatePricing(makeInput());

      // PriceSnapshot has pricing data — NOT allocation metadata
      for (const entry of result.entries) {
        expect((entry as any).allocationOrder).toBeUndefined();
        expect((entry as any).fefoPriority).toBeUndefined();
      }
    });

    it("Inv-14: PricingEngine does NOT mutate stock or allocation", () => {
      const alloc = makeAllocation([
        { batchId: "bat-1", allocatedQty: 10, allocationOrder: 1 },
      ]);
      const allocBefore = JSON.stringify(alloc);

      calculatePricing({ allocationDraft: alloc, priceProvider: makeProvider() });

      expect(JSON.stringify(alloc)).toBe(allocBefore);
    });

    it("Inv-3: PricingEngine has ZERO knowledge of FEFO", () => {
      const result = calculatePricing(makeInput());

      // PricingEngine output has no FEFO data
      expect((result as any).fefoOrder).toBeUndefined();
      expect((result as any).expiredDate).toBeUndefined();

      for (const entry of result.entries) {
        expect((entry as any).fefoOrder).toBeUndefined();
        expect((entry as any).expiredDate).toBeUndefined();
      }
    });

    it("Princ-3/4: PricingEngine is stateless and pure", () => {
      const input = makeInput();
      const a = calculatePricing(input);
      const b = calculatePricing(input);

      expect(a.grandTotal).toBe(b.grandTotal);
      expect(a.entries).toEqual(b.entries);
    });
  });
});
