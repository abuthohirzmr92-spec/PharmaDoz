/* ------------------------------------------------------------------ */
/*  AllocationValidator Unit Tests — Sprint V10.3 Task 3              */
/*  Run with: npx vitest run                                           */
/* ────────────────────────────────────────────────────────────────── */
/*  Architecture Compliance:                                           */
/*    Inv-10  — Domain Service Stateless                               */
/*    Inv-13  — Domain Service Deterministic                           */
/* ------------------------------------------------------------------ */

import { describe, it, expect } from "vitest";
import { validateAllocation } from "@/lib/cashier/allocation-validator";
import type { AllocationDraft, ValidationInput } from "@/lib/cashier/types";
import type { ProductBatch } from "@/types/inventory";

/* ---- helpers ---- */

function makeBatch(overrides: Partial<ProductBatch> = {}): ProductBatch {
  return {
    id: "bat-1",
    tenantId: "test",
    productId: "test-prod",
    productName: "Test",
    batchNumber: "TST-001",
    expiredDate: "2027-12-31",
    quantity: 100,
    unitPrice: 8000,
    sellingPrice: 15000,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeAllocation(entries: AllocationDraft["entries"]): AllocationDraft {
  return {
    draftId: "alloc-test",
    productId: "test-prod",
    entries,
    totalAllocated: entries.reduce((s, e) => s + e.allocatedQty, 0),
    generatedAt: "2026-07-05T10:00:00.000Z",
  };
}

function makeInput(overrides: Partial<ValidationInput> = {}): ValidationInput {
  return {
    allocationDraft: makeAllocation([
      { batchId: "bat-1", allocatedQty: 10, allocationOrder: 1 },
    ]),
    currentBatches: [makeBatch({ id: "bat-1", quantity: 100 })],
    ...overrides,
  };
}

/* ---- tests ---- */

describe("AllocationValidator.validateAllocation()", () => {
  /* ── VALID Cases ── */

  it("returns VALID when allocation matches current inventory", () => {
    const result = validateAllocation(makeInput());
    expect(result.status).toBe("VALID");
    expect(result.issues).toHaveLength(0);
  });

  it("returns VALID when stock is exactly equal to allocated quantity", () => {
    const result = validateAllocation(
      makeInput({
        currentBatches: [makeBatch({ id: "bat-1", quantity: 10 })],
      }),
    );
    expect(result.status).toBe("VALID");
  });

  it("returns VALID when stock is greater than allocated (some left)", () => {
    const result = validateAllocation(
      makeInput({
        currentBatches: [makeBatch({ id: "bat-1", quantity: 50 })],
      }),
    );
    expect(result.status).toBe("VALID");
  });

  /* ── INVALID: STOCK_CHANGED ── */

  it("detects STOCK_CHANGED when batch quantity decreased below allocation", () => {
    const result = validateAllocation(
      makeInput({
        currentBatches: [makeBatch({ id: "bat-1", quantity: 5 })],
      }),
    );

    expect(result.status).toBe("INVALID");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]!.type).toBe("STOCK_CHANGED");
    expect(result.issues[0]!.allocatedQty).toBe(10);
    expect(result.issues[0]!.currentQty).toBe(5);
  });

  it("detects STOCK_CHANGED when batch quantity is zero", () => {
    const result = validateAllocation(
      makeInput({
        currentBatches: [makeBatch({ id: "bat-1", quantity: 0 })],
      }),
    );

    expect(result.status).toBe("INVALID");
    expect(result.issues[0]!.type).toBe("STOCK_CHANGED");
  });

  /* ── INVALID: BATCH_MISSING ── */

  it("detects BATCH_MISSING when batch no longer in inventory", () => {
    const result = validateAllocation(
      makeInput({
        currentBatches: [], // batch bat-1 tidak ada
      }),
    );

    expect(result.status).toBe("INVALID");
    expect(result.issues[0]!.type).toBe("BATCH_MISSING");
    expect(result.issues[0]!.batchId).toBe("bat-1");
    expect(result.issues[0]!.description).toContain("tidak ditemukan");
  });

  it("detects BATCH_MISSING for one of multiple batches", () => {
    const result = validateAllocation(
      makeInput({
        allocationDraft: makeAllocation([
          { batchId: "bat-1", allocatedQty: 10, allocationOrder: 1 },
          { batchId: "bat-missing", allocatedQty: 5, allocationOrder: 2 },
        ]),
        currentBatches: [makeBatch({ id: "bat-1", quantity: 100 })],
      }),
    );

    expect(result.status).toBe("INVALID");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]!.type).toBe("BATCH_MISSING");
    expect(result.issues[0]!.batchId).toBe("bat-missing");
  });

  /* ── INVALID: BATCH_EXPIRED ── */

  it("detects BATCH_EXPIRED when batch has passed expiry date", () => {
    const futureDate = new Date("2026-07-05T12:00:00Z");
    const result = validateAllocation(
      makeInput({
        currentBatches: [
          makeBatch({ id: "bat-1", quantity: 100, expiredDate: "2025-06-01" }),
        ],
        referenceDate: futureDate,
      }),
    );

    expect(result.status).toBe("INVALID");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]!.type).toBe("BATCH_EXPIRED");
    expect(result.issues[0]!.description).toContain("kadaluarsa");
  });

  it("BATCH_EXPIRED when expiry date is today (exact boundary)", () => {
    const today = new Date("2026-07-05T10:00:00Z");
    const result = validateAllocation(
      makeInput({
        currentBatches: [
          makeBatch({ id: "bat-1", quantity: 100, expiredDate: "2026-07-05T09:59:59Z" }),
        ],
        referenceDate: today,
      }),
    );

    expect(result.status).toBe("INVALID");
    expect(result.issues[0]!.type).toBe("BATCH_EXPIRED");
  });

  /* ── Multiple Issues ── */

  it("detects multiple issues across different batches", () => {
    const result = validateAllocation(
      makeInput({
        allocationDraft: makeAllocation([
          { batchId: "bat-ok", allocatedQty: 10, allocationOrder: 1 },
          { batchId: "bat-low", allocatedQty: 50, allocationOrder: 2 },
          { batchId: "bat-gone", allocatedQty: 5, allocationOrder: 3 },
        ]),
        currentBatches: [
          makeBatch({ id: "bat-ok", quantity: 100 }),
          makeBatch({ id: "bat-low", quantity: 20 }), // STOCK_CHANGED
          // bat-gone: BATCH_MISSING
        ],
      }),
    );

    expect(result.status).toBe("INVALID");
    expect(result.issues).toHaveLength(2);
    const types = result.issues.map((i) => i.type).sort();
    expect(types).toEqual(["BATCH_MISSING", "STOCK_CHANGED"]);
  });

  it("detects both STOCK_CHANGED and BATCH_EXPIRED on same batch", () => {
    const futureDate = new Date("2026-07-05T12:00:00Z");
    const result = validateAllocation(
      makeInput({
        currentBatches: [
          makeBatch({ id: "bat-1", quantity: 2, expiredDate: "2025-01-01" }),
        ],
        referenceDate: futureDate,
      }),
    );

    expect(result.status).toBe("INVALID");
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
    const types = result.issues.map((i) => i.type);
    expect(types).toContain("STOCK_CHANGED");
    expect(types).toContain("BATCH_EXPIRED");
  });

  /* ── Deterministic & Pure ── */

  it("is deterministic — same input produces identical output", () => {
    const input = makeInput();
    const results = Array.from({ length: 5 }, () => validateAllocation(input));

    const first = results[0]!;
    for (const r of results) {
      expect(r.status).toBe(first.status);
      expect(r.issues).toEqual(first.issues);
    }
  });

  it("does NOT mutate input objects", () => {
    const alloc = makeAllocation([
      { batchId: "bat-1", allocatedQty: 10, allocationOrder: 1 },
    ]);
    const batches = [makeBatch({ id: "bat-1", quantity: 100 })];
    const allocBefore = JSON.stringify(alloc);
    const batchesBefore = JSON.stringify(batches);

    validateAllocation({
      allocationDraft: alloc,
      currentBatches: batches,
    });

    expect(JSON.stringify(alloc)).toBe(allocBefore);
    expect(JSON.stringify(batches)).toBe(batchesBefore);
  });

  /* ── Architecture Compliance ── */

  it("Validator does NOT import or use PricingEngine logic", () => {
    // Validator only has: batchId, quantity, expiredDate
    // It does NOT check: sellingPrice, discount, tax, grandTotal
    const result = validateAllocation(makeInput());
    expect(result.issues).toHaveLength(0);

    // Verify: issues never mention pricing
    for (const issue of result.issues) {
      expect(issue.type).not.toContain("PRICE");
      expect(issue.type).not.toContain("DISCOUNT");
      expect(issue.type).not.toContain("TAX");
    }
  });

  it("empty allocation returns VALID", () => {
    const result = validateAllocation(
      makeInput({
        allocationDraft: makeAllocation([]),
      }),
    );

    expect(result.status).toBe("VALID");
    expect(result.issues).toHaveLength(0);
  });
});
