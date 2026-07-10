// =================================================================
// EEOS Execution Engine — Context
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Immutable execution context. Shared across all engines in a session.
// =================================================================

import type { ExecutionContext, PipelinePhase } from "../runtime/types";

export function createExecutionContext(task: {
  request: string;
  taskClass?: ExecutionContext["taskClass"];
  product?: string;
  epic?: string;
}): ExecutionContext {
  const id = `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return Object.freeze({
    executionId: id,
    taskClass: task.taskClass ?? "FEATURE",
    product: task.product ?? "MEDISYNC",
    epic: task.epic ?? "UNKNOWN",
    sprint: "",
    story: null,
    branch: "",
    milestone: "",
    environment: "development",
    architecturePackage: "",
    adrsActive: [],
    featureScope: task.request,
    createdAt: new Date().toISOString(),
    frozen: true,
  });
}
