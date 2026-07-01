// =================================================================
// IAE — Inventory Allocation Engine
// EEOS Business Core — L1 Domain Engine
// =================================================================

import type { ProductBatch } from "@/types/inventory";
import type {
  AllocationRequest,
  AllocationResult,
  AllocationEstimate,
  AllocationConstraint,
  BatchAllocation,
  AllocationWarning,
} from "./allocation-types";
import { strategyRegistry } from "./strategy-registry";

// ─── Constraint Priority Order ───

const CONSTRAINT_PRIORITY: Array<keyof AllocationConstraint> = [
  "batchId",        // P0 — explicit user intent
  "excludeBatchIds", // P1 — safety exclusion
  "lotNumber",       // P2 — compliance match
  "manufacturer",    // P3 — clinical preference
  "maxExpiryDate",   // P4 — soft constraint
];

// ─── Core: Allocate ───

export function allocate(
  request: AllocationRequest,
  batches: ProductBatch[],
): AllocationResult {
  const startTime = performance.now();
  const allocationId = crypto.randomUUID();
  const warnings: AllocationWarning[] = [];

  // 1. Get strategy
  const strategy = strategyRegistry.get(request.strategy);
  if (!strategy) {
    return emptyResult(request, allocationId, [`Unknown strategy: ${request.strategy}`]);
  }

  // 2. Validate
  const validation = strategy.validate(request);
  if (!validation.valid) {
    return emptyResult(request, allocationId, [validation.reason ?? "Validation failed"]);
  }

  // 3. Apply constraint priority
  const constraints = request.constraints ?? [];
  let filteredBatches = [...batches];

  // Check for conflicting constraints
  if (hasConflict(constraints)) {
    return emptyResult(request, allocationId, [
      "Conflicting constraints: cannot include and exclude the same batch.",
    ]);
  }

  // Apply constraints in priority order
  const appliedConstraints: AllocationConstraint[] = [];
  for (const key of CONSTRAINT_PRIORITY) {
    const constraint = constraints.find((c) => c[key] !== undefined);
    if (!constraint) continue;
    appliedConstraints.push(constraint);

    switch (key) {
      case "batchId":
        filteredBatches = filteredBatches.filter((b) => b.id === constraint.batchId);
        break;
      case "excludeBatchIds":
        if (constraint.excludeBatchIds) {
          filteredBatches = filteredBatches.filter((b) => !constraint.excludeBatchIds!.includes(b.id));
        }
        break;
      case "lotNumber":
        filteredBatches = filteredBatches.filter(
          (b) => (b as any).lotNumber === constraint.lotNumber,
        );
        break;
      case "manufacturer":
        filteredBatches = filteredBatches.filter(
          (b) => (b as any).manufacturer === constraint.manufacturer,
        );
        break;
      case "maxExpiryDate":
        if (constraint.maxExpiryDate) {
          const maxDate = new Date(constraint.maxExpiryDate).getTime();
          filteredBatches = filteredBatches.filter(
            (b) => new Date(b.expiredDate).getTime() <= maxDate,
          );
        }
        break;
    }
  }

  const batchesConsidered = filteredBatches.length;

  // 4. Prioritize (sort per strategy)
  const sorted = strategy.prioritize(filteredBatches, request.context);

  // 5. Allocate greedily
  const allocations: BatchAllocation[] = [];
  let remaining = request.neededQty;

  for (const batch of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    allocations.push({
      batchId: batch.id,
      quantity: take,
      costPrice: batch.unitPrice,
      batchSnapshot: {
        batchNumber: batch.batchNumber,
        expiredDate: batch.expiredDate,
        receivedAt: batch.createdAt,
        manufacturer: (batch as any).manufacturer,
        lotNumber: (batch as any).lotNumber,
      },
    });
    remaining -= take;
  }

  // 6. Warnings
  if (remaining > 0) {
    warnings.push({
      code: "PARTIAL_ALLOCATION",
      message: `Stok tidak mencukupi. Dibutuhkan ${request.neededQty}, tersedia ${request.neededQty - remaining}.`,
      severity: "critical",
    });
  }

  const endTime = performance.now();

  return {
    allocationId,
    strategy: request.strategy,
    allocations,
    totalAllocated: request.neededQty - remaining,
    remainingNeeded: remaining,
    isFullyAllocated: remaining === 0,
    warnings,
    metadata: {
      constraintsApplied: appliedConstraints,
      constraintResolution: appliedConstraints.length > 1
        ? `Applied ${appliedConstraints.length} constraints in priority order: ${CONSTRAINT_PRIORITY.join(" > ")}`
        : undefined,
      computationTimeMs: Math.round((endTime - startTime) * 100) / 100,
      batchesConsidered,
      batchesAllocated: allocations.length,
    },
    correlationId: allocationId,
    allocatedAt: new Date().toISOString(),
  };
}

// ─── Dry-run: Estimate ───

export function estimateAllocation(
  request: AllocationRequest,
  batches: ProductBatch[],
): AllocationEstimate {
  const result = allocate(request, batches);
  const totalAvailable = batches
    .filter((b) => b.quantity > 0)
    .reduce((sum, b) => sum + b.quantity, 0);

  return {
    canFulfill: result.isFullyAllocated,
    totalAvailable,
    neededQty: request.neededQty,
    shortfall: result.remainingNeeded,
    batchesRequired: result.allocations.length,
    estimatedCost: result.allocations.reduce((sum, a) => sum + a.quantity * a.costPrice, 0),
  };
}

// ─── Helpers ───

function hasConflict(constraints: AllocationConstraint[]): boolean {
  const batchId = constraints.find((c) => c.batchId);
  const exclude = constraints.find((c) => c.excludeBatchIds);
  if (batchId && exclude?.excludeBatchIds?.includes(batchId.batchId!)) {
    return true;
  }
  return false;
}

function emptyResult(
  request: AllocationRequest,
  allocationId: string,
  errorMessages: string[],
): AllocationResult {
  return {
    allocationId,
    strategy: request.strategy,
    allocations: [],
    totalAllocated: 0,
    remainingNeeded: request.neededQty,
    isFullyAllocated: false,
    warnings: errorMessages.map((msg) => ({
      code: "ALLOCATION_FAILED",
      message: msg,
      severity: "critical",
    })),
    metadata: {
      constraintsApplied: [],
      computationTimeMs: 0,
      batchesConsidered: 0,
      batchesAllocated: 0,
    },
    correlationId: allocationId,
    allocatedAt: new Date().toISOString(),
  };
}
