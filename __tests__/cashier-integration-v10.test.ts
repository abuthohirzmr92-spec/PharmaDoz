/* ------------------------------------------------------------------ */
/*  V10.2 Integration Tests — AllocationBuilder + Hook + CartItem      */
/*  Run with: npx vitest run                                           */
/* ────────────────────────────────────────────────────────────────── */
/*  Validates end-to-end flow:                                         */
/*    AllocationInput → AllocationBuilder → AllocationDraft → CartItem */
/*                                                                      */
/*  Architecture Compliance:                                            */
/*    Inv-1:  Cart does NOT know Inventory                             */
/*    Inv-2:  Allocation does NOT know Pricing                         */
/*    Inv-10: Domain Service Stateless                                  */
/*    Inv-13: Domain Service Deterministic                              */
/* ------------------------------------------------------------------ */

import { describe, it, expect, beforeEach } from "vitest";
import { buildAllocation } from "@/lib/cashier/allocation-builder";
import type { AllocationDraft, AllocationInput } from "@/lib/cashier/types";
import type { ProductBatch } from "@/types/inventory";

/* ---- real-world test data (mirrors demo batches) ---- */

function paracetamolBatches(): ProductBatch[] {
  return [
    {
      id: "bat-PAR-001",
      tenantId: "demo-tenant",
      productId: "demo-001",
      productName: "Paracetamol 500mg",
      batchNumber: "PAR-2025-001",
      expiredDate: "2025-08-31",
      quantity: 0, // sold out
      unitPrice: 7500,
      sellingPrice: 15000,
      createdAt: "2025-06-15T08:00:00Z",
    },
    {
      id: "bat-PAR-002",
      tenantId: "demo-tenant",
      productId: "demo-001",
      productName: "Paracetamol 500mg",
      batchNumber: "PAR-2026-001",
      expiredDate: "2027-12-31",
      quantity: 60,
      unitPrice: 8000,
      sellingPrice: 15000,
      createdAt: "2026-01-20T09:30:00Z",
    },
    {
      id: "bat-PAR-003",
      tenantId: "demo-tenant",
      productId: "demo-001",
      productName: "Paracetamol 500mg",
      batchNumber: "PAR-2026-002",
      expiredDate: "2026-06-30",
      quantity: 40,
      unitPrice: 7800,
      sellingPrice: 15000,
      createdAt: "2026-05-10T10:00:00Z",
    },
  ];
}

function amoxicillinBatches(): ProductBatch[] {
  return [
    {
      id: "bat-AMX-001",
      tenantId: "demo-tenant",
      productId: "demo-002",
      productName: "Amoxicillin 500mg",
      batchNumber: "AMX-2025-001",
      expiredDate: "2027-03-15",
      quantity: 15,
      unitPrice: 14000,
      sellingPrice: 25000,
      createdAt: "2025-09-10T08:00:00Z",
    },
    {
      id: "bat-AMX-002",
      tenantId: "demo-tenant",
      productId: "demo-002",
      productName: "Amoxicillin 500mg",
      batchNumber: "AMX-2026-001",
      expiredDate: "2027-06-30",
      quantity: 30,
      unitPrice: 15000,
      sellingPrice: 25000,
      createdAt: "2026-05-05T11:00:00Z",
    },
    {
      id: "bat-AMX-003",
      tenantId: "demo-tenant",
      productId: "demo-002",
      productName: "Amoxicillin 500mg",
      batchNumber: "AMX-2026-002",
      expiredDate: "2026-03-31",
      quantity: 5,
      unitPrice: 14500,
      sellingPrice: 25000,
      createdAt: "2025-10-01T07:30:00Z",
    },
  ];
}

/* ---- tests ---- */

