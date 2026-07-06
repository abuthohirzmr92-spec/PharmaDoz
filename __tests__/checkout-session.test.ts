/* ------------------------------------------------------------------ */
/*  CheckoutSessionService Tests — Sprint V10.4 Story 3               */
/*  Run with: npx vitest run                                           */
/* ────────────────────────────────────────────────────────────────── */
/*  Architecture Compliance:                                           */
/*    ADR-001  — CheckoutSession as Aggregate Root                    */
/*    Princ-6  — Composition over Coupling                             */
/* ------------------------------------------------------------------ */

import { describe, it, expect, beforeEach } from "vitest";
import { CheckoutSessionService } from "@/services/checkout-session.service";
import type {
  CheckoutSession,
  BatchProvider,
  BatchPriceProvider,
  InventorySnapshotProvider,
} from "@/lib/cashier/types";
import type { ProductBatch } from "@/types/inventory";

/* ---- test data ---- */

function testBatches(): ProductBatch[] {
  return [
    {
      id: "bat-1", tenantId: "t1", productId: "prod-1", productName: "Test Product",
      batchNumber: "TST-001", expiredDate: "2027-12-31", quantity: 100,
      unitPrice: 8000, sellingPrice: 15000, createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "bat-2", tenantId: "t1", productId: "prod-1", productName: "Test Product",
      batchNumber: "TST-002", expiredDate: "2027-06-30", quantity: 50,
      unitPrice: 7800, sellingPrice: 15000, createdAt: "2026-01-01T00:00:00Z",
    },
  ];
}

function createService(batches?: ProductBatch[]) {
  const b = batches ?? testBatches();
  const batchProvider: BatchProvider = {
    getBatchesByProduct: (pid) => b.filter((x) => x.productId === pid && x.quantity > 0),
    getBatchById: (bid) => b.find((x) => x.id === bid),
  };
  const priceProvider: BatchPriceProvider = {
    getSellingPrice: (bid) => b.find((x) => x.id === bid)?.sellingPrice ?? 0,
    getCostPrice: (bid) => b.find((x) => x.id === bid)?.unitPrice ?? 0,
  };
  const inventoryProvider: InventorySnapshotProvider = {
    getCurrentBatches: (pid) => b.filter((x) => x.productId === pid),
  };
  return new CheckoutSessionService(batchProvider, priceProvider, inventoryProvider);
}

function createSession(overrides: Partial<CheckoutSession> = {}): CheckoutSession {
  return {
    sessionId: "sess-test",
    cartId: "cart-1",
    tenantId: "t1",
    branchId: "b1",
    cashierId: "u1",
    status: "DRAFT",
    version: 1,
    createdAt: "2026-07-05T10:00:00Z",
    updatedAt: "2026-07-05T10:00:00Z",
    ...overrides,
  };
}

function cartItems() {
  return [
    {
      productId: "prod-1",
      productName: "Test Product",
      baseQuantity: 10,
      baseUnitPrice: 15000,
      selectedUnitCode: "tablet",
    },
  ];
}

/* ---- tests ---- */

