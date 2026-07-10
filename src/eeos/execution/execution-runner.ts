// =================================================================
// EEOS Execution Engine — Runner
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Runs ONE engine. Returns EngineResult. Handles lifecycle transitions.
// =================================================================

import type { ExecutionContext, EngineResult } from "../runtime/types";
import { createInstance } from "./engine-instance";
import { recordTrace } from "./execution-trace";
import type { TraceEntry } from "./execution-trace";

export interface RunnerResult {
  result: EngineResult | null;
  trace: TraceEntry[];
  error: Error | null;
}

export async function runEngine(
  engineId: string,
  ctx: ExecutionContext,
  execute: (ctx: ExecutionContext) => Promise<EngineResult>,
): Promise<RunnerResult> {
  let trace: TraceEntry[] = [];
  const { instance, handle } = createInstance(engineId);

  trace = recordTrace(trace, {
    engine: engineId,
    phase: "EXECUTION",
    event: "EngineLoaded",
    severity: "INFO",
    message: `Engine ${engineId} loaded`,
  });

  try {
    handle.initialize();

    trace = recordTrace(trace, {
      engine: engineId,
      phase: "EXECUTION",
      event: "EngineStarted",
      severity: "INFO",
      message: `Engine ${engineId} started`,
    });

    handle.markExecuting();
    const result = await execute(ctx);
    handle.markCompleted();

    trace = recordTrace(trace, {
      engine: engineId,
      phase: "EXECUTION",
      event: "EngineCompleted",
      severity: "INFO",
      message: `Engine ${engineId} completed: ${result.summary}`,
    });

    return { result, trace, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    handle.markFailed(error);

    trace = recordTrace(trace, {
      engine: engineId,
      phase: "EXECUTION",
      event: "EngineFailed",
      severity: "ERROR",
      message: `Engine ${engineId} failed: ${error.message}`,
    });

    return { result: null, trace, error };
  }
}
