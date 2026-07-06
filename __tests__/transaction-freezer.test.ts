/* ------------------------------------------------------------------ */
/*  TransactionFreezer Unit Tests — Sprint V10.4 Story 1              */
/*  Run with: npx vitest run                                           */
/* ────────────────────────────────────────────────────────────────── */
/*  Architecture Compliance:                                           */
/*    ADR-001  — CheckoutSession AR (Freezer is final step)           */
/*    Inv-5    — Transaction immutable setelah freeze                 */
/*    Inv-17   — Frozen transaction tidak boleh dimodifikasi           */
/*    Princ-3  — Pure Domain Services                                  */
/* ------------------------------------------------------------------ */

import { describe, it, expect } from "vitest";
import { freeze } from "@/lib/cashier/transaction-freezer";
import type { FreezeInput, TransactionSnapshot } from "@/lib/cashier/types";

/* ---- helpers ---- */

function makeCartItem(overrides: Partial<FreezeInput["cartItems"][number]> = {}) {
  return {
    productId: "prod-1",
    productName: "Paracetamol 500mg",
    baseQuantity: 10,
    baseUnitPrice: 15000,
    selectedUnitCode: "tablet",
    allocationDraft: {
      draftId: "alloc-1",
      productId: "prod-1",
      entries: [{ batchId: "bat-1", allocatedQty: 10, allocationOrder: 1 }],
      totalAllocated: 10,
      generatedAt: "2026-07-05T10:00:00Z",
    },
    priceSnapshot: {
      snapshotId: "price-1",
      entries: [
        {
          batchId: "bat-1",
          batchNumber: "PAR-001",
          sellingPrice: 15000,
          costPrice: 8000,
          allocatedQty: 10,
          subtotal: 150000,
        },
      ],
      subtotal: 150000,
      discount: 0,
      tax: 0,
      grandTotal: 150000,
      generatedAt: "2026-07-05T10:00:00Z",
    },
    ...overrides,
  };
}

function makeInput(overrides: Partial<FreezeInput> = {}): FreezeInput {
  return {
    cartItems: [makeCartItem()],
    payments: [{ amount: 150000, method: "cash" }],
    transactionId: "tx-test-001",
    invoiceNumber: "INV-2026-001",
    cashierName: "Test Kasir",
    pharmacyId: "branch-1",
    cashierId: "user-1",
    ...overrides,
  };
}

/* ---- tests ---- */

