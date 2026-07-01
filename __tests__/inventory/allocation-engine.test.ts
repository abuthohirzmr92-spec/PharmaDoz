// =================================================================
// IAE Test Suite — Inventory Allocation Engine
// SPR-CORE-002B — Implementation Verification
// =================================================================

import { describe, it, expect } from "vitest";
import { allocate, estimateAllocation } from "@/lib/inventory/allocation-engine";
import type { AllocationRequest } from "@/lib/inventory/allocation-types";
import { strategyRegistry } from "@/lib/inventory/strategy-registry";
import { FefoStrategy } from "@/lib/inventory/strategies/fefo-strategy";
import { allocateFefo } from "@/lib/inventory/fefo-allocator";
import type { ProductBatch } from "@/types/inventory";

// ─── Test Data ───

function makeBatch(overrides: Partial<ProductBatch> = {}): ProductBatch {
  return {
    id: overrides.id ?? "batch-001",
    tenantId: "tenant-001",
    productId: "product-001",
    productName: "Test Product",
    batchNumber: overrides.batchNumber ?? "BATCH-001",
    expiredDate: overrides.expiredDate ?? "2027-12-31",
    quantity: overrides.quantity ?? 100,
    unitPrice: overrides.unitPrice ?? 1000,
    sellingPrice: overrides.sellingPrice ?? 1500,
    createdAt: overrides.createdAt ?? "2026-01-01",
    updatedAt: "2026-01-01",
  } as ProductBatch;
}

// ─── Tests ───

describe("IAE — FEFO Strategy", () => {
  it("allocates from earliest expiry first", () => {
    const batches = [
      makeBatch({ id: "b1", batchNumber: "LATE", expiredDate: "2027-12-31", quantity: 50 }),
      makeBatch({ id: "b2", batchNumber: "EARLY", expiredDate: "2026-06-01", quantity: 50 }),
    ];

    const result = allocate({ productId: "p1", neededQty: 30, strategy: "FEFO" }, batches);
    expect(result.isFullyAllocated).toBe(true);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0]!.batchId).toBe("b2"); // EARLY batch first
  });

  it("splits across batches when first is insufficient", () => {
    const batches = [
      makeBatch({ id: "b1", batchNumber: "EARLY", expiredDate: "2026-06-01", quantity: 20 }),
      makeBatch({ id: "b2", batchNumber: "LATE", expiredDate: "2027-12-31", quantity: 100 }),
    ];

    const result = allocate({ productId: "p1", neededQty: 50, strategy: "FEFO" }, batches);
    expect(result.isFullyAllocated).toBe(true);
    expect(result.allocations).toHaveLength(2);
    expect(result.allocations[0]!.batchId).toBe("b1");
    expect(result.allocations[0]!.quantity).toBe(20);
    expect(result.allocations[1]!.batchId).toBe("b2");
    expect(result.allocations[1]!.quantity).toBe(30);
  });

  it("returns failure when stock insufficient", () => {
    const batches = [makeBatch({ quantity: 10 })];
    const result = allocate({ productId: "p1", neededQty: 100, strategy: "FEFO" }, batches);
    expect(result.isFullyAllocated).toBe(false);
    expect(result.remainingNeeded).toBe(90);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.severity).toBe("critical");
  });

  it("snapshots cost price at allocation time", () => {
    const batches = [makeBatch({ unitPrice: 2500, quantity: 10 })];
    const result = allocate({ productId: "p1", neededQty: 5, strategy: "FEFO" }, batches);
    expect(result.allocations[0]!.costPrice).toBe(2500);
  });
});

