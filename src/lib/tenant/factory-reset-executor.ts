// =================================================================
// MEDISYNC — Factory Reset Executor
// 🔒 Architecture Constitution v1.0
//
// Executes FactoryResetPlan. Makes NO decisions.
// Delegates to FactoryResetService (execution engine).
// =================================================================

import type { FactoryResetPlan, ResetTableSummary } from "./factory-reset.types";
import { executeFactoryReset } from "./factory-reset.service";

export class ResetExecutor {
  private summaries: ResetTableSummary[] = [];
  private totalDeleted = 0;

  async execute(plan: FactoryResetPlan, performedBy: string) {
    // Executor delegates entirely to the execution engine
    const result = await executeFactoryReset(plan.tenantId, performedBy);

    if (!result.success) {
      throw new Error(result.error ?? "Factory reset execution failed");
    }

    this.summaries = result.summaries.map((s) => ({
      table: s.table,
      count: s.count,
    }));
    this.totalDeleted = result.totalRecords;

    return {
      summaries: this.summaries,
      totalDeleted: this.totalDeleted,
    };
  }
}
