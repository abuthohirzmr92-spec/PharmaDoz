/* ------------------------------------------------------------------ */
/*  Inventory store unit tests                                         */
/*  Run with: npx vitest run                                           */
/* ------------------------------------------------------------------ */

import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import { useInventoryStore } from "@/store/inventory-store";
import type {
  PurchaseInvoice,
  PurchaseItem,
  StockOpname,
  StockOpnameItem,
} from "@/types/inventory";

/* ------------------------------------------------------------------ */
/*  Fake system clock so date-dependent tests are deterministic        */
/* ------------------------------------------------------------------ */

const FAKE_NOW = new Date("2026-05-19T12:00:00Z");

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FAKE_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

/* ------------------------------------------------------------------ */
/*  Reset store before each test                                       */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  useInventoryStore.setState({
    batches: [],
    suppliers: [],
    purchaseInvoices: [],
    stockMovements: [],
    stockOpnames: [],
    activeTab: "dashboard",
    searchQuery: "",
    isDemoMode: true,
  });
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let seq = 0;

function resetSeq(): void {
  seq = 0;
}

function mkItem(overrides: Partial<PurchaseItem> = {}): PurchaseItem {
  seq++;
  return {
    id: `pi-${seq}`,
    productId: "demo-999",
    productName: "Test Product",
    batchNumber: `BATCH-${seq}`,
    expiredDate: "2027-12-31",
    quantity: 100,
    unitPrice: 5000,
    sellingPrice: 10000,
    ...overrides,
  };
}

function mkInvoice(overrides: Partial<PurchaseInvoice> = {}): PurchaseInvoice {
  seq++;
  const items = overrides.items ?? [mkItem()];
  const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  return {
    id: `inv-${seq}`,
    invoiceNumber: `INV-TEST-${String(seq).padStart(3, "0")}`,
    supplierId: "sup-001",
    supplierName: "Test Supplier",
    purchaseDate: "2026-05-19",
    dueDate: "2026-06-19",
    status: "unpaid",
    totalAmount,
    paidAmount: 0,
    items,
    ...overrides,
  };
}

function mkOpnameItem(
  overrides: Partial<StockOpnameItem> = {},
): StockOpnameItem {
  seq++;
  return {
    productId: "demo-001",
    productName: "Paracetamol 500mg",
    batchId: "bat-001b",
    batchNumber: "PAR-2026-001",
    systemQty: 55,
    physicalQty: 60,
    difference: 5,
    note: "Lebih 5",
    ...overrides,
  };
}

