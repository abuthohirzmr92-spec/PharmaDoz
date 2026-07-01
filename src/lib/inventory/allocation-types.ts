// =================================================================
// IAE Types — Inventory Allocation Engine
// EEOS Business Core — L1 Domain Engine
// All quantities are CANONICAL (base unit, from UUCE)
// =================================================================

import type { ProductBatch } from "@/types/inventory";

// ─── Allocation Strategy ───

export type AllocationStrategy =
  | "FEFO"
  | "FIFO"
  | "LIFO"
  | "MANUAL"
  | "RESERVED"
  | "CLINICAL"
  | "RECALL";

// ─── Allocation Constraint ───

export interface AllocationConstraint {
  batchId?: string;
  lotNumber?: string;
  manufacturer?: string;
  maxExpiryDate?: string;
  excludeBatchIds?: string[];
}

// ─── Allocation Context ───

export interface AllocationContext {
  userId?: string;
  transactionId?: string;
  prescriptionId?: string;
  reason?: string;
  overrideReason?: string;
}

// ─── Allocation Warning ───

export interface AllocationWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "critical";
  batchId?: string;
}

// ─── Batch Allocation ───

export interface BatchAllocation {
  batchId: string;
  quantity: number;
  costPrice: number;
  batchSnapshot: {
    batchNumber: string;
    expiredDate: string;
    receivedAt: string;
    manufacturer?: string;
    lotNumber?: string;
  };
}

// ─── Allocation Request ───

export interface AllocationRequest {
  productId: string;
  neededQty: number;
  strategy: AllocationStrategy;
  constraints?: AllocationConstraint[];
  context?: AllocationContext;
}

// ─── Allocation Result ───

export interface AllocationResult {
  allocationId: string;
  strategy: AllocationStrategy;
  allocations: BatchAllocation[];
  totalAllocated: number;
  remainingNeeded: number;
  isFullyAllocated: boolean;
  warnings: AllocationWarning[];
  metadata: {
    constraintsApplied: AllocationConstraint[];
    constraintResolution?: string;
    computationTimeMs: number;
    batchesConsidered: number;
    batchesAllocated: number;
  };
  correlationId: string;
  allocatedAt: string;
}

// ─── Validation ───

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// ─── Strategy Interface ───

export interface IAllocationStrategy {
  readonly name: AllocationStrategy;
  readonly requiresUserInput: boolean;

  prioritize(batches: ProductBatch[], context?: AllocationContext): ProductBatch[];
  validate(request: AllocationRequest): ValidationResult;
}

// ─── Strategy Registration ───

export type StrategyLifecycleStatus = "active" | "deprecated" | "experimental";

export interface StrategyRegistration {
  strategy: AllocationStrategy;
  implementation: IAllocationStrategy;
  registeredBy: string;
  registeredAt: string;
  status: StrategyLifecycleStatus;
  requiresApproval: boolean;
}

// ─── Allocation Estimate (dry-run) ───

export interface AllocationEstimate {
  canFulfill: boolean;
  totalAvailable: number;
  neededQty: number;
  shortfall: number;
  batchesRequired: number;
  estimatedCost: number;
}
