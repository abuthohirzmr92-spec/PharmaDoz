import { describe, it, expect } from "vitest";
import { decideSweepTransition } from "@/lib/subscription/sweep";
import { eventTypeForState } from "@/lib/services/subscription-lifecycle-service";
import { resolveTrialPlan } from "@/lib/services/provision-tenant-service";

const NOW = "2026-07-12T00:00:00.000Z";
const PAST = "2026-07-01T00:00:00.000Z";
const FUTURE = "2026-08-01T00:00:00.000Z";

/* ─── sweep.decideSweepTransition ─── */
describe("decideSweepTransition", () => {
  const t = { readOnlyDays: 14 };

  it("active + period ended → expired", () => {
    expect(decideSweepTransition({ lifecycleState: "active", currentPeriodEnd: PAST, graceUntil: null, readOnlyAt: null }, NOW, t))
      .toEqual({ toState: "expired", eventType: "expired" });
  });
  it("active + period not ended → null", () => {
    expect(decideSweepTransition({ lifecycleState: "active", currentPeriodEnd: FUTURE, graceUntil: null, readOnlyAt: null }, NOW, t))
      .toBeNull();
  });
  it("trial_active + period ended → trial_expired", () => {
    expect(decideSweepTransition({ lifecycleState: "trial_active", currentPeriodEnd: PAST, graceUntil: null, readOnlyAt: null }, NOW, t)?.toState)
      .toBe("trial_expired");
  });
  it("expired → grace_period", () => {
    expect(decideSweepTransition({ lifecycleState: "expired", currentPeriodEnd: PAST, graceUntil: null, readOnlyAt: null }, NOW, t)?.toState)
      .toBe("grace_period");
  });
  it("grace_period past graceUntil → read_only", () => {
    expect(decideSweepTransition({ lifecycleState: "grace_period", currentPeriodEnd: PAST, graceUntil: PAST, readOnlyAt: null }, NOW, t)?.toState)
      .toBe("read_only");
  });
  it("grace_period before graceUntil → null", () => {
    expect(decideSweepTransition({ lifecycleState: "grace_period", currentPeriodEnd: PAST, graceUntil: FUTURE, readOnlyAt: null }, NOW, t))
      .toBeNull();
  });
  it("read_only past read_only_at + readOnlyDays → suspended", () => {
    // readOnlyAt 2026-06-01 + 14d = 2026-06-15 <= NOW
    expect(decideSweepTransition({ lifecycleState: "read_only", currentPeriodEnd: PAST, graceUntil: null, readOnlyAt: "2026-06-01T00:00:00Z" }, NOW, t)?.toState)
      .toBe("suspended");
  });
  it("read_only within window → null", () => {
    expect(decideSweepTransition({ lifecycleState: "read_only", currentPeriodEnd: PAST, graceUntil: null, readOnlyAt: "2026-07-10T00:00:00Z" }, NOW, t))
      .toBeNull();
  });
  it("suspended (terminal for sweep) → null", () => {
    expect(decideSweepTransition({ lifecycleState: "suspended", currentPeriodEnd: PAST, graceUntil: null, readOnlyAt: null }, NOW, t))
      .toBeNull();
  });
});

/* ─── eventTypeForState ─── */
describe("eventTypeForState", () => {
  it("maps key states", () => {
    expect(eventTypeForState("trial_active")).toBe("trial_activated");
    expect(eventTypeForState("grace_period")).toBe("grace_started");
    expect(eventTypeForState("read_only")).toBe("read_only_started");
    expect(eventTypeForState("suspended")).toBe("suspended");
  });
  it("falls back for unknown", () => {
    expect(eventTypeForState("weird")).toBe("subscription_updated");
  });
});

/* ─── resolveTrialPlan ─── */
describe("resolveTrialPlan", () => {
  it("prefers request plan + approved duration + overrides", () => {
    expect(resolveTrialPlan(
      { requestedPlanId: "plan-x", approvedDurationDays: 30, approvedResourceOverrides: { users: 20 } },
      "default-plan", 14,
    )).toEqual({ planId: "plan-x", durationDays: 30, resourceOverrides: { users: 20 } });
  });
  it("falls back to config defaults", () => {
    expect(resolveTrialPlan(
      { requestedPlanId: null, approvedDurationDays: null, approvedResourceOverrides: {} },
      "default-plan", 14,
    )).toEqual({ planId: "default-plan", durationDays: 14, resourceOverrides: {} });
  });
});