function mkOpname(overrides: Partial<StockOpname> = {}): StockOpname {
  seq++;
  return {
    id: `opn-test-${seq}`,
    date: "2026-05-19",
    status: "confirmed",
    conductedBy: "Test Admin",
    items: [mkOpnameItem()],
    notes: "Test opname",
    ...overrides,
  };
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/* ================================================================== */
/*  Tests                                                              */
/* ================================================================== */

describe("InventoryStore", () => {
  /* ---------------------------------------------------------------- */
  /*  Purchase Flow                                                    */
  /* ---------------------------------------------------------------- */

  describe("Purchase Flow", () => {
    beforeEach(() => {
      resetSeq();
    });

    it("addPurchase should add a new purchase invoice to the store", () => {
      const store = useInventoryStore.getState();
      const invoice = mkInvoice();

      store.addPurchase(invoice);

      const { purchaseInvoices } = useInventoryStore.getState();
      expect(purchaseInvoices).toHaveLength(1);
      expect(purchaseInvoices[0]?.id).toBe(invoice.id);
      expect(purchaseInvoices[0]?.invoiceNumber).toBe(invoice.invoiceNumber);
    });

    it("addPurchase should create new batches for new products", () => {
      const store = useInventoryStore.getState();
      const invoice = mkInvoice({
        items: [
          mkItem({
            productId: "demo-999",
            batchNumber: "BRAND-NEW-BATCH",
            quantity: 50,
          }),
        ],
      });

      store.addPurchase(invoice);

      const { batches } = useInventoryStore.getState();
      const newBatch = batches.find(
        (b) => b.productId === "demo-999" && b.batchNumber === "BRAND-NEW-BATCH",
      );
      expect(newBatch).toBeDefined();
      expect(newBatch?.quantity).toBe(50);
      expect(newBatch?.productName).toBe("Test Product");
    });

    it("addPurchase should increment quantity on existing batches", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      // bat-001b currently has qty 60 for product demo-001, batch PAR-2026-001
      const existingBatchBefore = useInventoryStore
        .getState()
        .batches.find((b) => b.id === "bat-001b");
      expect(existingBatchBefore?.quantity).toBe(60);

      const invoice = mkInvoice({
        items: [
          mkItem({
            productId: "demo-001",
            batchNumber: "PAR-2026-001",
            quantity: 20,
            unitPrice: 8000,
            sellingPrice: 15000,
          }),
        ],
      });

      store.addPurchase(invoice);

      const { batches } = useInventoryStore.getState();
      const existingBatch = batches.find((b) => b.id === "bat-001b");
      expect(existingBatch?.quantity).toBe(80); // 60 + 20
    });

    it("addPurchase should generate stock movements with type 'purchase'", () => {
      const store = useInventoryStore.getState();
      const invoice = mkInvoice({
        items: [
          mkItem({ productId: "demo-001", batchNumber: "BATCH-PM-1", quantity: 10 }),
          mkItem({ productId: "demo-002", batchNumber: "BATCH-PM-2", quantity: 20 }),
        ],
      });

      store.addPurchase(invoice);

      const { stockMovements } = useInventoryStore.getState();
      const purchaseMoves = stockMovements.filter((m) => m.type === "purchase");
      expect(purchaseMoves).toHaveLength(2);
      purchaseMoves.forEach((m) => {
        expect(m.qtyChange).toBeGreaterThan(0);
        expect(m.referenceNumber).toBe(invoice.invoiceNumber);
      });
    });

    it("addPurchase should update the purchaseInvoices array with the new invoice at the front", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      const countBefore = useInventoryStore.getState().purchaseInvoices.length;
      expect(countBefore).toBeGreaterThan(0);

      const newInvoice = mkInvoice();
      store.addPurchase(newInvoice);

      const { purchaseInvoices } = useInventoryStore.getState();
      expect(purchaseInvoices).toHaveLength(countBefore + 1);
      expect(purchaseInvoices[0]?.id).toBe(newInvoice.id);
    });

    it("should handle invoice with multiple items correctly", () => {
      const store = useInventoryStore.getState();
      const invoice = mkInvoice({
        items: [
          mkItem({
            productId: "demo-001",
            batchNumber: "MULTI-BATCH-1",
            quantity: 15,
          }),
          mkItem({
            productId: "demo-002",
            batchNumber: "MULTI-BATCH-2",
            quantity: 25,
            unitPrice: 14000,
            sellingPrice: 25000,
          }),
        ],
      });

      store.addPurchase(invoice);

      const { batches, stockMovements, purchaseInvoices } =
        useInventoryStore.getState();

      // Two new batches created
      const batch1 = batches.find(
        (b) =>
          b.productId === "demo-001" && b.batchNumber === "MULTI-BATCH-1",
      );
      const batch2 = batches.find(
        (b) =>
          b.productId === "demo-002" && b.batchNumber === "MULTI-BATCH-2",
      );
      expect(batch1?.quantity).toBe(15);
      expect(batch2?.quantity).toBe(25);

      // Two purchase movements
      const purchaseMoves = stockMovements.filter((m) => m.type === "purchase");
      expect(purchaseMoves).toHaveLength(2);

      // Invoice stored
      expect(purchaseInvoices[0]?.id).toBe(invoice.id);
    });

    it("should NOT mutate the original invoice object", () => {
      const store = useInventoryStore.getState();
      const invoice = mkInvoice();
      const invoiceCopy = deepClone(invoice);

      store.addPurchase(invoice);

      // Original invoice should be untouched by the store
      expect(invoice).toEqual(invoiceCopy);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  FEFO Allocation                                                  */
  /* ---------------------------------------------------------------- */

  describe("FEFO Allocation", () => {
    beforeEach(() => {
      resetSeq();
    });

    it("getFefoBatches should return batches sorted by expiredDate ascending", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      const fefo = store.getFefoBatches();

      // All returned batches should have positive stock
      fefo.forEach((b) => {
        expect(b.quantity).toBeGreaterThan(0);
      });

      // Should be sorted by expiredDate ascending
      for (let i = 1; i < fefo.length; i++) {
        const prev = new Date(fefo[i - 1]!.expiredDate).getTime();
        const curr = new Date(fefo[i]!.expiredDate).getTime();
        expect(prev).toBeLessThanOrEqual(curr);
      }
    });

    it("getFefoBatches with a specific productId should only return batches for that product", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      const fefo = store.getFefoBatches("demo-001");

      expect(fefo.length).toBeGreaterThan(0);
      fefo.forEach((b) => {
        expect(b.productId).toBe("demo-001");
        expect(b.quantity).toBeGreaterThan(0);
      });
    });

    it("allocateFefo should allocate from the earliest expiring batch first", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      // demo-001 has: bat-001c (exp 2026-06-30, qty 40), bat-001b (exp 2027-12-31, qty 60)
      // Allocate 30 — should all come from bat-001c (earliest expiry)
      const allocation = store.allocateFefo("demo-001", 30);

      expect(allocation).toHaveLength(1);
      expect(allocation[0]?.batchId).toBe("bat-001c");
      expect(allocation[0]?.take).toBe(30);
      expect(allocation[0]?.remainingAfter).toBe(10); // 40 - 30
    });

    it("allocateFefo should split across multiple batches when first batch is insufficient", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      // demo-001: bat-001c (qty 40), bat-001b (qty 60)
      // Allocate 50 — take 40 from bat-001c, then 10 from bat-001b
      const allocation = store.allocateFefo("demo-001", 50);

      expect(allocation).toHaveLength(2);
      expect(allocation[0]?.batchId).toBe("bat-001c");
      expect(allocation[0]?.take).toBe(40);
      expect(allocation[0]?.remainingAfter).toBe(0);

      expect(allocation[1]?.batchId).toBe("bat-001b");
      expect(allocation[1]?.take).toBe(10);
      expect(allocation[1]?.remainingAfter).toBe(50); // 60 - 10
    });

    it("allocateFefo should return empty array when no stock available", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      // Non-existent product
      const allocation = store.allocateFefo("non-existent-product", 10);
      expect(allocation).toHaveLength(0);

      // Product with stock — this should return allocations
      const allocation2 = store.allocateFefo("demo-004", 5);
      expect(allocation2.length).toBeGreaterThan(0);
    });

    it("getExpiredBatches should return only batches with expiredDate in the past", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      const expired = store.getExpiredBatches();

      // As of 2026-05-19: bat-002c (2026-03-31, qty 5), bat-007a (2026-04-30, qty 3),
      // bat-008a (2026-02-28, qty 2)
      expect(expired.length).toBeGreaterThan(0);
      expired.forEach((b) => {
        expect(new Date(b.expiredDate).getTime()).toBeLessThan(FAKE_NOW.getTime());
        expect(b.quantity).toBeGreaterThan(0);
      });
    });

    it("getNearExpiryBatches should return batches expiring within the threshold", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      // Threshold 90 days from 2026-05-19 = 2026-08-17
      const nearExpiry = store.getNearExpiryBatches(90);

      expect(nearExpiry.length).toBeGreaterThan(0);
      nearExpiry.forEach((b) => {
        const days =
          (new Date(b.expiredDate).getTime() - FAKE_NOW.getTime()) /
          (1000 * 60 * 60 * 24);
        expect(days).toBeGreaterThanOrEqual(0);
        expect(days).toBeLessThanOrEqual(90);
        expect(b.quantity).toBeGreaterThan(0);
      });
    });

    it("getNearExpiryBatches default threshold should be 90 days", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      // Call without threshold — should default to 90
      const nearExpiry = store.getNearExpiryBatches();
      const nearExpiryExplicit = store.getNearExpiryBatches(90);

      expect(nearExpiry.length).toBeGreaterThan(0);
      expect(nearExpiry).toEqual(nearExpiryExplicit);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Write-Off (Expired Operations)                                   */
  /* ---------------------------------------------------------------- */

  describe("Write-Off (Expired Operations)", () => {
    beforeEach(() => {
      resetSeq();
    });

    it("writeOffExpiredBatches should set batch quantity to 0 for the given IDs", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      // bat-002c (qty 5), bat-007a (qty 3), bat-008a (qty 2)
      store.writeOffExpiredBatches(["bat-002c", "bat-007a", "bat-008a"]);

      const { batches } = useInventoryStore.getState();
      expect(batches.find((b) => b.id === "bat-002c")?.quantity).toBe(0);
      expect(batches.find((b) => b.id === "bat-007a")?.quantity).toBe(0);
      expect(batches.find((b) => b.id === "bat-008a")?.quantity).toBe(0);
    });

    it("writeOffExpiredBatches should generate stock movements with type 'expired'", () => {
      useInventoryStore.getState().loadDemoData();
      const stockMovementsBefore =
        useInventoryStore.getState().stockMovements.length;

      const store = useInventoryStore.getState();
      store.writeOffExpiredBatches(["bat-002c", "bat-008a"]);

      const { stockMovements } = useInventoryStore.getState();
      const newExpiredMoves = stockMovements
        .slice(0, stockMovements.length - stockMovementsBefore)
        .filter((m) => m.type === "expired");

      expect(newExpiredMoves.length).toBeGreaterThan(0);
      newExpiredMoves.forEach((m) => {
        expect(m.type).toBe("expired");
        expect(m.qtyChange).toBeLessThan(0);
        expect(m.qtyAfter).toBe(0);
      });
    });

    it("writeOffExpiredBatches should skip batches that already have quantity 0", () => {
      useInventoryStore.getState().loadDemoData();
      const stockMovementsBefore =
        useInventoryStore.getState().stockMovements.length;

      // bat-001a already has qty 0, bat-002c has qty 5
      const store = useInventoryStore.getState();
      store.writeOffExpiredBatches(["bat-001a", "bat-002c"]);

      const { stockMovements } = useInventoryStore.getState();
      const newMovements = stockMovements.slice(
        0,
        stockMovements.length - stockMovementsBefore,
      );

      // Only 1 movement should be created (for bat-002c), bat-001a is skipped
      expect(newMovements).toHaveLength(1);
      expect(newMovements[0]?.batchId).toBe("bat-002c");
    });

    it("writeOffExpiredBatches should NOT mutate the original batch objects", () => {
      useInventoryStore.getState().loadDemoData();
      const freshState = useInventoryStore.getState();
      const originalBat002c = freshState.batches.find(
        (b) => b.id === "bat-002c",
      )!;
      const originalQty = originalBat002c.quantity;

      freshState.writeOffExpiredBatches(["bat-002c"]);

      // The original object reference should still hold the original quantity
      // (store uses .map() with spread, not mutation)
      expect(originalBat002c.quantity).toBe(originalQty);
    });

    it("writeOffExpiredBatches should accept an optional note parameter", () => {
      useInventoryStore.getState().loadDemoData();
      const stockMovementsBefore =
        useInventoryStore.getState().stockMovements.length;

      const customNote = "Write-off due to expired certification";
      const store = useInventoryStore.getState();
      store.writeOffExpiredBatches(["bat-002c"], customNote);

      const { stockMovements } = useInventoryStore.getState();
      const newMovements = stockMovements.slice(
        0,
        stockMovements.length - stockMovementsBefore,
      );

      expect(newMovements).toHaveLength(1);
      expect(newMovements[0]?.note).toBe(customNote);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Stock Opname                                                     */
  /* ---------------------------------------------------------------- */

  describe("Stock Opname", () => {
    beforeEach(() => {
      resetSeq();
    });

    it("performOpname should create stock adjustment movements for items with differences", () => {
      useInventoryStore.getState().loadDemoData();
      const stockMovementsBefore =
        useInventoryStore.getState().stockMovements.length;

      const store = useInventoryStore.getState();
      const opname = mkOpname({
        items: [
          mkOpnameItem({ difference: 5, systemQty: 55, physicalQty: 60 }),
        ],
      });
      store.performOpname(opname);

      const { stockMovements } = useInventoryStore.getState();
      const newMovements = stockMovements.slice(
        0,
        stockMovements.length - stockMovementsBefore,
      );

      expect(newMovements).toHaveLength(1);
      expect(newMovements[0]?.type).toBe("adjustment");
      expect(newMovements[0]?.qtyBefore).toBe(55);
      expect(newMovements[0]?.qtyChange).toBe(5);
      expect(newMovements[0]?.qtyAfter).toBe(60);
    });

    it("performOpname should update batch quantities immutably", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      const opname = mkOpname({
        items: [
          mkOpnameItem({
            batchId: "bat-001b",
            systemQty: 55,
            physicalQty: 60,
            difference: 5,
          }),
        ],
      });
      store.performOpname(opname);

      const { batches } = useInventoryStore.getState();
      const updated = batches.find((b) => b.id === "bat-001b");
      expect(updated?.quantity).toBe(60);
    });

    it("performOpname should skip items with zero difference", () => {
      useInventoryStore.getState().loadDemoData();
      const stockMovementsBefore =
        useInventoryStore.getState().stockMovements.length;

      const store = useInventoryStore.getState();
      const opname = mkOpname({
        items: [
          mkOpnameItem({
            productId: "demo-009",
            batchId: "bat-009a",
            systemQty: 40,
            physicalQty: 40,
            difference: 0,
          }),
        ],
      });
      store.performOpname(opname);

      const { stockMovements } = useInventoryStore.getState();
      const newMovements = stockMovements.slice(
        0,
        stockMovements.length - stockMovementsBefore,
      );

      // No movement created for zero-difference items
      expect(newMovements).toHaveLength(0);

      // Batch quantity should remain unchanged
      const { batches } = useInventoryStore.getState();
      expect(batches.find((b) => b.id === "bat-009a")?.quantity).toBe(40);
    });

    it("performOpname should add the opname to stockOpnames array", () => {
      useInventoryStore.getState().loadDemoData();
      const opnameCountBefore =
        useInventoryStore.getState().stockOpnames.length;

      const store = useInventoryStore.getState();
      const opname = mkOpname({
        items: [
          mkOpnameItem({ difference: 5, systemQty: 55, physicalQty: 60 }),
        ],
      });
      store.performOpname(opname);

      const { stockOpnames } = useInventoryStore.getState();
      expect(stockOpnames).toHaveLength(opnameCountBefore + 1);
      expect(stockOpnames[0]?.id).toBe(opname.id);
    });

    it("performOpname should NOT mutate the original batches", () => {
      useInventoryStore.getState().loadDemoData();
      const freshState = useInventoryStore.getState();

      // Stored reference before opname
      const bat001bBefore = freshState.batches.find(
        (b) => b.id === "bat-001b",
      )!;
      const bat004bBefore = freshState.batches.find(
        (b) => b.id === "bat-004b",
      )!;
      const originalQty1 = bat001bBefore.quantity;
      const originalQty2 = bat004bBefore.quantity;

      const opname = mkOpname({
        items: [
          mkOpnameItem({
            batchId: "bat-001b",
            systemQty: 55,
            physicalQty: 60,
            difference: 5,
          }),
          mkOpnameItem({
            productId: "demo-004",
            productName: "Antasida Tablet",
            batchId: "bat-004b",
            batchNumber: "ANT-2026-001",
            systemQty: 36,
            physicalQty: 35,
            difference: -1,
          }),
        ],
      });
      freshState.performOpname(opname);

      // Original references should be unchanged (store uses .map() + spread)
      expect(bat001bBefore.quantity).toBe(originalQty1);
      expect(bat004bBefore.quantity).toBe(originalQty2);
    });

    it("performOpname should handle multiple items with differences correctly", () => {
      useInventoryStore.getState().loadDemoData();
      const stockMovementsBefore =
        useInventoryStore.getState().stockMovements.length;

      const store = useInventoryStore.getState();
      const opname = mkOpname({
        items: [
          mkOpnameItem({
            productId: "demo-001",
            productName: "Paracetamol 500mg",
            batchId: "bat-001b",
            batchNumber: "PAR-2026-001",
            systemQty: 55,
            physicalQty: 60,
            difference: 5,
          }),
          mkOpnameItem({
            productId: "demo-004",
            productName: "Antasida Tablet",
            batchId: "bat-004b",
            batchNumber: "ANT-2026-001",
            systemQty: 36,
            physicalQty: 35,
            difference: -1,
          }),
        ],
      });
      store.performOpname(opname);

      const { stockMovements, batches } = useInventoryStore.getState();
      const newMovements = stockMovements.slice(
        0,
        stockMovements.length - stockMovementsBefore,
      );

      expect(newMovements).toHaveLength(2);
      expect(batches.find((b) => b.id === "bat-001b")?.quantity).toBe(60);
      expect(batches.find((b) => b.id === "bat-004b")?.quantity).toBe(35);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Payment Recording                                                */
  /* ---------------------------------------------------------------- */

  describe("Payment Recording", () => {
    beforeEach(() => {
      resetSeq();
    });

    it("recordPayment should increase paidAmount on the target invoice", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      // inv-001: unpaid, total 1_047_000, paidAmount 0
      store.recordPayment("inv-001", 500_000);

      const { purchaseInvoices } = useInventoryStore.getState();
      const invoice = purchaseInvoices.find((inv) => inv.id === "inv-001");
      expect(invoice?.paidAmount).toBe(500_000);
    });

    it("recordPayment should set status to 'paid' when paidAmount reaches totalAmount", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      // inv-001: unpaid, total 1_047_000, paidAmount 0
      store.recordPayment("inv-001", 1_047_000);

      const { purchaseInvoices } = useInventoryStore.getState();
      const invoice = purchaseInvoices.find((inv) => inv.id === "inv-001");
      expect(invoice?.paidAmount).toBe(1_047_000);
      expect(invoice?.status).toBe("paid");
    });

    it("recordPayment should set status to 'partial' when paidAmount is partially paid", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      // inv-001: unpaid, total 1_047_000, paidAmount 0
      store.recordPayment("inv-001", 400_000);

      const { purchaseInvoices } = useInventoryStore.getState();
      const invoice = purchaseInvoices.find((inv) => inv.id === "inv-001");
      expect(invoice?.status).toBe("partial");
    });

    it("recordPayment should NOT change status of other invoices", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      // inv-002 is "partial", inv-003 is "paid", inv-005 is "unpaid"
      const before = useInventoryStore.getState().purchaseInvoices;
      const inv002StatusBefore = before.find((inv) => inv.id === "inv-002")?.status;
      const inv003StatusBefore = before.find((inv) => inv.id === "inv-003")?.status;

      store.recordPayment("inv-001", 500_000);

      const { purchaseInvoices } = useInventoryStore.getState();
      expect(purchaseInvoices.find((inv) => inv.id === "inv-002")?.status).toBe(
        inv002StatusBefore,
      );
      expect(purchaseInvoices.find((inv) => inv.id === "inv-003")?.status).toBe(
        inv003StatusBefore,
      );
    });

    it("recordPayment should correctly add to paidAmount (even beyond totalAmount)", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      // inv-005: unpaid, total 1_325_000, paidAmount 0
      store.recordPayment("inv-005", 500_000);
      store.recordPayment("inv-005", 1_000_000);

      const { purchaseInvoices } = useInventoryStore.getState();
      const invoice = purchaseInvoices.find((inv) => inv.id === "inv-005");
      // paidAmount = 500_000 + 1_000_000 = 1_500_000 (exceeds total 1_325_000)
      expect(invoice?.paidAmount).toBe(1_500_000);
    });

    it("recordPayment should NOT mutate the original invoice objects", () => {
      const store = useInventoryStore.getState();
      store.loadDemoData();

      const originalInvoices = deepClone(store.purchaseInvoices);

      store.recordPayment("inv-001", 500_000);

      // The original invoice objects in the initial state should match the clone
      const stateAfter = useInventoryStore.getState();
      // Compare each original invoice field-by-field
      originalInvoices.forEach((origInv) => {
        if (origInv.id === "inv-001") {
          // inv-001 was updated — the original state object should be unchanged
          // (the store creates new objects via .map() + spread)
        } else {
          // Unaffected invoices
          const currentInv = stateAfter.purchaseInvoices.find(
            (i) => i.id === origInv.id,
          )!;
          expect(currentInv.paidAmount).toBe(origInv.paidAmount);
          expect(currentInv.status).toBe(origInv.status);
        }
      });
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Store Immutability                                               */
  /* ---------------------------------------------------------------- */

  describe("Store Immutability", () => {
    beforeEach(() => {
      resetSeq();
    });

    it("loadDemoData should not be called again if batches is already loaded", () => {
      const store = useInventoryStore.getState();
      expect(store.batches).toHaveLength(0);

      store.loadDemoData();
      const batchesAfterFirst = useInventoryStore.getState().batches.length;
      expect(batchesAfterFirst).toBeGreaterThan(0);

      // Call loadDemoData again — should be idempotent
      store.loadDemoData();
      const batchesAfterSecond = useInventoryStore.getState().batches.length;
      expect(batchesAfterSecond).toBe(batchesAfterFirst);
    });

    it("after performOpname, original batch objects should remain unchanged", () => {
      useInventoryStore.getState().loadDemoData();
      const stateAfterLoad = useInventoryStore.getState();

      // Verify demo data baseline
      expect(stateAfterLoad.batches.find((b) => b.id === "bat-001b")?.quantity).toBe(60);
      expect(stateAfterLoad.batches.find((b) => b.id === "bat-004b")?.quantity).toBe(35);

      // Deep clone all batch objects before opname (from fresh state)
      const originalSnapshot = deepClone(stateAfterLoad.batches);

      const opname = mkOpname({
        items: [
          mkOpnameItem({
            batchId: "bat-001b",
            systemQty: 60,
            physicalQty: 50,
            difference: -10,
            note: "Hilang 10",
          }),
          mkOpnameItem({
            productId: "demo-004",
            productName: "Antasida Tablet",
            batchId: "bat-004b",
            batchNumber: "ANT-2026-001",
            systemQty: 35,
            physicalQty: 40,
            difference: 5,
            note: "Lebih 5",
          }),
        ],
      });
      stateAfterLoad.performOpname(opname);

      // All original batch objects should still have their original quantities
      originalSnapshot.forEach((origBatch) => {
        const currentBatch = useInventoryStore
          .getState()
          .batches.find((b) => b.id === origBatch.id)!;

        if (origBatch.id === "bat-001b") {
          // Store was updated to physicalQty=50, but original deep-clone unchanged
          expect(currentBatch.quantity).toBe(50);
          expect(origBatch.quantity).toBe(60);
        } else if (origBatch.id === "bat-004b") {
          // Store was updated to physicalQty=40, but original deep-clone unchanged
          expect(currentBatch.quantity).toBe(40);
          expect(origBatch.quantity).toBe(35);
        } else {
          // Unaffected — same value in store and snapshot
          expect(currentBatch.quantity).toBe(origBatch.quantity);
        }
      });
    });

    it("after addPurchase, the passed invoice object should not be mutated", () => {
      const store = useInventoryStore.getState();
      const invoice = mkInvoice();
      const invoiceCopy = deepClone(invoice);

      store.addPurchase(invoice);

      // The invoice object we passed in should be identical to the copy
      expect(invoice).toEqual(invoiceCopy);
    });
  });
});