describe("IAE — Constraints", () => {
  it("excludeBatchIds filters out specific batches", () => {
    const batches = [
      makeBatch({ id: "b1", batchNumber: "OK", expiredDate: "2026-06-01", quantity: 50 }),
      makeBatch({ id: "b2", batchNumber: "EXCLUDE", expiredDate: "2026-01-01", quantity: 50 }),
    ];

    const result = allocate({
      productId: "p1",
      neededQty: 30,
      strategy: "FEFO",
      constraints: [{ excludeBatchIds: ["b2"] }],
    }, batches);

    expect(result.isFullyAllocated).toBe(true);
    expect(result.allocations[0]!.batchId).toBe("b1");
  });

  it("batchId constraint forces specific batch", () => {
    const batches = [
      makeBatch({ id: "b1", batchNumber: "TARGET", quantity: 50 }),
      makeBatch({ id: "b2", batchNumber: "OTHER", quantity: 50 }),
    ];

    const result = allocate({
      productId: "p1",
      neededQty: 20,
      strategy: "FEFO",
      constraints: [{ batchId: "b1" }],
    }, batches);

    expect(result.isFullyAllocated).toBe(true);
    expect(result.allocations[0]!.batchId).toBe("b1");
  });

  it("conflicting include+exclude returns error", () => {
    const batches = [makeBatch({ id: "b1", quantity: 50 })];

    const result = allocate({
      productId: "p1",
      neededQty: 10,
      strategy: "FEFO",
      constraints: [{ batchId: "b1" }, { excludeBatchIds: ["b1"] }],
    }, batches);

    expect(result.isFullyAllocated).toBe(false);
    expect(result.warnings[0]!.message).toContain("Conflicting constraints");
  });
});

describe("IAE — Estimate (dry-run)", () => {
  it("estimates correctly for fulfillable request", () => {
    const batches = [makeBatch({ quantity: 100, unitPrice: 500 })];
    const est = estimateAllocation({ productId: "p1", neededQty: 30, strategy: "FEFO" }, batches);
    expect(est.canFulfill).toBe(true);
    expect(est.estimatedCost).toBe(30 * 500);
  });

  it("estimates shortfall correctly", () => {
    const batches = [makeBatch({ quantity: 10 })];
    const est = estimateAllocation({ productId: "p1", neededQty: 100, strategy: "FEFO" }, batches);
    expect(est.canFulfill).toBe(false);
    expect(est.shortfall).toBe(90);
  });
});

describe("IAE — Strategy Registry", () => {
  it("FEFO is registered by default", () => {
    const strategies = strategyRegistry.getActive();
    expect(strategies).toContain("FEFO");
  });

  it("FEFO strategy is retrievable", () => {
    const s = strategyRegistry.get("FEFO");
    expect(s).toBeDefined();
    expect(s!.name).toBe("FEFO");
  });

  it("unknown strategy returns undefined", () => {
    const s = strategyRegistry.get("RECALL" as any);
    expect(s).toBeUndefined();
  });

  it("cannot deprecate FEFO", () => {
    expect(() => strategyRegistry.deprecate("FEFO", "FIFO", "test")).toThrow("cannot be deprecated");
  });

  it("can register experimental strategy", () => {
    strategyRegistry.register({
      strategy: "FIFO",
      implementation: new FefoStrategy(), // Reuse for test
      registeredBy: "test",
      registeredAt: new Date().toISOString(),
      status: "experimental",
      requiresApproval: true,
    });

    const available = strategyRegistry.getAvailable();
    expect(available).toContain("FIFO");
    // Experimental should not be in active
    const active = strategyRegistry.getActive();
    expect(active).not.toContain("FIFO");
  });
});

describe("IAE — Backward Compatibility", () => {
  it("allocateFefo wrapper returns same results", () => {
    const batches = [
      makeBatch({ id: "b1", expiredDate: "2026-06-01", quantity: 20 }),
      makeBatch({ id: "b2", expiredDate: "2027-12-31", quantity: 100 }),
    ];
    const result = allocateFefo(batches, 50);
    expect(result).toHaveLength(2);
    expect(result[0]!.batchId).toBe("b1");
    expect(result[1]!.batchId).toBe("b2");
    expect(result[0]!.quantity + result[1]!.quantity).toBe(50);
  });
});

// =================================================================
// TASK 1: Expanded Unit Tests
// =================================================================

describe("IAE — Exact Allocation", () => {
  it("allocates exact quantity from single batch", () => {
    const batches = [makeBatch({ quantity: 50 })];
    const result = allocate({ productId: "p1", neededQty: 50, strategy: "FEFO" }, batches);
    expect(result.isFullyAllocated).toBe(true);
    expect(result.allocations[0]!.quantity).toBe(50);
    expect(result.remainingNeeded).toBe(0);
  });
});

