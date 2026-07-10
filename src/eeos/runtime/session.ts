// =================================================================
// EEOS Runtime — Execution Session
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Immutable context, traceable execution, deterministic state machine.
// =================================================================

import type {
  ExecutionSession,
  ExecutionContext,
  TaskClass,
  EngineResult,
  TraceEntry,
  EngineStatus,
  PipelinePhase,
} from "./types";

let _seq = 0;

export function createSession(task: {
  request: string;
  taskClass?: TaskClass;
  product?: string;
  epic?: string;
}): ExecutionSession {
  _seq++;
  const executionId = `eeos-${Date.now()}-${String(_seq).padStart(4, "0")}`;
  const now = new Date().toISOString();

  const context: ExecutionContext = {
    executionId,
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
    createdAt: now,
    frozen: true,
  };

  return {
    executionId,
    context,
    currentPhase: "INTAKE",
    completedPhases: [],
    engineResults: new Map(),
    trace: [],
    status: "RUNNING",
    startedAt: now,
    completedAt: null,
  };
}

export function recordEngineResult(
  session: ExecutionSession,
  result: EngineResult,
): ExecutionSession {
  const entry: TraceEntry = {
    timestamp: new Date().toISOString(),
    phase: session.currentPhase,
    engine: result.engine,
    status: result.status,
    decision: result.decision,
    summary: result.summary,
  };

  const updatedResults = new Map(session.engineResults);
  updatedResults.set(result.engine, result);

  const updatedTrace = [...session.trace, entry];

  return {
    ...session,
    engineResults: updatedResults,
    trace: updatedTrace,
  };
}

export function advancePhase(
  session: ExecutionSession,
  nextPhase: PipelinePhase,
): ExecutionSession {
  return {
    ...session,
    currentPhase: nextPhase,
    completedPhases: [...session.completedPhases, session.currentPhase],
  };
}

export function blockSession(session: ExecutionSession, reason: string): ExecutionSession {
  return {
    ...session,
    status: "BLOCKED",
    completedAt: new Date().toISOString(),
    trace: [
      ...session.trace,
      {
        timestamp: new Date().toISOString(),
        phase: session.currentPhase,
        engine: "PipelineController",
        status: "FAIL",
        decision: "BLOCK",
        summary: reason,
      },
    ],
  };
}

export function completeSession(session: ExecutionSession): ExecutionSession {
  return {
    ...session,
    status: "COMPLETED",
    completedAt: new Date().toISOString(),
  };
}
