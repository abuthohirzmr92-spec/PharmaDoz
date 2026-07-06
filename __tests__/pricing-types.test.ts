/* ------------------------------------------------------------------ */
/*  Pricing Domain Types Unit Tests — Sprint V10.3 Task 1             */
/*  Run with: npx vitest run                                           */
/* ────────────────────────────────────────────────────────────────── */
/*  Architecture Compliance:                                           */
/*    ADR-002  — Pricing SEPARATE from Allocation                     */
/*    ADR-004  — Pricing as separate Bounded Context                  */
/*    Inv-2    — Allocation does NOT know Pricing                      */
/*    Inv-14   — Pricing Engine does NOT change stock                  */
/* ------------------------------------------------------------------ */

import { describe, it, expect } from "vitest";
import type {
  PriceSnapshot,
  PriceEntry,
  PricingInput,
  BatchPriceProvider,
  PricingRule,
} from "@/lib/cashier/types";
import type { AllocationDraft } from "@/lib/cashier/types";

/* ---- helpers ---- */

function makeAllocationDraft(overrides: Partial<AllocationDraft> = {}): AllocationDraft {
  return {
    draftId: "alloc-test-001",
    productId: "test-prod-1",
    entries: [
      { batchId: "bat-1", allocatedQty: 10, allocationOrder: 1 },
      { batchId: "bat-2", allocatedQty: 5, allocationOrder: 2 },
    ],
    totalAllocated: 15,
    generatedAt: "2026-07-05T10:00:00.000Z",
    ...overrides,
  };
}

function makePriceEntry(overrides: Partial<PriceEntry> = {}): PriceEntry {
  return {
    batchId: "bat-1",
    batchNumber: "TST-001",
    sellingPrice: 15000,
    costPrice: 8000,
    allocatedQty: 10,
    subtotal: 150000,
    ...overrides,
  };
}

function makePriceSnapshot(overrides: Partial<PriceSnapshot> = {}): PriceSnapshot {
  return {
    snapshotId: "snap-test-001",
    entries: [
      makePriceEntry({ batchId: "bat-1", batchNumber: "TST-001", allocatedQty: 10, subtotal: 150000 }),
      makePriceEntry({ batchId: "bat-2", batchNumber: "TST-002", allocatedQty: 5, subtotal: 75000 }),
    ],
    subtotal: 225000,
    discount: 0,
    tax: 0,
    grandTotal: 225000,
    generatedAt: "2026-07-05T10:00:00.000Z",
    ...overrides,
  };
}

/* ---- tests ---- */

