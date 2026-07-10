// =================================================================
// EEOS EDK — Engine Result Factory
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Creates standardized EngineResult following certified Output Contract.
// =================================================================

import type { EngineResult, EngineStatus, ExecutionContext } from "../runtime/types";

export function createResult(
  engineId: string,
  ctx: ExecutionContext,
  overrides: {
    status?: EngineStatus;
    summary?: string;
    evidence?: string[];
    decision?: "PROCEED" | "BLOCK" | "RETRY";
    confidence?: number;
    artifactsUsed?: string[];
    risks?: EngineResult["risks"];
    dependencies?: string[];
    nextAction?: string;
    blockingIssues?: string[];
  } = {},
): EngineResult {
  return {
    engine: engineId,
    executionId: ctx.executionId,
    status: overrides.status ?? "PASS",
    summary: overrides.summary ?? "Execution completed",
    evidence: overrides.evidence ?? [],
    decision: overrides.decision ?? "PROCEED",
    confidence: overrides.confidence ?? 1.0,
    artifactsUsed: overrides.artifactsUsed ?? [],
    risks: overrides.risks ?? [],
    dependencies: overrides.dependencies ?? [],
    nextAction: overrides.nextAction ?? "",
    blockingIssues: overrides.blockingIssues ?? [],
  };
}
