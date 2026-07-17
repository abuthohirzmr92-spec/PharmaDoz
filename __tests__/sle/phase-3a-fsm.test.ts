import { describe, it, expect } from "vitest";
import {
  isAllowedTransition,
  isLifecycleState,
  deriveAccessGate,
  nextStates,
  LIFECYCLE_STATES,
} from "@/lib/subscription/fsm";
import { computeReminderSchedule } from "@/lib/subscription/reminder-schedule";

/* ─── FSM: transitions ─── */
describe("FSM isAllowedTransition", () => {
  it("allows the trial intake path", () => {
    expect(isAllowedTransition("pending", "reviewing")).toBe(true);
    expect(isAllowedTransition("reviewing", "approved")).toBe(true);
    expect(isAllowedTransition("approved", "provisioning")).toBe(true);
    expect(isAllowedTransition("provisioning", "trial_active")).toBe(true);
  });

  it("allows the expiry → suspend chain", () => {
    expect(isAllowedTransition("active", "grace_period")).toBe(true);
    expect(isAllowedTransition("grace_period", "read_only")).toBe(true);
    expect(isAllowedTransition("read_only", "suspended")).toBe(true);
    expect(isAllowedTransition("suspended", "archived")).toBe(true);
  });

  it("allows reactivation from grace/read_only/suspended", () => {
    expect(isAllowedTransition("grace_period", "active")).toBe(true);
    expect(isAllowedTransition("read_only", "active")).toBe(true);
    expect(isAllowedTransition("suspended", "active")).toBe(true);
  });

  it("blocks illegal transitions", () => {
    expect(isAllowedTransition("terminated", "active")).toBe(false);
    expect(isAllowedTransition("rejected", "approved")).toBe(false);
    expect(isAllowedTransition("active", "trial_active")).toBe(false);
    expect(isAllowedTransition("pending", "active")).toBe(false);
  });

  it("rejects unknown states", () => {
    expect(isAllowedTransition("bogus", "active")).toBe(false);
    expect(isLifecycleState("bogus")).toBe(false);
    expect(isLifecycleState("trial_active")).toBe(true);
  });

  it("terminal states have no outgoing edges", () => {
    expect(nextStates("terminated")).toEqual([]);
    expect(nextStates("rejected")).toEqual([]);
  });
});

/* ─── FSM: access gate ─── */
describe("FSM deriveAccessGate", () => {
  it("maps every lifecycle state to a valid access status", () => {
    const valid = new Set(["active", "trial", "non_active", "suspended", "deleted"]);
    for (const s of LIFECYCLE_STATES) {
      expect(valid.has(deriveAccessGate(s))).toBe(true);
    }
  });
  it("grace and read_only retain access", () => {
    expect(deriveAccessGate("grace_period")).toBe("active");
    expect(deriveAccessGate("read_only")).toBe("active");
  });
  it("trial_active → trial; suspended → suspended", () => {
    expect(deriveAccessGate("trial_active")).toBe("trial");
    expect(deriveAccessGate("suspended")).toBe("suspended");
  });
  it("expired/terminated/archived deny access", () => {
    expect(deriveAccessGate("expired")).toBe("non_active");
    expect(deriveAccessGate("terminated")).toBe("non_active");
    expect(deriveAccessGate("archived")).toBe("non_active");
  });
});

/* ─── reminder-schedule ─── */
describe("computeReminderSchedule", () => {
  it("computes timestamps N days before period end", () => {
    const end = "2026-08-01T00:00:00.000Z";
    const out = computeReminderSchedule(end, [7, 3, 0]);
    expect(out.map((r) => r.kind)).toEqual(["expiry_7d", "expiry_3d", "expiry_0d"]);
    expect(out[0]?.scheduledFor).toBe("2026-07-25T00:00:00.000Z");
    expect(out[2]?.scheduledFor).toBe(end);
  });
  it("returns [] on invalid date", () => {
    expect(computeReminderSchedule("not-a-date", [7])).toEqual([]);
  });
  it("returns [] for empty schedule", () => {
    expect(computeReminderSchedule("2026-08-01T00:00:00Z", [])).toEqual([]);
  });
});
