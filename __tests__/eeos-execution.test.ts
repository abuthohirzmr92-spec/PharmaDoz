import { describe, it, expect } from "vitest";
import { createInstance } from "@/eeos/execution/engine-instance";
import { canTransition, isTerminal, isActive } from "@/eeos/execution/execution-lifecycle";
import type { EngineInstance, EngineInstanceState } from "@/eeos/execution/execution-types";

describe("Execution Engine — Lifecycle", () => {
  it("allows CREATED → INITIALIZED", () => {
    expect(canTransition("CREATED", "INITIALIZED")).toBe(true);
  });

  it("allows INITIALIZED → EXECUTING", () => {
    expect(canTransition("INITIALIZED", "EXECUTING")).toBe(true);
  });

  it("allows EXECUTING → COMPLETED", () => {
    expect(canTransition("EXECUTING", "COMPLETED")).toBe(true);
  });

  it("allows EXECUTING → FAILED", () => {
    expect(canTransition("EXECUTING", "FAILED")).toBe(true);
  });

  it("allows any non-DISPOSED state → DISPOSED (via transition)", () => {
    expect(canTransition("CREATED", "DISPOSED")).toBe(true);
    expect(canTransition("INITIALIZED", "DISPOSED")).toBe(true);
    expect(canTransition("EXECUTING", "DISPOSED")).toBe(true);
    expect(canTransition("COMPLETED", "DISPOSED")).toBe(true);
    expect(canTransition("FAILED", "DISPOSED")).toBe(true);
  });

  it("rejects CREATED → EXECUTING (skipping INITIALIZED)", () => {
    expect(canTransition("CREATED", "EXECUTING")).toBe(false);
  });

  it("rejects COMPLETED → EXECUTING (backwards)", () => {
    expect(canTransition("COMPLETED", "EXECUTING")).toBe(false);
  });

  it("rejects DISPOSED → anything", () => {
    expect(canTransition("DISPOSED", "CREATED")).toBe(false);
    expect(canTransition("DISPOSED", "EXECUTING")).toBe(false);
  });

  it("terminal states are COMPLETED, FAILED, DISPOSED", () => {
    expect(isTerminal("COMPLETED")).toBe(true);
    expect(isTerminal("FAILED")).toBe(true);
    expect(isTerminal("DISPOSED")).toBe(true);
    expect(isTerminal("CREATED")).toBe(false);
  });

  it("active states are INITIALIZED, EXECUTING", () => {
    expect(isActive("INITIALIZED")).toBe(true);
    expect(isActive("EXECUTING")).toBe(true);
    expect(isActive("COMPLETED")).toBe(false);
    expect(isActive("CREATED")).toBe(false);
  });
});

describe("Execution Engine — Engine Instance", () => {
  it("creates instance with unique ID", () => {
    const a = createInstance("test-engine");
    const b = createInstance("test-engine");

    expect(a.instance.instanceId).not.toBe(b.instance.instanceId);
    expect(a.instance.engineId).toBe("test-engine");
    expect(b.instance.engineId).toBe("test-engine");
  });

  it("starts in CREATED state", () => {
    const { instance } = createInstance("test");
    expect(instance.state).toBe("CREATED");
    expect(instance.error).toBeNull();
    expect(instance.createdAt).toBeDefined();
  });

  it("sets startedAt and finishedAt as null initially", () => {
    const { instance } = createInstance("test");
    expect(instance.startedAt).toBeNull();
    expect(instance.finishedAt).toBeNull();
  });

  it("follows full lifecycle: CREATED → INITIALIZED → EXECUTING → COMPLETED → DISPOSED", () => {
    const { instance, handle } = createInstance("lifecycle-test");

    handle.initialize();
    expect(instance.state).toBe("INITIALIZED");

    handle.markExecuting();
    expect(instance.state).toBe("EXECUTING");
    expect(instance.startedAt).not.toBeNull();

    handle.markCompleted();
    expect(instance.state).toBe("COMPLETED");
    expect(instance.finishedAt).not.toBeNull();

    handle.dispose();
    expect(instance.state).toBe("DISPOSED");
  });

  it("follows failure path: EXECUTING → FAILED → DISPOSED", () => {
    const { instance, handle } = createInstance("fail-test");

    handle.initialize();
    handle.markExecuting();

    const err = new Error("Something broke");
    handle.markFailed(err);
    expect(instance.state).toBe("FAILED");
    expect(instance.error).toBe(err);

    handle.dispose();
    expect(instance.state).toBe("DISPOSED");
  });

  it("dispose is idempotent", () => {
    const { instance, handle } = createInstance("idempotent-test");

    handle.dispose();
    expect(instance.state).toBe("DISPOSED");

    // Second dispose should not throw
    expect(() => handle.dispose()).not.toThrow();
    expect(instance.state).toBe("DISPOSED");
  });

  it("rejects illegal transition: initialize twice", () => {
    const { handle } = createInstance("double-init");
    handle.initialize();
    expect(() => handle.initialize()).toThrow(/Illegal lifecycle/);
  });

  it("rejects illegal transition: markCompleted without executing", () => {
    const { handle } = createInstance("skip-exec");
    expect(() => handle.markCompleted()).toThrow(/Illegal lifecycle/);
  });

  it("rejects illegal transition: markExecuting without initialize", () => {
    const { handle } = createInstance("skip-init");
    expect(() => handle.markExecuting()).toThrow(/Illegal lifecycle/);
  });

  it("one definition creates many independent instances", () => {
    const a = createInstance("shared-engine");
    const b = createInstance("shared-engine");

    a.handle.initialize();
    expect(a.instance.state).toBe("INITIALIZED");
    expect(b.instance.state).toBe("CREATED"); // b unchanged

    b.handle.initialize();
    b.handle.markExecuting();
    b.handle.markCompleted();
    expect(b.instance.state).toBe("COMPLETED");
    expect(a.instance.state).toBe("INITIALIZED"); // a unchanged
  });
});
