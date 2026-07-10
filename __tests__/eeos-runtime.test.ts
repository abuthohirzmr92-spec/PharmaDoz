import { describe, it, expect } from "vitest";
import {
  createSession,
  recordEngineResult,
  advancePhase,
  blockSession,
  completeSession,
} from "@/eeos/runtime/session";
import {
  createPipeline,
  executePhase,
  finalize,
  getPhaseSummary,
  getEngineSummary,
} from "@/eeos/runtime/pipeline";
import {
  getEngine,
  getEngineByPhase,
  getAllEngines,
  getPhaseOrder,
} from "@/eeos/runtime/engine-registry";
import type { EngineResult } from "@/eeos/runtime/types";

function makeResult(overrides: Partial<EngineResult> = {}): EngineResult {
  return {
    engine: "SelfValidation",
    executionId: "eeos-test",
    status: "PASS",
    summary: "All checks passed",
    evidence: ["Engine Registry verified"],
    decision: "PROCEED",
    confidence: 1.0,
    artifactsUsed: [],
    risks: [],
    dependencies: [],
    nextAction: "Proceed to Classification",
    blockingIssues: [],
    ...overrides,
  };
}

describe("EEOS Runtime — Engine Registry", () => {
  it("registers 15 certified engines", () => {
    expect(getAllEngines()).toHaveLength(15);
  });

  it("finds engine by name", () => {
    const engine = getEngine("SelfValidation");
    expect(engine).toBeDefined();
    expect(engine!.blocking).toBe(true);
  });

  it("finds engine by phase", () => {
    const engine = getEngineByPhase("INTAKE");
    expect(engine).toBeDefined();
    expect(engine!.name).toBe("SelfValidation");
  });

  it("returns undefined for unknown engine", () => {
    expect(getEngine("NonExistent")).toBeUndefined();
  });

  it("has 16 phases in order", () => {
    expect(getPhaseOrder()).toHaveLength(16);
    expect(getPhaseOrder()[0]).toBe("INTAKE");
    expect(getPhaseOrder()[15]).toBe("RELEASE");
  });

  it("has exactly 5 blocking engines", () => {
    const blocking = getAllEngines().filter((e) => e.blocking);
    expect(blocking).toHaveLength(5);
    expect(blocking.map((e) => e.name).sort()).toEqual([
      "ArchitectureCompliance",
      "Regression",
      "RiskResolution",
      "SelfValidation",
      "Verification",
    ].sort());
  });
});

describe("EEOS Runtime — Session", () => {
  it("creates session with frozen context", () => {
    const session = createSession({ request: "Fix inventory bug" });
    expect(session.executionId).toMatch(/^eeos-/);
    expect(session.context.frozen).toBe(true);
    expect(session.status).toBe("RUNNING");
    expect(session.currentPhase).toBe("INTAKE");
  });

  it("records engine result and adds trace entry", () => {
    const session = createSession({ request: "Test" });
    const result = makeResult({ engine: "SelfValidation" });

    const updated = recordEngineResult(session, result);
    expect(updated.trace).toHaveLength(1);
    expect(updated.trace[0]!.engine).toBe("SelfValidation");
    expect(updated.engineResults.has("SelfValidation")).toBe(true);
  });

  it("advances phase correctly", () => {
    const session = createSession({ request: "Test" });
    const advanced = advancePhase(session, "CLASSIFICATION");
    expect(advanced.currentPhase).toBe("CLASSIFICATION");
    expect(advanced.completedPhases).toContain("INTAKE");
  });

  it("blocks session with reason", () => {
    const session = createSession({ request: "Test" });
    const blocked = blockSession(session, "Architecture violation");
    expect(blocked.status).toBe("BLOCKED");
    expect(blocked.completedAt).toBeDefined();
  });

  it("completes session", () => {
    const session = createSession({ request: "Test" });
    const completed = completeSession(session);
    expect(completed.status).toBe("COMPLETED");
  });

  it("does not mutate original session", () => {
    const session = createSession({ request: "Test" });
    const updated = recordEngineResult(session, makeResult());
    expect(session.trace).toHaveLength(0); // original unchanged
    expect(updated.trace).toHaveLength(1);
  });
});

describe("EEOS Runtime — Pipeline Controller", () => {
  it("creates pipeline via createPipeline", () => {
    const session = createPipeline({ request: "Test feature" });
    expect(session.status).toBe("RUNNING");
    expect(session.currentPhase).toBe("INTAKE");
  });

  it("executes phase and advances on PASS", () => {
    const session = createPipeline({ request: "Test" });
    const result = makeResult({ engine: "SelfValidation", decision: "PROCEED" });

    const updated = executePhase(session, "SelfValidation", result);
    expect(updated.currentPhase).toBe("CLASSIFICATION");
    expect(updated.completedPhases).toContain("INTAKE");
    expect(updated.status).toBe("RUNNING");
  });

  it("blocks pipeline on BLOCK decision", () => {
    const session = createPipeline({ request: "Test" });
    const result = makeResult({
      engine: "SelfValidation",
      decision: "BLOCK",
      status: "FAIL",
      summary: "Architecture violation found",
    });

    const updated = executePhase(session, "SelfValidation", result);
    expect(updated.status).toBe("BLOCKED");
  });

  it("finalizes session with composite confidence", () => {
    const session = createPipeline({ request: "Test" });
    const updated = recordEngineResult(session, makeResult({ confidence: 0.9 }));
    const updated2 = recordEngineResult(updated, makeResult({ engine: "Classification", confidence: 0.8 }));

    const result = finalize(updated2);
    expect(result.confidence).toBe(0.85);
    expect(result.status).toBe("COMPLETED");
  });

  it("produces phase summary", () => {
    const session = createPipeline({ request: "Test" });
    const summary = getPhaseSummary(session);
    expect(summary).toContain("Phase 1/16");
    expect(summary).toContain("INTAKE");
  });

  it("produces engine summary", () => {
    const session = createPipeline({ request: "Test" });
    const updated = recordEngineResult(session, makeResult());
    const summary = getEngineSummary(updated);
    expect(summary.total).toBe(1);
    expect(summary.passed).toBe(1);
  });

  it("full lifecycle: create → execute 3 phases → finalize", () => {
    let session = createPipeline({ request: "Add stock indicator" });

    session = executePhase(session, "SelfValidation", makeResult({ engine: "SelfValidation" }));
    expect(session.currentPhase).toBe("CLASSIFICATION");

    session = executePhase(session, "TaskClassification", makeResult({
      engine: "TaskClassification",
      summary: "Classified as UI",
    }));
    expect(session.currentPhase).toBe("CONTEXT_RESOLUTION");

    session = executePhase(session, "ContextResolution", makeResult({
      engine: "ContextResolution",
      summary: "Module: Inventory",
    }));

    const result = finalize(session);
    expect(result.trace).toHaveLength(3);
    expect(result.status).toBe("COMPLETED");
    expect(result.confidence).toBe(1.0);
  });
});