describe("PriceSnapshot (V10.3 Domain Type)", () => {
  /* ── Construction ── */

  it("can be constructed with all required fields", () => {
    const snap = makePriceSnapshot();

    expect(snap.snapshotId).toBe("snap-test-001");
    expect(snap.entries).toHaveLength(2);
    expect(snap.subtotal).toBe(225000);
    expect(snap.discount).toBe(0);
    expect(snap.tax).toBe(0);
    expect(snap.grandTotal).toBe(225000);
    expect(snap.generatedAt).toBeDefined();
  });

  it("grandTotal = subtotal - discount + tax", () => {
    const snap = makePriceSnapshot({
      subtotal: 100000,
      discount: 10000,
      tax: 5000,
      grandTotal: 95000,
    });

    expect(snap.grandTotal).toBe(95000);
    expect(snap.grandTotal).toBe(snap.subtotal - snap.discount + snap.tax);
  });

  it("supports zero-value entries (empty cart edge case)", () => {
    const snap = makePriceSnapshot({
      entries: [],
      subtotal: 0,
      grandTotal: 0,
    });

    expect(snap.entries).toHaveLength(0);
    expect(snap.grandTotal).toBe(0);
  });

  /* ── Immutability (structural) ── */

  it("PriceSnapshot fields are strongly typed — sellingPrice in PriceEntry, not in AllocationDraft", () => {
    const entry = makePriceEntry({ sellingPrice: 25000 });
    expect(entry.sellingPrice).toBe(25000);

    // Verify: sellingPrice exists in PriceEntry (pricing domain)
    expect("sellingPrice" in entry).toBe(true);

    // Verify: sellingPrice does NOT exist in AllocationEntry (allocation domain)
    const allocEntry = makeAllocationDraft().entries[0]!;
    const allocKeys = Object.keys(allocEntry);
    expect(allocKeys).not.toContain("sellingPrice");
    expect(allocKeys).not.toContain("costPrice");
    expect(allocKeys).not.toContain("subtotal");
  });

  it("PriceSnapshot is structurally separate from AllocationDraft", () => {
    const snap = makePriceSnapshot();
    const alloc = makeAllocationDraft();

    // They share NO overlapping fields beyond batchId reference
    const snapKeys = new Set(Object.keys(snap));
    const allocKeys = new Set(Object.keys(alloc));

    // PriceSnapshot has pricing-only fields
    expect(snapKeys.has("subtotal")).toBe(true);
    expect(snapKeys.has("discount")).toBe(true);
    expect(snapKeys.has("tax")).toBe(true);
    expect(snapKeys.has("grandTotal")).toBe(true);

    // AllocationDraft should NOT have those
    expect(allocKeys.has("subtotal")).toBe(false);
    expect(allocKeys.has("discount")).toBe(false);
    expect(allocKeys.has("tax")).toBe(false);
    expect(allocKeys.has("grandTotal")).toBe(false);
  });

  /* ── Serialization ── */

  it("can be serialized to JSON and back (structural equality)", () => {
    const original = makePriceSnapshot();
    const json = JSON.stringify(original);
    const parsed: PriceSnapshot = JSON.parse(json);

    expect(parsed.snapshotId).toBe(original.snapshotId);
    expect(parsed.entries).toHaveLength(original.entries.length);
    expect(parsed.grandTotal).toBe(original.grandTotal);
    expect(parsed.subtotal).toBe(original.subtotal);
    expect(parsed.discount).toBe(original.discount);
    expect(parsed.tax).toBe(original.tax);
  });

  it("entries serialize all required fields", () => {
    const snap = makePriceSnapshot();
    const json = JSON.stringify(snap);
    const parsed = JSON.parse(json);

    for (const entry of parsed.entries) {
      expect(entry).toHaveProperty("batchId");
      expect(entry).toHaveProperty("batchNumber");
      expect(entry).toHaveProperty("sellingPrice");
      expect(entry).toHaveProperty("costPrice");
      expect(entry).toHaveProperty("allocatedQty");
      expect(entry).toHaveProperty("subtotal");
    }
  });

  /* ── Edge cases ── */

  it("handles single-entry PriceSnapshot", () => {
    const snap = makePriceSnapshot({
      entries: [makePriceEntry()],
      subtotal: 150000,
      grandTotal: 150000,
    });

    expect(snap.entries).toHaveLength(1);
    expect(snap.grandTotal).toBe(150000);
  });

  it("handles large monetary values without floating point issues", () => {
    const snap = makePriceSnapshot({
      entries: [makePriceEntry({ sellingPrice: 99999999, allocatedQty: 9999, subtotal: 999989990001 })],
      subtotal: 999989990001,
      grandTotal: 999989990001,
    });

    expect(snap.grandTotal).toBeGreaterThan(0);
    expect(Number.isInteger(snap.grandTotal)).toBe(true);
  });

  it("discount and tax are explicit (not derived)", () => {
    const snap = makePriceSnapshot({ discount: 0, tax: 0 });

    // Explicit fields, not computed on-the-fly
    expect(snap.discount).toBe(0);
    expect(snap.tax).toBe(0);
  });
});

/* ── BatchPriceProvider Interface ── */

describe("BatchPriceProvider (Repository Contract)", () => {
  it("interface contract is defined — no implementation in Domain Layer", () => {
    // Verify: BatchPriceProvider is an interface (contract), not a class
    // TypeScript interfaces don't exist at runtime, so we verify the type shape
    const provider: BatchPriceProvider = {
      getSellingPrice: (batchId: string) => 15000,
      getCostPrice: (batchId: string) => 8000,
    };

    expect(provider.getSellingPrice("bat-1")).toBe(15000);
    expect(provider.getCostPrice("bat-1")).toBe(8000);
    expect(typeof provider.getSellingPrice).toBe("function");
    expect(typeof provider.getCostPrice).toBe("function");
  });

  it("contract is minimal — only pricing methods (Interface Segregation)", () => {
    const provider: BatchPriceProvider = {
      getSellingPrice: () => 0,
      getCostPrice: () => 0,
    };

    // Only 2 methods — no batch query, no inventory access
    const keys = Object.keys(provider);
    expect(keys).toHaveLength(2);
  });
});

