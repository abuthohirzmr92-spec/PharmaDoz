import { describe, it, expect, beforeEach } from "vitest";
import { createEngine } from "@/eeos/edk/create-engine";
import {
  registerEngine,
  unregisterEngine,
  getEngine,
  resolveEngine,
  listEngines,
  listEnginesByPhase,
  hasEngine,
  clearRegistry,
} from "@/eeos/edk/engine-registry";
import type { PipelinePhase } from "@/eeos/runtime/types";
import { validateEngine } from "@/eeos/edk/engine-validator";
import { canTransition, transition, isTerminal, isActive } from "@/eeos/edk/engine-lifecycle";
import { createResult } from "@/eeos/edk/engine-result";
import {
  ValidationError,
  RegistrationError,
  UnknownEngine,
  LifecycleError,
  ExecutionFailure,
} from "@/eeos/edk/engine-errors";
import type { ExecutionContext } from "@/eeos/runtime/types";

const TEST_CTX: ExecutionContext = {
  executionId: "eeos-test-001",
  taskClass: "FEATURE",
  product: "MEDISYNC",
  epic: "TEST",
  sprint: "",
  story: null,
  branch: "",
  milestone: "",
  environment: "test",
  architecturePackage: "",
  adrsActive: [],
  featureScope: "Test",
  createdAt: new Date().toISOString(),
  frozen: true,
};

/* ─── Factory ─── */

describe("EDK — createEngine()", () => {
  it("creates a valid engine with all required fields", () => {
    const engine = createEngine({
      id: "test-engine",
      displayName: "Test Engine",
      phase: "DISCOVERY",
      execute: () => createResult("test-engine", TEST_CTX),
    });

    expect(engine.definition.metadata.id).toBe("test-engine");
    expect(engine.definition.metadata.version).toBe("1.0.0");
    expect(engine.getState()).toBe("VALIDATED"); // auto-validated at creation
  });

  it("throws ValidationError for missing id", () => {
    expect(() =>
      createEngine({
        id: "",
        displayName: "Bad",
        phase: "DISCOVERY",
        execute: () => createResult("bad", TEST_CTX),
      }),
    ).toThrow(ValidationError);
  });

  it("throws ValidationError for missing execute function", () => {
    expect(() =>
      createEngine({
        id: "no-exec",
        displayName: "No Exec",
        phase: "DISCOVERY",
        execute: undefined as any,
      }),
    ).toThrow(ValidationError);
  });

  it("executes engine and transitions lifecycle", async () => {
    const engine = createEngine({
      id: "lifecycle-test",
      displayName: "Lifecycle Test",
      phase: "DISCOVERY",
      execute: (ctx) => createResult("lifecycle-test", ctx, { summary: "Done" }),
    });

    const result = await engine.execute(TEST_CTX);
    expect(result.summary).toBe("Done");
    expect(engine.getState()).toBe("COMPLETED");
  });

  it("respects custom version", () => {
    const engine = createEngine({
      id: "versioned",
      displayName: "Versioned",
      version: "2.1.0",
      phase: "DISCOVERY",
      execute: () => createResult("versioned", TEST_CTX),
    });
    expect(engine.definition.metadata.version).toBe("2.1.0");
  });

  it("handles blocking engine", () => {
    const engine = createEngine({
      id: "blocking-engine",
      displayName: "Blocker",
      phase: "ARCHITECTURE_COMPLIANCE",
      blocking: true,
      execute: (ctx) => createResult("blocking-engine", ctx, { decision: "BLOCK", status: "FAIL" }),
    });
    expect(engine.definition.metadata.blocking).toBe(true);
  });
});

/* ─── Registry ─── */

describe("EDK — Engine Registry", () => {
  beforeEach(() => clearRegistry());

  const makeEngine = (id: string, phase: PipelinePhase = "DISCOVERY") =>
    createEngine({ id, displayName: id, phase, execute: () => createResult(id, TEST_CTX) });

  it("registers and retrieves an engine", () => {
    const e = makeEngine("reg-test");
    registerEngine(e.definition, e.execute);
    expect(hasEngine("reg-test")).toBe(true);
    expect(getEngine("reg-test").definition.metadata.id).toBe("reg-test");
  });

  it("throws RegistrationError on duplicate", () => {
    const e = makeEngine("dup");
    registerEngine(e.definition, e.execute);
    expect(() => registerEngine(e.definition, e.execute)).toThrow(RegistrationError);
  });

  it("throws UnknownEngine for missing engine", () => {
    expect(() => getEngine("nonexistent")).toThrow(UnknownEngine);
  });

  it("unregisters engines", () => {
    const e = makeEngine("temp");
    registerEngine(e.definition, e.execute);
    unregisterEngine("temp");
    expect(hasEngine("temp")).toBe(false);
  });

  it("lists all registered engines", () => {
    registerEngine(makeEngine("engine-a").definition, makeEngine("engine-a").execute);
    registerEngine(makeEngine("engine-b").definition, makeEngine("engine-b").execute);
    expect(listEngines()).toHaveLength(2);
  });

  it("lists engines by phase", () => {
    registerEngine(makeEngine("engine-x", "DISCOVERY").definition, makeEngine("engine-x", "DISCOVERY").execute);
    registerEngine(makeEngine("engine-y", "RELEASE").definition, makeEngine("engine-y", "RELEASE").execute);
    expect(listEnginesByPhase("DISCOVERY")).toHaveLength(1);
    expect(listEnginesByPhase("RELEASE")).toHaveLength(1);
  });

  it("resolveEngine returns null for unknown", () => {
    expect(resolveEngine("ghost")).toBeNull();
  });

  it("resolveEngine returns engine when found", () => {
    const e = makeEngine("found");
    registerEngine(e.definition, e.execute);
    expect(resolveEngine("found")).not.toBeNull();
  });
});