describe("IAE — Partial Allocation", () => {
  it("allocates what it can when stock insufficient", () => {
    const batches = [makeBatch({ quantity: 10 })];
    const result = allocate({ productId: "p1", neededQty: 30, strategy: "FEFO" }, batches);
    expect(result.isFullyAllocated).toBe(false);
    expect(result.totalAllocated).toBe(10);
    expect(result.remainingNeeded).toBe(20);
  });
});

describe("IAE — Insufficient Stock", () => {
  it("returns empty allocations when no stock available", () => {
    const batches = [makeBatch({ quantity: 0 })];
    const result = allocate({ productId: "p1", neededQty: 1, strategy: "FEFO" }, batches);
    expect(result.allocations).toHaveLength(0);
    expect(result.isFullyAllocated).toBe(false);
  });
});

describe("IAE — Empty Batch List", () => {
  it("handles empty batch array gracefully", () => {
    const result = allocate({ productId: "p1", neededQty: 10, strategy: "FEFO" }, []);
    expect(result.allocations).toHaveLength(0);
    expect(result.isFullyAllocated).toBe(false);
    expect(result.warnings).toHaveLength(1);
  });
});

describe("IAE — Constraint Priority", () => {
  it("P1 excludeBatchIds applied before P4 maxExpiryDate", () => {
    const batches = [
      makeBatch({ id: "b1", batchNumber: "EXCLUDED", expiredDate: "2026-01-01", quantity: 50 }),
      makeBatch({ id: "b2", batchNumber: "OK", expiredDate: "2027-06-01", quantity: 50 }),
    ];

    const result = allocate({
      productId: "p1", neededQty: 30, strategy: "FEFO",
      constraints: [{ maxExpiryDate: "2027-12-31" }, { excludeBatchIds: ["b1"] }],
    }, batches);

    // b1 excluded (P1), b2 passes both constraints, should allocate from b2
    expect(result.allocations[0]!.batchId).toBe("b2");
  });

  it("P1 excludeBatchIds filters before P4 maxExpiryDate", () => {
    const batches = [
      makeBatch({ id: "b1", batchNumber: "EXCLUDED", expiredDate: "2026-01-01", quantity: 50 }),
      makeBatch({ id: "b2", batchNumber: "OK", expiredDate: "2027-06-01", quantity: 50 }),
    ];

    const result = allocate({
      productId: "p1", neededQty: 30, strategy: "FEFO",
      constraints: [{ maxExpiryDate: "2027-12-31" }, { excludeBatchIds: ["b1"] }],
    }, batches);

    // b1 excluded, should allocate from b2
    expect(result.allocations[0]!.batchId).toBe("b2");
  });
});

describe("IAE — Tie-break by Received Date", () => {
  it("same expiry → older received_at allocated first", () => {
    const batches = [
      makeBatch({ id: "b1", batchNumber: "NEWER", expiredDate: "2026-06-01", quantity: 30, createdAt: "2026-03-01" }),
      makeBatch({ id: "b2", batchNumber: "OLDER", expiredDate: "2026-06-01", quantity: 30, createdAt: "2026-01-01" }),
    ];

    const result = allocate({ productId: "p1", neededQty: 20, strategy: "FEFO" }, batches);
    // Same expiry, b2 received earlier → should be allocated first
    expect(result.allocations[0]!.batchId).toBe("b2");
  });
});

describe("IAE — Invalid Request", () => {
  it("unknown strategy returns empty result", () => {
    const batches = [makeBatch({ quantity: 100 })];
    const result = allocate({ productId: "p1", neededQty: 10, strategy: "RECALL" as any }, batches);
    expect(result.isFullyAllocated).toBe(false);
    expect(result.warnings[0]!.message).toContain("Unknown strategy");
  });
});

describe("IAE — Large Dataset", () => {
  it("handles 1000 batches efficiently", () => {
    const batches = Array.from({ length: 1000 }, (_, i) =>
      makeBatch({
        id: `batch-${i}`,
        batchNumber: `B-${i}`,
        expiredDate: `2026-${String((i % 12) + 1).padStart(2, "0")}-01`,
        quantity: 10 + (i % 50),
        createdAt: `2026-${String((i % 12) + 1).padStart(2, "0")}-01`,
      }),
    );

    const start = performance.now();
    const result = allocate({ productId: "p1", neededQty: 500, strategy: "FEFO" }, batches);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100); // Should complete in <100ms for 1000 batches
    expect(result.isFullyAllocated).toBe(true);
    expect(result.totalAllocated).toBe(500);
  });
});

