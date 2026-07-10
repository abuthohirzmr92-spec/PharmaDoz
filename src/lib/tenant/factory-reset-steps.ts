// =================================================================
// MEDISYNC — Factory Reset Steps (Modular v3)
// 🔒 Architecture Constitution v1.0
//
// Each step calls its specific domain operation in FactoryResetService.
// No step calls the monolithic executeFactoryReset().
// =================================================================

import type { ResetStep, StepResult } from "./factory-reset.types";
import {
  deleteSales,
  deletePurchase,
  deleteInventory,
  deleteBatches,
  deleteFinance,
} from "./factory-reset.service";

type DomainOp = (tenantId: string) => Promise<{ success: boolean; totalRecords: number; error?: string }>;

function createStep(
  id: string, name: string, prio: number, desc: string, estimated: number,
  op: DomainOp,
  dependsOn?: string[],
): ResetStep {
  return {
    stepId: id,
    stepName: name,
    priority: prio,
    description: desc,
    estimatedRows: estimated,
    dependsOn: dependsOn ?? [],
    async execute(tenantId: string, _userId: string, dryRun: boolean): Promise<StepResult> {
      const startedAt = new Date().toISOString();
      if (dryRun) {
        return { stepId: id, stepName: name, success: true, rowsAffected: estimated, dryRun: true, startedAt, completedAt: new Date().toISOString(), durationMs: 0, warnings: [] };
      }
      try {
        const result = await op(tenantId);
        return {
          stepId: id, stepName: name,
          success: result.success, rowsAffected: result.totalRecords, dryRun: false,
          startedAt, completedAt: new Date().toISOString(),
          durationMs: Date.now() - new Date(startedAt).getTime(),
          warnings: [], error: result.error,
        };
      } catch (err) {
        return {
          stepId: id, stepName: name, success: false, rowsAffected: 0, dryRun: false,
          startedAt, completedAt: new Date().toISOString(),
          durationMs: Date.now() - new Date(startedAt).getTime(),
          warnings: [], error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
  };
}

export const ALL_RESET_STEPS: readonly ResetStep[] = [
  createStep("delete-sales",     "Delete Sales",        1, "Transactions, payments, batch allocations, returns",  500, deleteSales),
  createStep("delete-purchase",  "Delete Purchases",    2, "Purchase orders, items, payments",                     300, deletePurchase),
  createStep("delete-inventory", "Delete Inventory",    3, "Stock opname, movements, adjustments",                400, deleteInventory),
  createStep("delete-batches",   "Delete Batches",      4, "Product batches (FEFO data)",                         200, deleteBatches),
  createStep("delete-finance",   "Delete Finance",      5, "Wallet transactions, capital movements",             100, deleteFinance, ["delete-sales"]),
];