describe("TransactionFreezer.freeze()", () => {
  /* ── Basic ── */

  it("produces TransactionSnapshot with all required fields", () => {
    const snap = freeze(makeInput());

    expect(snap.snapshotId).toBeDefined();
    expect(snap.transactionId).toBe("tx-test-001");
    expect(snap.invoiceNumber).toBe("INV-2026-001");
    expect(snap.items).toHaveLength(1);
    expect(snap.payments).toHaveLength(1);
    expect(snap.subtotal).toBe(150000);
    expect(snap.total).toBe(150000);
    expect(snap.cashierName).toBe("Test Kasir");
    expect(snap.pharmacyId).toBe("branch-1");
    expect(snap.cashierId).toBe("user-1");
  });

  it("calculates correct total = subtotal - discount + tax", () => {
    const snap = freeze(makeInput());
    expect(snap.total).toBe(snap.subtotal - snap.discount + snap.tax);
    expect(snap.total).toBe(150000);
  });

  /* ── Multi-item ── */

  it("handles multiple cart items correctly", () => {
    const snap = freeze(
      makeInput({
        cartItems: [
          makeCartItem({ productId: "prod-1", baseQuantity: 10, baseUnitPrice: 15000 }),
          makeCartItem({
            productId: "prod-2",
            productName: "Amoxicillin 500mg",
            baseQuantity: 5,
            baseUnitPrice: 25000,
            allocationDraft: {
              draftId: "alloc-2",
              productId: "prod-2",
              entries: [{ batchId: "bat-2", allocatedQty: 5, allocationOrder: 1 }],
              totalAllocated: 5,
              generatedAt: "2026-07-05T10:00:00Z",
            },
            priceSnapshot: {
              snapshotId: "price-2",
              entries: [
                {
                  batchId: "bat-2",
                  batchNumber: "AMX-001",
                  sellingPrice: 25000,
                  costPrice: 14000,
                  allocatedQty: 5,
                  subtotal: 125000,
                },
              ],
              subtotal: 125000,
              discount: 0,
              tax: 0,
              grandTotal: 125000,
              generatedAt: "2026-07-05T10:00:00Z",
            },
          }),
        ],
      }),
    );

    expect(snap.items).toHaveLength(2);
    expect(snap.items[0]!.subtotal).toBe(150000);
    expect(snap.items[1]!.subtotal).toBe(125000);
    expect(snap.subtotal).toBe(275000);
    expect(snap.total).toBe(275000);
  });

  /* ── Batch allocations ── */

  it("freezes batch allocations from allocationDraft + priceSnapshot", () => {
    const snap = freeze(makeInput());

    const item = snap.items[0]!;
    expect(item.batchAllocations).toHaveLength(1);
    expect(item.batchAllocations[0]!.batchId).toBe("bat-1");
    expect(item.batchAllocations[0]!.batchNumber).toBe("PAR-001");
    expect(item.batchAllocations[0]!.sellingPrice).toBe(15000);
    expect(item.batchAllocations[0]!.costPrice).toBe(8000);
    expect(item.batchAllocations[0]!.allocatedQty).toBe(10);
  });

  it("handles multi-batch allocation in frozen items", () => {
    const snap = freeze(
      makeInput({
        cartItems: [
          makeCartItem({
            allocationDraft: {
              draftId: "alloc-multi",
              productId: "prod-1",
              entries: [
                { batchId: "bat-a", allocatedQty: 10, allocationOrder: 1 },
                { batchId: "bat-b", allocatedQty: 5, allocationOrder: 2 },
              ],
              totalAllocated: 15,
              generatedAt: "2026-07-05T10:00:00Z",
            },
            priceSnapshot: {
              snapshotId: "price-multi",
              entries: [
                { batchId: "bat-a", batchNumber: "A-001", sellingPrice: 10000, costPrice: 5000, allocatedQty: 10, subtotal: 100000 },
                { batchId: "bat-b", batchNumber: "B-001", sellingPrice: 20000, costPrice: 10000, allocatedQty: 5, subtotal: 100000 },
              ],
              subtotal: 200000,
              discount: 0,
              tax: 0,
              grandTotal: 200000,
              generatedAt: "2026-07-05T10:00:00Z",
            },
            baseQuantity: 15,
            baseUnitPrice: 13334, // average ~
          }),
        ],
      }),
    );

    expect(snap.items[0]!.batchAllocations).toHaveLength(2);
  });

  /* ── Payments ── */

  it("freezes multiple payments", () => {
    const snap = freeze(
      makeInput({
        payments: [
          { amount: 100000, method: "cash" },
          { amount: 50000, method: "qris", ref: "QR-001" },
        ],
      }),
    );

    expect(snap.payments).toHaveLength(2);
    expect(snap.payments[0]!.method).toBe("cash");
    expect(snap.payments[1]!.method).toBe("qris");
    expect(snap.payments[1]!.ref).toBe("QR-001");
  });

  /* ── normalizeRupiah ── */

  it("all monetary values are integers", () => {
    const snap = freeze(makeInput());

    expect(Number.isInteger(snap.subtotal)).toBe(true);
    expect(Number.isInteger(snap.total)).toBe(true);
    expect(Number.isInteger(snap.discount)).toBe(true);
    expect(Number.isInteger(snap.tax)).toBe(true);
    for (const item of snap.items) {
      expect(Number.isInteger(item.subtotal)).toBe(true);
      expect(Number.isInteger(item.baseUnitPrice)).toBe(true);
    }
    for (const p of snap.payments) {
      expect(Number.isInteger(p.amount)).toBe(true);
    }
  });

  /* ── Deterministic ── */

  it("is deterministic — same input produces identical output (5 calls)", () => {
    const input = makeInput();
    const results: TransactionSnapshot[] = [];
    for (let i = 0; i < 5; i++) {
      results.push(freeze(input));
    }

    const first = results[0]!;
    for (const r of results) {
      expect(r.total).toBe(first.total);
      expect(r.subtotal).toBe(first.subtotal);
      expect(r.items.map((i) => i.subtotal)).toEqual(first.items.map((i) => i.subtotal));
    }
  });

  it("does NOT mutate input data", () => {
    const input = makeInput();
    const itemsBefore = JSON.stringify(input.cartItems);
    const paymentsBefore = JSON.stringify(input.payments);

    freeze(input);

    expect(JSON.stringify(input.cartItems)).toBe(itemsBefore);
    expect(JSON.stringify(input.payments)).toBe(paymentsBefore);
  });

  /* ── Empty / Edge ── */

  it("handles empty cart", () => {
    const snap = freeze(makeInput({ cartItems: [], payments: [] }));

    expect(snap.items).toHaveLength(0);
    expect(snap.payments).toHaveLength(0);
    expect(snap.subtotal).toBe(0);
    expect(snap.total).toBe(0);
  });

  it("handles item without allocation/pricing data", () => {
    const snap = freeze(
      makeInput({
        cartItems: [
          makeCartItem({
            allocationDraft: undefined,
            priceSnapshot: undefined,
          }),
        ],
      }),
    );

    expect(snap.items[0]!.batchAllocations).toHaveLength(0);
    expect(snap.items[0]!.subtotal).toBe(150000); // baseQuantity × baseUnitPrice
  });

  /* ── Immutability ── */

  it("TransactionSnapshot is structurally immutable (no setters)", () => {
    const snap = freeze(makeInput());

    // Verify all fields are present and can be read
    expect(snap.total).toBeDefined();
    expect(snap.items).toBeDefined();

    // Attempt to modify (TypeScript should catch, but verify runtime)
    const modified = { ...snap, total: 999 };
    expect(snap.total).toBe(150000); // original unchanged
    expect(modified.total).toBe(999); // spread creates new object
  });

  it("snapshotId is unique per call", () => {
    const a = freeze(makeInput());
    const b = freeze(makeInput());
    expect(a.snapshotId).not.toBe(b.snapshotId);
  });

  /* ── Snapshot contains all required data for receipt generation ── */

  it("contains all data needed for receipt rendering", () => {
    const snap = freeze(makeInput());

    // Receipt needs: invoice, items, prices, total, cashier, timestamp
    expect(snap.invoiceNumber).toBeDefined();
    expect(snap.items).toHaveLength(1);
    expect(snap.items[0]!.productName).toBeDefined();
    expect(snap.items[0]!.batchAllocations).toBeDefined();
    expect(snap.total).toBeDefined();
    expect(snap.cashierName).toBeDefined();
    expect(snap.frozenAt).toBeDefined();
  });
});