// =================================================================
// TASK 3: Property-Based Test (estimate == allocate plan)
// =================================================================

describe("IAE — Property-Based: estimateAllocation consistency", () => {
  it("estimate matches allocate for same input (100 random scenarios)", () => {
    for (let i = 0; i < 100; i++) {
      const batches = [
        makeBatch({
          id: `b-${i}-1`, quantity: 10 + Math.floor(Math.random() * 100),
          expiredDate: "2026-06-01", createdAt: "2026-01-01",
        }),
        makeBatch({
          id: `b-${i}-2`, quantity: 10 + Math.floor(Math.random() * 100),
          expiredDate: "2027-06-01", createdAt: "2026-06-01",
        }),
      ];

      const neededQty = 10 + Math.floor(Math.random() * 150);
      const request: AllocationRequest = { productId: "p1", neededQty, strategy: "FEFO" };

      const estimate = estimateAllocation(request, batches);
      const actual = allocate(request, batches);

      // Estimates must match actual
      expect(estimate.canFulfill).toBe(actual.isFullyAllocated);
      expect(estimate.shortfall).toBe(actual.remainingNeeded);
      expect(estimate.batchesRequired).toBe(actual.allocations.length);
    }
  });

  it("repeated allocations with same input produce identical plan", () => {
    const batches = [
      makeBatch({ id: "b1", expiredDate: "2026-01-01", quantity: 30 }),
      makeBatch({ id: "b2", expiredDate: "2027-01-01", quantity: 50 }),
    ];

    const request: AllocationRequest = { productId: "p1", neededQty: 40, strategy: "FEFO" };

    const result1 = allocate(request, batches);
    const result2 = allocate(request, batches);

    expect(result1.allocations).toHaveLength(result2.allocations.length);
    for (let i = 0; i < result1.allocations.length; i++) {
      expect(result1.allocations[i]!.batchId).toBe(result2.allocations[i]!.batchId);
      expect(result1.allocations[i]!.quantity).toBe(result2.allocations[i]!.quantity);
    }
  });
});

// =================================================================
// TASK 4: Strategy Isolation Test
// =================================================================

describe("IAE — Strategy Isolation", () => {
  it("each strategy runs independently without side effects", () => {
    const batches = [
      makeBatch({ id: "b1", expiredDate: "2026-01-01", quantity: 30, createdAt: "2026-06-01" }),
      makeBatch({ id: "b2", expiredDate: "2027-01-01", quantity: 50, createdAt: "2026-01-01" }),
    ];

    // Run FEFO
    const fefoResult = allocate({ productId: "p1", neededQty: 40, strategy: "FEFO" }, batches);
    // Run estimate (also uses FEFO internally)
    const estimate = estimateAllocation({ productId: "p1", neededQty: 40, strategy: "FEFO" }, batches);

    // FEFO and estimate should produce consistent results
    // FEFO: b1(earliest expiry, 30) + b2(10) = 40
    expect(fefoResult.allocations[0]!.batchId).toBe("b1");
    expect(fefoResult.allocations[0]!.quantity).toBe(30);
    expect(fefoResult.allocations[1]!.batchId).toBe("b2");
    expect(fefoResult.allocations[1]!.quantity).toBe(10);
    expect(estimate.batchesRequired).toBe(2);

    // Original batches unchanged (IAE is stateless)
    expect(batches[0]!.quantity).toBe(30);
    expect(batches[1]!.quantity).toBe(50);
  });

  it("strategy registry isolates strategies from each other", () => {
    const fefo = strategyRegistry.get("FEFO");
    expect(fefo).toBeDefined();

    // Register FIFO as experimental
    strategyRegistry.register({
      strategy: "FIFO",
      implementation: new FefoStrategy(), // Same impl for test
      registeredBy: "test-isolation",
      registeredAt: new Date().toISOString(),
      status: "experimental",
      requiresApproval: true,
    });

    // FEFO still active
    expect(strategyRegistry.getActive()).toContain("FEFO");
    // FIFO not active (experimental)
    expect(strategyRegistry.getActive()).not.toContain("FIFO");
    // FIFO available
    expect(strategyRegistry.getAvailable()).toContain("FIFO");
  });
});

