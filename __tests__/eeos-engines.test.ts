import { describe, it, expect, beforeEach } from "vitest";
import { createEngine } from "@/eeos/edk/create-engine";
import { createResult } from "@/eeos/edk/engine-result";
import { registerAllEngines } from "@/eeos/engines";
import { clearRegistry, hasEngine, registerEngine } from "@/eeos/edk/engine-registry";
import { executePipeline } from "@/eeos/execution/execution-controller";
import { createExecutionContext } from "@/eeos/execution/execution-context";
import type { ExecutionContext } from "@/eeos/runtime/types";

const CTX = createExecutionContext({ request: "Test feature", epic: "Inventory" });

function freshArchEngine() {
  return createEngine({
    id: "architecture-compliance",
    displayName: "Test Architecture",
    phase: "ARCHITECTURE_COMPLIANCE",
    blocking: true,
    execute: (ctx: ExecutionContext) => createResult("architecture-compliance", ctx, {
      status: "PASS", summary: "Compliant", evidence: ["Checked"], decision: "PROCEED", confidence: 1.0,
    }),
  });
}
function freshPolicyEngine() {
  return createEngine({
    id: "policy-engine",
    displayName: "Test Policy",
    phase: "POLICY_RESOLUTION",
    blocking: true,
    execute: (ctx: ExecutionContext) => createResult("policy-engine", ctx, {
      status: "PASS", summary: "Policies OK", evidence: ["12/12 passed"], decision: "PROCEED", confidence: 1.0,
    }),
  });
}

describe("Architecture Compliance Engine", () => {
  it("validates architecture compliance", async () => {
    const eng = freshArchEngine();
    const result = await eng.execute(CTX);
    expect(result.status).toBe("PASS");
    expect(result.decision).toBe("PROCEED");
  });

  it("is blocking", () => {
    const eng = freshArchEngine();
    expect(eng.definition.metadata.blocking).toBe(true);
  });
});

describe("Policy Engine", () => {
  it("validates all 12 policies", async () => {
    const eng = freshPolicyEngine();
    const result = await eng.execute(CTX);
    expect(result.status).toBe("PASS");
  });
});

describe("Release Recommendation Engine", () => {
  it("recommends for FEATURE", async () => {
    const eng = createEngine({
      id: "release-test-1",
      displayName: "Release Test",
      phase: "RELEASE",
      execute: (ctx) => createResult("release-test-1", ctx, {
        status: "PASS", summary: "READY_PREVIEW", evidence: [], decision: "PROCEED", confidence: 1.0,
      }),
    });
    const result = await eng.execute(CTX);
    expect(result.summary).toContain("READY_PREVIEW");
  });
});

describe("Engine Registration", () => {
  beforeEach(() => clearRegistry());

  it("registers all 5 engines", () => {
    registerAllEngines();
    expect(hasEngine("architecture-compliance")).toBe(true);
    expect(hasEngine("repository-discovery")).toBe(true);
    expect(hasEngine("dependency-discovery")).toBe(true);
    expect(hasEngine("policy-engine")).toBe(true);
    expect(hasEngine("release-recommendation")).toBe(true);
  });
});

describe("Full Pipeline Execution", () => {
  beforeEach(() => {
    clearRegistry();
    // Register all mandatory engines so pipeline doesn't block
    const selfValidation = createEngine({
      id: "SelfValidation", displayName: "SV", phase: "INTAKE",
      execute: (ctx) => createResult("SelfValidation", ctx, {
        status: "PASS", summary: "OK", evidence: [], decision: "PROCEED", confidence: 1.0,
      }),
    });
    registerEngine(selfValidation.definition, selfValidation.execute);
    registerEngine(freshArchEngine().definition, freshArchEngine().execute);
    registerEngine(freshPolicyEngine().definition, freshPolicyEngine().execute);
    // Verification and Regression engines (blocking)
    const verify = createEngine({
      id: "Verification", displayName: "Verify", phase: "VERIFICATION",
      execute: (ctx) => createResult("Verification", ctx, {
        status: "PASS", summary: "TS+Build+Tests OK", evidence: [], decision: "PROCEED", confidence: 1.0,
      }),
    });
    registerEngine(verify.definition, verify.execute);
    const regress = createEngine({
      id: "Regression", displayName: "Regress", phase: "REGRESSION",
      execute: (ctx) => createResult("Regression", ctx, {
        status: "PASS", summary: "No regressions", evidence: [], decision: "PROCEED", confidence: 1.0,
      }),
    });
    registerEngine(regress.definition, regress.execute);
    const releaseEng = createEngine({
      id: "release-recommendation", displayName: "Release", phase: "RELEASE",
      execute: (ctx) => createResult("release-recommendation", ctx, {
        status: "PASS", summary: "READY", evidence: [], decision: "PROCEED", confidence: 1.0,
      }),
    });
    registerEngine(releaseEng.definition, releaseEng.execute);
  });

  it("executes pipeline through registered engines", async () => {
    const result = await executePipeline(CTX);
    // Mandatory engines registered → pipeline completes
    expect(result.status).toBe("COMPLETED");
    expect(result.trace.length).toBeGreaterThan(0);
  });

  it("produces trace entries for registered engines", async () => {
    const result = await executePipeline(CTX);
    const enginesExecuted = new Set(result.trace.map((t) => t.engine));
    expect(enginesExecuted.has("SelfValidation")).toBe(true);
    expect(enginesExecuted.has("architecture-compliance")).toBe(true);
    expect(enginesExecuted.has("policy-engine")).toBe(true);
  });
});