/* ─── Validator ─── */

describe("EDK — Validator", () => {
  it("validates complete definition", () => {
    const def = createEngine({
      id: "val-test",
      displayName: "Test",
      phase: "DISCOVERY",
      execute: () => createResult("val-test", TEST_CTX),
    }).definition;
    expect(validateEngine(def).valid).toBe(true);
  });

  it("reports errors for incomplete definition", () => {
    const report = validateEngine({ metadata: { id: "" } as any, execute: null as any } as any);
    expect(report.valid).toBe(false);
    expect(report.errors.length).toBeGreaterThan(0);
  });

  it("warns on empty dependencies", () => {
    const def = createEngine({
      id: "warn-test",
      displayName: "Warn",
      phase: "DISCOVERY",
      dependencies: [],
      execute: () => createResult("warn-test", TEST_CTX),
    }).definition;
    const report = validateEngine(def);
    expect(report.warnings).toContain("contract.dependencies is empty");
  });
});

/* ─── Lifecycle ─── */

describe("EDK — Lifecycle", () => {
  it("allows valid transitions", () => {
    expect(canTransition("REGISTERED", "VALIDATED")).toBe(true);
    expect(canTransition("INITIALIZED", "EXECUTING")).toBe(true);
    expect(canTransition("EXECUTING", "COMPLETED")).toBe(true);
    expect(canTransition("EXECUTING", "FAILED")).toBe(true);
    expect(canTransition("FAILED", "INITIALIZED")).toBe(true);
  });

  it("rejects illegal transitions", () => {
    expect(canTransition("REGISTERED", "EXECUTING")).toBe(false);
    expect(canTransition("COMPLETED", "EXECUTING")).toBe(false);
    expect(canTransition("DISPOSED", "REGISTERED")).toBe(false);
  });

  it("transition throws on illegal transition", () => {
    expect(() => transition("test", "REGISTERED", "EXECUTING")).toThrow(LifecycleError);
  });

  it("terminal states", () => {
    expect(isTerminal("COMPLETED")).toBe(true);
    expect(isTerminal("DISPOSED")).toBe(true);
    expect(isTerminal("REGISTERED")).toBe(false);
    expect(isTerminal("EXECUTING")).toBe(false);
  });

  it("active states", () => {
    expect(isActive("INITIALIZED")).toBe(true);
    expect(isActive("EXECUTING")).toBe(true);
    expect(isActive("COMPLETED")).toBe(false);
  });
});

/* ─── Error Model ─── */

describe("EDK — Error Model", () => {
  it("ValidationError carries engineId", () => {
    const err = new ValidationError("e1", "Bad input");
    expect(err.engineId).toBe("e1");
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("UnknownEngine carries engineId", () => {
    const err = new UnknownEngine("ghost");
    expect(err.engineId).toBe("ghost");
    expect(err.code).toBe("UNKNOWN_ENGINE");
  });

  it("ExecutionFailure wraps errors", () => {
    const err = new ExecutionFailure("e1", "Boom");
    expect(err.message).toContain("[e1]");
    expect(err.message).toContain("Boom");
  });
});

/* ─── Result Factory ─── */

describe("EDK — Result Factory", () => {
  it("creates standard PASS result", () => {
    const result = createResult("test", TEST_CTX);
    expect(result.engine).toBe("test");
    expect(result.status).toBe("PASS");
    expect(result.decision).toBe("PROCEED");
    expect(result.confidence).toBe(1.0);
  });

  it("creates BLOCK result with risks", () => {
    const result = createResult("test", TEST_CTX, {
      decision: "BLOCK",
      status: "FAIL",
      risks: [{ id: "R1", severity: "P0", description: "Crash", mitigation: "Fix" }],
    });
    expect(result.decision).toBe("BLOCK");
    expect(result.risks).toHaveLength(1);
  });
});
