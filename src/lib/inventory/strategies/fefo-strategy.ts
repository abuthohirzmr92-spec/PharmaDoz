// =================================================================
// FEFO Strategy — First Expired First Out
// IAE Strategy Implementation
// =================================================================

import type { ProductBatch } from "@/types/inventory";
import type {
  IAllocationStrategy,
  AllocationStrategy,
  AllocationRequest,
  AllocationContext,
  ValidationResult,
} from "../allocation-types";

export class FefoStrategy implements IAllocationStrategy {
  readonly name: AllocationStrategy = "FEFO";
  readonly requiresUserInput = false;

  prioritize(batches: ProductBatch[], _context?: AllocationContext): ProductBatch[] {
    return [...batches]
      .filter((b) => b.quantity > 0)
      .sort((a, b) => {
        const expA = new Date(a.expiredDate).getTime();
        const expB = new Date(b.expiredDate).getTime();
        if (expA !== expB) return expA - expB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }

  validate(_request: AllocationRequest): ValidationResult {
    return { valid: true };
  }
}