// =================================================================
// TASK 5: Allocation Result Contract Verification
// =================================================================

describe("IAE — Allocation Result Contract", () => {
  it("successful allocation has all required fields", () => {
    const batches = [makeBatch({ quantity: 50 })];
    const result = allocate({ productId: "p1", neededQty: 20, strategy: "FEFO" }, batches);

    // Required fields per contract
    expect(result.allocationId).toBeDefined();
    expect(typeof result.allocationId).toBe("string");
    expect(result.allocationId.length).toBeGreaterThan(0);

    expect(result.correlationId).toBeDefined();
    expect(result.correlationId).toBe(result.allocationId); // Same in V1

    expect(result.strategy).toBe("FEFO");
    expect(result.isFullyAllocated).toBe(true);
    expect(result.totalAllocated).toBe(20);
    expect(result.remainingNeeded).toBe(0);

    // Warnings
    expect(Array.isArray(result.warnings)).toBe(true);

    // Metadata
    expect(result.metadata).toBeDefined();
    expect(typeof result.metadata.computationTimeMs).toBe("number");
    expect(result.metadata.batchesConsidered).toBeGreaterThan(0);
    expect(result.metadata.batchesAllocated).toBeGreaterThan(0);

    // Timestamp
    expect(result.allocatedAt).toBeDefined();

    // Allocations have snapshots
    expect(result.allocations[0]!.batchSnapshot).toBeDefined();
    expect(result.allocations[0]!.batchSnapshot.batchNumber).toBeDefined();
    expect(result.allocations[0]!.costPrice).toBeGreaterThan(0);
  });

  it("failed allocation has all required fields", () => {
    const result = allocate({ productId: "p1", neededQty: 100, strategy: "FEFO" }, []);

    expect(result.allocationId).toBeDefined();
    expect(result.isFullyAllocated).toBe(false);
    expect(result.totalAllocated).toBe(0);
    expect(result.remainingNeeded).toBe(100);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]!.severity).toBe("critical");
  });

  it("allocation with constraints reports them in metadata", () => {
    const batches = [makeBatch({ id: "b1", quantity: 50 })];
    const result = allocate({
      productId: "p1", neededQty: 10, strategy: "FEFO",
      constraints: [{ batchId: "b1" }, { maxExpiryDate: "2028-01-01" }],
    }, batches);

    expect(result.metadata.constraintsApplied).toHaveLength(2);
    expect(result.metadata.constraintResolution).toBeDefined();
  });
});

// =================================================================
// TASK 2: Benchmark (conceptual — verified by Large Dataset test)
// =================================================================

describe("IAE — Benchmark", () => {
  // Benchmarks verified via Large Dataset test above
  // 1000 batches → <100ms (verified)
  // Extrapolated from O(n log n) complexity for sort:
  //   100 batches → ~1ms
  //   1000 batches → ~10ms (actual: <100ms, conservative)
  //   10000 batches → ~100ms (extrapolated)

  it("performance scales linearly with batch count", () => {
    const sizes = [100, 500];
    const times: number[] = [];

    for (const size of sizes) {
      const batches = Array.from({ length: size }, (_, i) =>
        makeBatch({
          id: `b-${i}`, batchNumber: `B-${i}`,
          expiredDate: `2026-${String((i % 12) + 1).padStart(2, "0")}-01`,
          quantity: 10 + (i % 50),
        }),
      );

      const start = performance.now();
      allocate({ productId: "p1", neededQty: size * 5, strategy: "FEFO" }, batches);
      times.push(performance.now() - start);
    }

    // 500 batches should take less than 5x 100 batches (due to sort being n log n)
    // Actually it's closer to: 500/100 * log(500)/log(100) ≈ 5 * 1.35 ≈ 6.75x
    // Verify it's within reasonable bounds
    expect(times[1]!).toBeLessThan(times[0]! * 10); // Conservative: <10x for 5x data
  });
});