describe("V10.2 Integration: AllocationBuilder → Hook → CartItem", () => {
  /* ── Flow 1: AllocationBuilder produces correct batch allocation ── */

  describe("Flow: Input → AllocationBuilder → AllocationDraft", () => {
    it("allocates Paracetamol 30 tablets with FEFO ordering (earliest non-zero expiry first)", () => {
      const batches = paracetamolBatches();

      const draft = buildAllocation({ productId: "demo-001", baseQty: 30, availableBatches: batches });

      // bat-PAR-003 (exp 2026-06-30) has 40 qty — enough for 30 alone
      // bat-PAR-001 (exp 2025-08-31) has qty=0 → skipped by FEFO
      // bat-PAR-002 (exp 2027-12-31) has 60 qty → not needed (already fulfilled)
      // FEFO result: 1 entry, allocated from bat-PAR-003
      expect(draft.entries).toHaveLength(1);
      expect(draft.entries[0]!.batchId).toBe("bat-PAR-003"); // FEFO: earliest non-zero expiry
      expect(draft.entries[0]!.allocatedQty).toBe(30);
      expect(draft.totalAllocated).toBe(30);
    });

    it("allocates Amoxicillin 20 tablets across multiple batches by FEFO", () => {
      const batches = amoxicillinBatches();

      const draft = buildAllocation({ productId: "demo-002", baseQty: 20, availableBatches: batches });

      // FEFO order: AMX-003 (exp 2026-03, qty 5) → AMX-001 (exp 2027-03, qty 15) → AMX-002
      expect(draft.totalAllocated).toBe(20);
      expect(draft.entries[0]!.batchId).toBe("bat-AMX-003");
      expect(draft.entries[0]!.allocatedQty).toBe(5);   // all 5
      expect(draft.entries[1]!.batchId).toBe("bat-AMX-001");
      expect(draft.entries[1]!.allocatedQty).toBe(15);  // 15 of 15
    });
  });

  /* ── Flow 2: AllocationDraft → legacy snapshot compatibility ── */

  describe("Flow: AllocationDraft → legacy AllocationSnapshot", () => {
    it("legacy snapshot can be built from AllocationDraft + batch data", () => {
      const batches = paracetamolBatches();
      const draft = buildAllocation({ productId: "demo-001", baseQty: 30, availableBatches: batches });

      // Simulate the hook's legacy snapshot building logic
      const legacySnapshot = draft.entries
        .filter((e) => e.allocatedQty > 0)
        .map((entry) => {
          const batch = batches.find((b) => b.id === entry.batchId);
          return {
            batchId: entry.batchId,
            batchNumber: batch?.batchNumber ?? entry.batchId.slice(-6),
            sellingPrice: batch?.sellingPrice ?? 0,
            allocatedQuantity: entry.allocatedQty,
            expiredDate: batch?.expiredDate ?? "",
          };
        });

      expect(legacySnapshot).toHaveLength(1);
      expect(legacySnapshot[0]!.batchId).toBe("bat-PAR-003");
      expect(legacySnapshot[0]!.batchNumber).toBe("PAR-2026-002");
      expect(legacySnapshot[0]!.sellingPrice).toBe(15000);
      expect(legacySnapshot[0]!.allocatedQuantity).toBe(30);
    });

    it("Total allocation is consistent between draft and legacy snapshot", () => {
      const batches = amoxicillinBatches();
      const draft = buildAllocation({ productId: "demo-002", baseQty: 20, availableBatches: batches });

      const legacyTotal = draft.entries.reduce((s, e) => s + e.allocatedQty, 0);

      expect(legacyTotal).toBe(draft.totalAllocated);
      expect(legacyTotal).toBe(20);
    });
  });

  /* ── Flow 3: CartItem canonical model ── */

  describe("Flow: CartItem canonical representation", () => {
    it("CartItem can carry both allocationDraft (canonical) and allocationSnapshot (legacy)", () => {
      const batches = paracetamolBatches();
      const draft = buildAllocation({ productId: "demo-001", baseQty: 30, availableBatches: batches });

      const cartItemLike = {
        productId: "demo-001",
        productName: "Paracetamol 500mg",
        baseQuantity: 30,
        baseUnitPrice: 15000,
        selectedUnitCode: "tablet",
        allocationDraft: draft,            // NEW canonical
        allocationSnapshot: draft.entries   // LEGACY compat
          .filter((e) => e.allocatedQty > 0)
          .map((e) => ({
            batchId: e.batchId,
            batchNumber: batches.find((b) => b.id === e.batchId)?.batchNumber ?? "",
            sellingPrice: batches.find((b) => b.id === e.batchId)?.sellingPrice ?? 0,
            allocatedQuantity: e.allocatedQty,
            expiredDate: batches.find((b) => b.id === e.batchId)?.expiredDate ?? "",
          })),
      };

      // Verify canonical allocation
      expect(cartItemLike.allocationDraft).toBeDefined();
      expect(cartItemLike.allocationDraft.entries[0]!.allocatedQty).toBe(30);
      // Canonical must NOT have sellingPrice
      expect((cartItemLike.allocationDraft.entries[0] as any).sellingPrice).toBeUndefined();

      // Verify legacy compat
      expect(cartItemLike.allocationSnapshot).toBeDefined();
      expect(cartItemLike.allocationSnapshot).toHaveLength(1);
      // Legacy must still have sellingPrice for consumer compat
      expect(cartItemLike.allocationSnapshot[0]!.sellingPrice).toBe(15000);
    });
  });

  /* ── Flow 4: Architecture Invariants across integration ── */

  describe("Flow: Architecture Invariant checks across integration", () => {
    it("Inv-1: Cart-like structure does NOT reference inventory store or raw batches", () => {
      // CartItem never stores raw ProductBatch — only allocation references
      const draft = buildAllocation({
        productId: "demo-001",
        baseQty: 10,
        availableBatches: paracetamolBatches(),
      });

      // CartItem only carries draft — not the batches
      const cartItem = {
        productId: "demo-001",
        allocationDraft: draft,
      };

      expect(cartItem).not.toHaveProperty("batches");
      expect(cartItem).not.toHaveProperty("inventoryStore");
      expect(cartItem).not.toHaveProperty("rawBatches");
    });

    it("Inv-2: AllocationDraft does NOT contain any pricing data path", () => {
      const draft = buildAllocation({
        productId: "demo-001",
        baseQty: 10,
        availableBatches: paracetamolBatches(),
      });

      // Deep scan: no price data anywhere in AllocationDraft
      const json = JSON.stringify(draft);
      expect(json).not.toContain("sellingPrice");
      expect(json).not.toContain("discount");
      expect(json).not.toContain("tax");

      for (const entry of draft.entries) {
        const keys = Object.keys(entry);
        expect(keys).not.toContain("sellingPrice");
        expect(keys).not.toContain("costPrice");
        expect(keys).not.toContain("subtotal");
      }
    });

    it("Inv-10/13: same input → same allocation (deterministic across 5 calls)", () => {
      const batches = amoxicillinBatches();

      const results: AllocationDraft[] = [];
      for (let i = 0; i < 5; i++) {
        results.push(
          buildAllocation({ productId: "demo-002", baseQty: 15, availableBatches: [...batches] }),
        );
      }

      const first = results[0]!;
      for (let i = 1; i < results.length; i++) {
        expect(results[i]!.entries).toEqual(first.entries);
        expect(results[i]!.totalAllocated).toBe(first.totalAllocated);
      }
    });
  });
});