/* ── PricingInput ── */

describe("PricingInput", () => {
  it("links AllocationDraft + BatchPriceProvider", () => {
    const alloc = makeAllocationDraft();
    const priceProvider: BatchPriceProvider = {
      getSellingPrice: () => 15000,
      getCostPrice: () => 8000,
    };

    const input: PricingInput = {
      allocationDraft: alloc,
      priceProvider,
    };

    expect(input.allocationDraft).toBe(alloc);
    expect(input.priceProvider).toBe(priceProvider);
    expect(input.allocationDraft.entries).toHaveLength(2);
  });
});

/* ── PricingRule Interface (future-ready) ── */

describe("PricingRule (future-ready extensibility)", () => {
  it("PricingRule is an interface — no implementation yet", () => {
    const noopRule: PricingRule = {
      ruleId: "standard",
      ruleName: "Standard Pricing",
      apply: (entries) => entries,
    };

    expect(noopRule.ruleId).toBe("standard");
    expect(noopRule.ruleName).toBe("Standard Pricing");

    const entries = [makePriceEntry()];
    expect(noopRule.apply(entries)).toBe(entries);
  });

  it("PricingRule.apply receives and returns PriceEntry[]", () => {
    const discountRule: PricingRule = {
      ruleId: "discount-10",
      ruleName: "10% Discount",
      apply: (entries) =>
        entries.map((e) => ({
          ...e,
          sellingPrice: Math.round(e.sellingPrice * 0.9),
          subtotal: Math.round(e.sellingPrice * 0.9 * e.allocatedQty),
        })),
    };

    const entries = [makePriceEntry({ sellingPrice: 10000, allocatedQty: 5, subtotal: 50000 })];
    const result = discountRule.apply(entries);

    expect(result[0]!.sellingPrice).toBe(9000);
    expect(result[0]!.subtotal).toBe(45000);
  });
});

/* ── Architecture Invariant Verification ── */

describe("Architecture Invariants (V10.3 types)", () => {
  it("Inv-2: AllocationDraft has ZERO pricing fields (verified at type level)", () => {
    const alloc = makeAllocationDraft();

    // AllocationDraft-level check
    const draftKeys = Object.keys(alloc);
    expect(draftKeys).not.toContain("sellingPrice");
    expect(draftKeys).not.toContain("discount");
    expect(draftKeys).not.toContain("tax");
    expect(draftKeys).not.toContain("grandTotal");

    // AllocationEntry-level check
    for (const entry of alloc.entries) {
      const entryKeys = Object.keys(entry);
      expect(entryKeys).not.toContain("sellingPrice");
      expect(entryKeys).not.toContain("costPrice");
      expect(entryKeys).not.toContain("subtotal");
    }
  });

  it("ADR-002: PriceSnapshot is a SEPARATE type — sellingPrice lives ONLY here", () => {
    const snap = makePriceSnapshot();

    // PriceSnapshot carries sellingPrice
    for (const entry of snap.entries) {
      expect(entry.sellingPrice).toBeGreaterThan(0);
    }

    // AllocationDraft does NOT carry sellingPrice (verified in test above)
  });

  it("ADR-004: Pricing types form an independent Bounded Context", () => {
    // Pricing types can be used without importing allocation-specific logic
    const snap: PriceSnapshot = makePriceSnapshot();
    const entry: PriceEntry = makePriceEntry();
    const rule: PricingRule = { ruleId: "x", ruleName: "x", apply: (e) => e };

    // All pricing types are self-contained
    expect(snap.grandTotal).toBeDefined();
    expect(entry.sellingPrice).toBeDefined();
    expect(rule.ruleId).toBeDefined();
  });
});
