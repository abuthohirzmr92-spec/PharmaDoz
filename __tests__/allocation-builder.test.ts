/* ------------------------------------------------------------------ */
/*  AllocationBuilder Unit Tests — Sprint V10.2                       */
/*  Run with: npx vitest run                                           */
/* ────────────────────────────────────────────────────────────────── */
/*  Architecture Compliance:                                           */
/*    ADR-002  — Allocation SEPARATE from Pricing                     */
/*    ADR-003  — FEFO remains pure engine                             */
/*    Inv-2    — Allocation does NOT know Pricing                      */
/*    Inv-9    — FEFO only accepts Base Unit                           */
/*    Inv-10   — Domain Service Stateless                              */
/*    Inv-13   — Domain Service Deterministic                          */
/* ------------------------------------------------------------------ */

import { describe, it, expect } from "vitest";
import { buildAllocation } from "@/lib/cashier/allocation-builder";
import type { AllocationDraft, AllocationInput } from "@/lib/cashier/types";
import type { ProductBatch } from "@/types/inventory";

/* ---- helpers ---- */

function makeBatch(overrides: Partial<ProductBatch> = {}): ProductBatch {
  return {
    id: `bat-test-${Math.random().toString(36).slice(2, 8)}`,
    tenantId: "test-tenant",
    productId: "test-prod-1",
    productName: "Test Product",
    batchNumber: `TST-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    expiredDate: "2027-12-31",
    quantity: 100,
    unitPrice: 8000,
    sellingPrice: 15000,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeInput(overrides: Partial<AllocationInput> = {}): AllocationInput {
  return {
    productId: "test-prod-1",
    baseQty: 10,
    availableBatches: [makeBatch({ quantity: 100 })],
    ...overrides,
  };
}

/* ---- tests ---- */

describe("AllocationBuilder.buildAllocation()", () => {
  /* ── Basic Functionality ── */

  it("produces an AllocationDraft for a single batch with sufficient stock", () => {
    const draft = buildAllocation(
      makeInput({ baseQty: 10, availableBatches: [makeBatch({ id: "bat-1", quantity: 100 })] }),
    );

    expect(draft.productId).toBe("test-prod-1");
    expect(draft.totalAllocated).toBe(10);
    expect(draft.entries).toHaveLength(1);
    expect(draft.entries[0]!).toMatchObject({
      batchId: "bat-1",
      allocatedQty: 10,
      allocationOrder: 1,
    });
  });

  it("allocates the exact quantity needed across a single batch", () => {
    const draft = buildAllocation(
      makeInput({ baseQty: 50, availableBatches: [makeBatch({ id: "bat-1", quantity: 50 })] }),
    );

    expect(draft.totalAllocated).toBe(50);
    expect(draft.entries[0]!.allocatedQty).toBe(50);
  });

  /* ── Multi-Batch Allocation ── */

  it("allocates across multiple batches when the first cannot fulfill the request", () => {
    const batches = [
      makeBatch({ id: "bat-a", quantity: 20, expiredDate: "2027-01-01" }),
      makeBatch({ id: "bat-b", quantity: 30, expiredDate: "2027-06-01" }),
      makeBatch({ id: "bat-c", quantity: 50, expiredDate: "2027-12-01" }),
    ];

    const draft = buildAllocation(makeInput({ baseQty: 55, availableBatches: batches }));

    expect(draft.totalAllocated).toBe(55);
    // First two batches should be fully consumed (FEFO: earliest expiry first)
    expect(draft.entries).toHaveLength(3);
    expect(draft.entries[0]!).toMatchObject({ batchId: "bat-a", allocatedQty: 20 });
    expect(draft.entries[1]).toMatchObject({ batchId: "bat-b", allocatedQty: 30 });
    expect(draft.entries[2]).toMatchObject({ batchId: "bat-c", allocatedQty: 5 });
  });

  it("allocates all from the first batch when it has enough stock", () => {
    const batches = [
      makeBatch({ id: "bat-a", quantity: 100, expiredDate: "2027-01-01" }),
      makeBatch({ id: "bat-b", quantity: 100, expiredDate: "2027-12-01" }),
    ];

    const draft = buildAllocation(makeInput({ baseQty: 30, availableBatches: batches }));

    expect(draft.totalAllocated).toBe(30);
    // Only first batch used (FEFO: earliest expiry first, and it has enough)
    expect(draft.entries).toHaveLength(1);
    expect(draft.entries[0]!.batchId).toBe("bat-a");
    expect(draft.entries[0]!.allocatedQty).toBe(30);
  });

  /* ── FEFO Ordering ── */

  it("respects FEFO ordering — earliest expiry allocated first", () => {
    const batches = [
      makeBatch({ id: "bat-later", quantity: 50, expiredDate: "2028-06-01" }),
      makeBatch({ id: "bat-sooner", quantity: 50, expiredDate: "2027-01-01" }),
    ];

    const draft = buildAllocation(makeInput({ baseQty: 20, availableBatches: batches }));

    // bat-sooner has earlier expiry → should be allocationOrder = 1
    expect(draft.entries[0]!.batchId).toBe("bat-sooner");
    expect(draft.entries[0]!.allocationOrder).toBe(1);
  });

  it("already-expired batches are allocated first (FEFO)", () => {
    const batches = [
      makeBatch({ id: "bat-active", quantity: 50, expiredDate: "2027-12-01" }),
      makeBatch({ id: "bat-expired", quantity: 30, expiredDate: "2025-01-01" }),
    ];

    const draft = buildAllocation(makeInput({ baseQty: 25, availableBatches: batches }));

    // Expired batch should be allocated first
    expect(draft.entries[0]!.batchId).toBe("bat-expired");
  });

  it("assigns correct allocationOrder (1, 2, 3...) by FEFO priority", () => {
    const batches = [
      makeBatch({ id: "bat-3rd", quantity: 50, expiredDate: "2028-01-01" }),
      makeBatch({ id: "bat-1st", quantity: 30, expiredDate: "2026-06-01" }),
      makeBatch({ id: "bat-2nd", quantity: 40, expiredDate: "2027-01-01" }),
    ];

    // Request 100 — needs all 3 batches (30 + 40 + 30)
    const draft = buildAllocation(makeInput({ baseQty: 100, availableBatches: batches }));

    expect(draft.entries).toHaveLength(3);
    expect(draft.entries[0]!.batchId).toBe("bat-1st");
    expect(draft.entries[0]!.allocationOrder).toBe(1);
    expect(draft.entries[0]!.allocatedQty).toBe(30);
    expect(draft.entries[1]!.batchId).toBe("bat-2nd");
    expect(draft.entries[1]!.allocationOrder).toBe(2);
    expect(draft.entries[1]!.allocatedQty).toBe(40);
    expect(draft.entries[2]!.batchId).toBe("bat-3rd");
    expect(draft.entries[2]!.allocationOrder).toBe(3);
    expect(draft.entries[2]!.allocatedQty).toBe(30);
    expect(draft.totalAllocated).toBe(100);
  });

  /* ── Edge Cases ── */

  it("throws when requested quantity exceeds available stock", () => {
    const batches = [makeBatch({ quantity: 5 })];

    expect(() => buildAllocation(makeInput({ baseQty: 20, availableBatches: batches }))).toThrow(
      /Stok tidak mencukupi/,
    );
  });

  it("throws when baseQty is zero", () => {
    expect(() => buildAllocation(makeInput({ baseQty: 0 }))).toThrow(
      /Quantity harus lebih besar dari 0/,
    );
  });

  it("throws when baseQty is negative", () => {
    expect(() => buildAllocation(makeInput({ baseQty: -5 }))).toThrow(
      /Quantity harus lebih besar dari 0/,
    );
  });

  it("throws when there are no batches at all", () => {
    expect(() => buildAllocation(makeInput({ availableBatches: [] }))).toThrow(
      /Tidak ada batch tersedia/,
    );
  });

  it("throws when no batch matches the productId (all quantity=0 batches filtered out)", () => {
    // All batches filtered by FEFO (quantity=0 means they're skipped)
    const batches = [makeBatch({ quantity: 0 })];

    expect(() => buildAllocation(makeInput({ baseQty: 5, availableBatches: batches }))).toThrow(
      /Stok tidak mencukupi/,
    );
  });

  it("allocationOrder starts from 1 for any single allocation", () => {
    const draft = buildAllocation(makeInput({ baseQty: 1 }));
    expect(draft.entries[0]!.allocationOrder).toBe(1);
  });

  /* ── Deterministic & Pure ── */

  it("is deterministic — same input produces identical output", () => {
    const batches = [
      makeBatch({ id: "bat-a", quantity: 30, expiredDate: "2027-01-01", createdAt: "2026-01-01T00:00:00Z" }),
      makeBatch({ id: "bat-b", quantity: 30, expiredDate: "2027-06-01", createdAt: "2026-01-01T00:00:00Z" }),
    ];

    const results: AllocationDraft[] = [];
    for (let i = 0; i < 5; i++) {
      results.push(
        buildAllocation(makeInput({ baseQty: 40, availableBatches: [...batches] })),
      );
    }

    // All results must be identical in allocation (except generatedAt which uses Date.now)
    const first = results[0]!;
    for (const result of results) {
      expect(result.entries).toEqual(first.entries);
      expect(result.totalAllocated).toBe(first.totalAllocated);
      expect(result.productId).toBe(first.productId);
    }
  });

  it("does NOT mutate the input batches array", () => {
    const batches = [makeBatch({ id: "bat-x", quantity: 100 })];
    const snapshot = { ...batches[0] };

    buildAllocation(makeInput({ baseQty: 30, availableBatches: batches }));

    // Original batch must remain unchanged
    expect(batches[0]!.quantity).toBe(snapshot.quantity);
    expect(batches[0]!.sellingPrice).toBe(snapshot.sellingPrice);
  });

  /* ── Architecture Invariant Verification ── */

  describe("Architecture Invariants", () => {
    it("Inv-2: AllocationDraft does NOT contain sellingPrice", () => {
      const draft = buildAllocation(makeInput());

      // Verify no sellingPrice at the draft level
      expect((draft as any).sellingPrice).toBeUndefined();

      // Verify no sellingPrice at the entry level
      for (const entry of draft.entries) {
        expect((entry as any).sellingPrice).toBeUndefined();
        expect((entry as any).costPrice).toBeUndefined();
        expect((entry as any).discount).toBeUndefined();
        expect((entry as any).tax).toBeUndefined();
        expect((entry as any).promotion).toBeUndefined();
        expect((entry as any).margin).toBeUndefined();
        expect((entry as any).subtotal).toBeUndefined();
      }
    });

    it("Inv-2: AllocationDraft only contains batchId, allocatedQty, allocationOrder", () => {
      const draft = buildAllocation(makeInput());

      for (const entry of draft.entries) {
        const keys = Object.keys(entry).sort();
        expect(keys).toEqual(
          ["allocationOrder", "allocatedQty", "batchId"].sort(),
        );
      }
    });

    it("Inv-10: AllocationBuilder is stateless — repeated calls produce consistent results", () => {
      const input = makeInput({ baseQty: 5 });
      const a = buildAllocation(input);
      const b = buildAllocation(input);

      // Same input → same entries
      expect(a.entries).toEqual(b.entries);
      expect(a.totalAllocated).toBe(b.totalAllocated);
    });
  });

  /* ── Integration: matches existing allocateFefo() output ── */

  it("produces allocation entries that match FEFO engine output (batchId + quantity)", () => {
    const batches = [
      makeBatch({ id: "bat-001", quantity: 60, expiredDate: "2027-12-01" }),
      makeBatch({ id: "bat-002", quantity: 40, expiredDate: "2026-06-01" }),
    ];

    const draft = buildAllocation(makeInput({ baseQty: 80, availableBatches: batches }));

    // FEFO: bat-002 (exp 2026-06) → bat-001 (exp 2027-12)
    expect(draft.entries[0]!.batchId).toBe("bat-002");
    expect(draft.entries[0]!.allocatedQty).toBe(40);
    expect(draft.entries[1]!.batchId).toBe("bat-001");
    expect(draft.entries[1]!.allocatedQty).toBe(40);
    expect(draft.totalAllocated).toBe(80);
  });

  it("sum of all allocatedQty equals totalAllocated", () => {
    const batches = [
      makeBatch({ id: "bat-1", quantity: 15, expiredDate: "2027-01-01" }),
      makeBatch({ id: "bat-2", quantity: 25, expiredDate: "2027-06-01" }),
      makeBatch({ id: "bat-3", quantity: 10, expiredDate: "2027-12-01" }),
    ];

    const draft = buildAllocation(makeInput({ baseQty: 40, availableBatches: batches }));

    const sum = draft.entries.reduce((s, e) => s + e.allocatedQty, 0);
    expect(sum).toBe(draft.totalAllocated);
    expect(draft.totalAllocated).toBe(40);
  });
});
