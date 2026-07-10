// =================================================================
// EEOS Execution Engine — Controller
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Orchestrates execution of EEOS engines. Loads from registry,
// runs each engine in phase order, collects results, handles blocking.
// =================================================================

import type {
  ExecutionContext,
  ExecutionResult,
  TraceEntry,
} from "../runtime/types";
import { getPhaseOrder, getEngineByPhase } from "../runtime/engine-registry";
import { resolveEngine } from "../edk/engine-registry";
import { appendHistory } from "./execution-history";
import {
  EngineNotFoundError,
  ExecutionBlockedError,
} from "./execution-errors";

function trace(
  engine: string,
  phase: string,
  status: TraceEntry["status"],
  decision: TraceEntry["decision"],
  summary: string,
): TraceEntry {
  return {
    timestamp: new Date().toISOString(),
    phase: phase as TraceEntry["phase"],
    engine,
    status,
    decision,
    summary,
  };
}

export async function executePipeline(
  ctx: ExecutionContext,
  phases?: string[],
): Promise<ExecutionResult> {
  const traceLog: TraceEntry[] = [];
  const phaseList = (phases ?? getPhaseOrder()) as string[];
  let blocked = false;
  let blockReason = "";

  traceLog.push(trace("ExecutionController", "INTAKE", "PASS", "PROCEED", `Pipeline started: ${ctx.executionId}`));

  for (const phase of phaseList) {
    if (blocked) break;

    const engineContract = getEngineByPhase(phase as any);
    if (!engineContract) continue; // No engine for this phase — skip

    const registered = resolveEngine(engineContract.name);
    if (!registered) {
      if (engineContract.mandatory) {
        traceLog.push(trace(engineContract.name, phase, "FAIL", "BLOCK",
          `Mandatory engine ${engineContract.name} not implemented`));
        blocked = true;
        blockReason = `Engine ${engineContract.name} not found`;
      }
      continue;
    }

    try {
      const result = await registered.execute(ctx);
      appendHistory({
        executionId: ctx.executionId,
        engineId: engineContract.name,
        status: "COMPLETED",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        result,
      });

      traceLog.push(trace(engineContract.name, phase, result.status, result.decision, result.summary));

      if (result.decision === "BLOCK") {
        blocked = true;
        blockReason = result.summary;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      traceLog.push(trace(engineContract.name, phase, "FAIL", "BLOCK", error.message));

      if (engineContract.blocking) {
        blocked = true;
        blockReason = error.message;
      }
    }
  }

  traceLog.push(trace("ExecutionController", "RELEASE",
    blocked ? "FAIL" : "PASS",
    blocked ? "BLOCK" : "PROCEED",
    blocked ? `Pipeline blocked: ${blockReason}` : "Pipeline completed"));

  return {
    executionId: ctx.executionId,
    status: blocked ? "BLOCKED" : "COMPLETED",
    trace: traceLog,
    finalRecommendation: blocked ? blockReason : "Execution complete",
    confidence: blocked ? 0 : 1.0,
    startedAt: ctx.createdAt,
    completedAt: new Date().toISOString(),
  };
}
