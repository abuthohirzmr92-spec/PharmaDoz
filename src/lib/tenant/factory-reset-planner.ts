// =================================================================
// MEDISYNC — Factory Reset Planner
// 🔒 Architecture Constitution v1.0
//
// Single source of truth for building FactoryResetPlan.
// Orchestrator delegates planning here — never builds plans inline.
// =================================================================

import type { FactoryResetPlan, ResetStep } from "./factory-reset.types";
import { ALL_RESET_STEPS } from "./factory-reset-steps";

export class ResetPlanner {
  constructor(private tenantId: string) {}

  build(): FactoryResetPlan {
    const steps = [...ALL_RESET_STEPS].sort((a, b) => a.priority - b.priority);
    const estimatedRows = steps.reduce((s, st) => s + st.estimatedRows, 0);

    return Object.freeze({
      planId: `reset-${this.tenantId}-${Date.now()}`,
      tenantId: this.tenantId,
      version: 2,
      steps,
      estimatedDurationMs: steps.length * 500,
      riskLevel: (estimatedRows > 10000) ? "HIGH" : (estimatedRows > 1000 ? "MEDIUM" : "LOW"),
      transactionMode: "per_step" as const,
      rollbackMode: "manual" as const,
      createdAt: new Date().toISOString(),
    });
  }
}