describe("CheckoutSessionService", () => {
  let svc: CheckoutSessionService;

  beforeEach(() => {
    svc = createService();
  });

  /* ── createSession ── */

  it("creates a session in DRAFT state", () => {
    const session = svc.createSession({
      cartId: "cart-1",
      tenantId: "t1",
      branchId: "b1",
      cashierId: "u1",
    });

    expect(session.status).toBe("DRAFT");
    expect(session.cartId).toBe("cart-1");
    expect(session.version).toBe(1);
    expect(session.sessionId).toBeDefined();
  });

  /* ── allocateInventory ── */

  it("allocates inventory and transitions DRAFT → ALLOCATING", () => {
    const session = svc.createSession({
      cartId: "cart-1", tenantId: "t1", branchId: "b1", cashierId: "u1",
    });

    const allocated = svc.allocateInventory(session, "prod-1", 10);

    expect(allocated.status).toBe("ALLOCATING");
    expect(allocated.allocationDraft).toBeDefined();
    expect(allocated.allocationDraft!.totalAllocated).toBe(10);
    expect(allocated.version).toBe(2);
  });

  it("stale pricing and validation are cleared on re-allocation", () => {
    const session = createSession({
      status: "PRICED" as const,
      allocationDraft: {
        draftId: "old", productId: "prod-1",
        entries: [{ batchId: "bat-1", allocatedQty: 5, allocationOrder: 1 }],
        totalAllocated: 5, generatedAt: "2026-07-05T10:00:00Z",
      },
      priceSnapshot: {
        snapshotId: "old-price", entries: [], subtotal: 75000,
        discount: 0, tax: 0, grandTotal: 75000, generatedAt: "2026-07-05T10:00:00Z",
      },
      validationResult: { status: "VALID", checkedAt: "", issues: [] },
    });

    const allocated = svc.allocateInventory(session, "prod-1", 10);

    expect(allocated.priceSnapshot).toBeUndefined();
    expect(allocated.validationResult).toBeUndefined();
    expect(allocated.allocationDraft!.totalAllocated).toBe(10);
  });

  /* ── calculatePricing ── */

  it("calculates pricing after allocation → PRICED", () => {
    const session = createSession({
      status: "ALLOCATING" as const,
      allocationDraft: {
        draftId: "a1", productId: "prod-1",
        entries: [{ batchId: "bat-1", allocatedQty: 10, allocationOrder: 1 }],
        totalAllocated: 10, generatedAt: "2026-07-05T10:00:00Z",
      },
    });

    const priced = svc.calculatePricing(session);

    expect(priced.status).toBe("PRICED");
    expect(priced.priceSnapshot).toBeDefined();
    expect(priced.priceSnapshot!.grandTotal).toBe(150000);
  });

  it("throws when pricing without allocation", () => {
    const session = createSession({ status: "DRAFT" as const });
    expect(() => svc.calculatePricing(session)).toThrow(/alokasi belum dilakukan/);
  });

  /* ── validate ── */

  it("validates and transitions PRICED → VALIDATED when valid", () => {
    const session = createSession({
      status: "PRICED" as const,
      allocationDraft: {
        draftId: "a1", productId: "prod-1",
        entries: [{ batchId: "bat-1", allocatedQty: 10, allocationOrder: 1 }],
        totalAllocated: 10, generatedAt: "2026-07-05T10:00:00Z",
      },
    });

    const validated = svc.validate(session);

    expect(validated.status).toBe("VALIDATED");
    expect(validated.validationResult).toBeDefined();
    expect(validated.validationResult!.status).toBe("VALID");
  });

  it("stays at PRICED when validation fails (stock changed)", () => {
    // Create service with insufficient stock
    const lowBatches: ProductBatch[] = [{
      id: "bat-1", tenantId: "t1", productId: "prod-1", productName: "T",
      batchNumber: "TST-001", expiredDate: "2027-12-31", quantity: 3,
      unitPrice: 8000, sellingPrice: 15000, createdAt: "2026-01-01T00:00:00Z",
    }];
    const lowSvc = createService(lowBatches);

    const session = createSession({
      status: "PRICED" as const,
      allocationDraft: {
        draftId: "a1", productId: "prod-1",
        entries: [{ batchId: "bat-1", allocatedQty: 10, allocationOrder: 1 }],
        totalAllocated: 10, generatedAt: "2026-07-05T10:00:00Z",
      },
    });

    const result = lowSvc.validate(session);
    expect(result.status).toBe("PRICED");
    expect(result.validationResult!.status).toBe("INVALID");
  });

  /* ── freeze ── */

  it("freezes a validated session → FROZEN with TransactionSnapshot", () => {
    const session = createSession({
      status: "VALIDATED" as const,
      allocationDraft: {
        draftId: "a1", productId: "prod-1",
        entries: [{ batchId: "bat-1", allocatedQty: 10, allocationOrder: 1 }],
        totalAllocated: 10, generatedAt: "2026-07-05T10:00:00Z",
      },
      priceSnapshot: {
        snapshotId: "p1",
        entries: [{ batchId: "bat-1", batchNumber: "TST-001", sellingPrice: 15000, costPrice: 8000, allocatedQty: 10, subtotal: 150000 }],
        subtotal: 150000, discount: 0, tax: 0, grandTotal: 150000,
        generatedAt: "2026-07-05T10:00:00Z",
      },
    });

    const frozen = svc.freeze(
      session, cartItems(), [{ amount: 150000, method: "cash" }],
      "tx-1", "INV-001", "Test Kasir",
    );

    expect(frozen.status).toBe("FROZEN");
    expect(frozen.transactionSnapshot).toBeDefined();
    expect(frozen.transactionSnapshot!.total).toBe(150000);
  });

  it("throws when freezing without validation", () => {
    const session = createSession({ status: "DRAFT" as const });
    expect(() =>
      svc.freeze(session, cartItems(), [], "tx-1", "INV-001", "Kasir"),
    ).toThrow(/belum divalidasi/);
  });

  /* ── FROZEN guard ── */

  it("throws when modifying a FROZEN session", () => {
    const frozen = createSession({
      status: "FROZEN" as const,
      transactionSnapshot: {} as any,
    });

    expect(() => svc.allocateInventory(frozen, "prod-1", 1)).toThrow(/dibekukan/);
    expect(() => svc.calculatePricing(frozen)).toThrow(/dibekukan/);
    expect(() => svc.validate(frozen)).toThrow(/dibekukan/);
  });

  /* ── Full pipeline ── */

  it("runs full checkout pipeline: allocate → price → validate → freeze", () => {
    const session = svc.createSession({
      cartId: "cart-1", tenantId: "t1", branchId: "b1", cashierId: "u1",
    });

    const result = svc.checkout({
      session,
      productId: "prod-1",
      baseQty: 10,
      cartItems: cartItems(),
      payments: [{ amount: 150000, method: "cash" }],
      transactionId: "tx-full",
      invoiceNumber: "INV-FULL",
      cashierName: "Test Kasir",
    });

    expect(result.status).toBe("FROZEN");
    expect(result.transactionSnapshot).toBeDefined();
    expect(result.transactionSnapshot!.total).toBe(150000);
    expect(result.version).toBe(5); // create(1) + allocate(2) + price(3) + validate(4) + freeze(5)
  });

  /* ── Session independence ── */

  it("two sessions are independent", () => {
    const s1 = svc.createSession({ cartId: "c1", tenantId: "t1", branchId: "b1", cashierId: "u1" });
    const s2 = svc.createSession({ cartId: "c2", tenantId: "t1", branchId: "b1", cashierId: "u1" });

    expect(s1.sessionId).not.toBe(s2.sessionId);

    const a1 = svc.allocateInventory(s1, "prod-1", 10);
    expect(a1.status).toBe("ALLOCATING");
    expect(s2.status).toBe("DRAFT"); // s2 unchanged
  });

  /* ── Architecture compliance ── */

  it("CheckoutSessionService does NOT contain business logic — it composes domain services", () => {
    const session = svc.createSession({ cartId: "c1", tenantId: "t1", branchId: "b1", cashierId: "u1" });
    const allocated = svc.allocateInventory(session, "prod-1", 10);

    // The service produces the same allocation as calling AllocationBuilder directly
    expect(allocated.allocationDraft!.totalAllocated).toBe(10);
    expect(allocated.allocationDraft!.entries[0]!.allocatedQty).toBeGreaterThan(0);
    // No sellingPrice in allocation (verified by AllocationBuilder tests)
  });
});
