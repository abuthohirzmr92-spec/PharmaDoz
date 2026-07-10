// =================================================================
// EEOS Runtime — Pipeline Controller
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Orchestrates engine execution in certified phase order.
// Deterministic. Traceable. Framework-independent.
// =================================================================

import type {
  ExecutionSession,
  ExecutionResult,
  EngineResult,
} from "./types";
import {
  createSession,
  recordEngineResult,
  advancePhase,
  blockSession,
  completeSession,
} from "./session";
import {
  getAllEngines,
  getPhaseOrder,
} from "./engine-registry";

// ─── Controller ───

export interface PipelineOptions {
  /** Halt on first blocking failure (default: true) */
  haltOnBlockingFailure?: boolean;
  /** Skip non-mandatory engines (for lightweight runs) */
  skipNonMandatory?: boolean;
}

export function createPipeline(task: {
  request: string;
  taskClass?: Parameters<typeof createSession>[0]["taskClass"];
  product?: string;
  epic?: string;
}, _options?: PipelineOptions): ExecutionSession {
  return createSession(task);
}

export function executePhase(
  session: ExecutionSession,
  engineName: string,
  result: EngineResult,
): ExecutionSession {
  if (session.status !== "RUNNING") return session;

  const updated = recordEngineResult(session, result);

  // Blocking failure?
  if (result.decision === "BLOCK") {
    return blockSession(updated, `Engine ${engineName} blocked: ${result.summary}`);
  }

  // Advance to next phase
  const phases = getPhaseOrder();
  const currentIdx = phases.indexOf(updated.currentPhase);
  const nextPhase = phases[currentIdx + 1];

  if (nextPhase) {
    return advancePhase(updated, nextPhase);
  }

  return completeSession(updated);
}

export function finalize(session: ExecutionSession): ExecutionResult {
  // Composite confidence: average of all engine confidence scores
  const results = [...session.engineResults.values()];
  const avgConfidence = results.length > 0
    ? results.reduce((s, r) => s + r.confidence, 0) / results.length
    : 0;

  return {
    executionId: session.executionId,
    status: session.status === "RUNNING" ? "COMPLETED" : session.status,
    trace: session.trace,
    finalRecommendation: session.status === "BLOCKED"
      ? `Blocked at ${session.currentPhase}`
      : "Execution complete",
    confidence: Math.round(avgConfidence * 100) / 100,
    startedAt: session.startedAt,
    completedAt: session.completedAt ?? new Date().toISOString(),
  };
}

export function getPhaseSummary(session: ExecutionSession): string {
  const phases = getPhaseOrder();
  const total = phases.length;
  const completed = session.completedPhases.length;

  return `Phase ${completed + 1}/${total}: ${session.currentPhase} — ${session.status}`;
}

export function getEngineSummary(session: ExecutionSession): {
  total: number;
  passed: number;
  warnings: number;
  failed: number;
} {
  const results = [...session.engineResults.values()];
  return {
    total: results.length,
    passed: results.filter((r) => r.status === "PASS").length,
    warnings: results.filter((r) => r.status === "WARNING").length,
    failed: results.filter((r) => r.status === "FAIL").length,
  };
}
