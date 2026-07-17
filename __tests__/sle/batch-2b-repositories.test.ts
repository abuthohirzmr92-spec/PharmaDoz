import { describe, it, expect } from "vitest";
import { isKnownLifecycleState, buildTimeline } from "@/lib/repositories/subscription";
import { nextTrialStatus } from "@/lib/repositories/trial-request";

/* ─── SubscriptionRepository.isKnownLifecycleState ─── */
describe("isKnownLifecycleState", () => {
  it("accepts known states", () => {
    expect(isKnownLifecycleState("trial_active")).toBe(true);
    expect(isKnownLifecycleState("read_only")).toBe(true);
    expect(isKnownLifecycleState("terminated")).toBe(true);
  });
  it("rejects unknown states", () => {
    expect(isKnownLifecycleState("cancelled")).toBe(false);
    expect(isKnownLifecycleState("")).toBe(false);
    expect(isKnownLifecycleState("ACTIVE")).toBe(false);
  });
});

/* ─── SubscriptionRepository.buildTimeline ─── */
describe("buildTimeline", () => {
  const events = [
    { event_type: "upgraded", previous_package_id: "p1", new_package_id: "p2", actor_id: "u1", metadata: { a: 1 }, created_at: "2026-03-01T00:00:00Z" },
    { event_type: "trial_activated", previous_package_id: null, new_package_id: "p1", actor_id: null, metadata: null, created_at: "2026-01-01T00:00:00Z" },
    { event_type: "renewed", previous_package_id: "p2", new_package_id: "p2", actor_id: "u1", metadata: {}, created_at: "2026-02-01T00:00:00Z" },
  ];

  it("orders events ascending by created_at", () => {
    expect(buildTimeline(events).map((n) => n.eventType)).toEqual(["trial_activated", "renewed", "upgraded"]);
  });

  it("defaults null metadata to an empty object", () => {
    const nodes = buildTimeline(events);
    expect(nodes[0]?.metadata).toEqual({});
    expect(nodes[0]?.previousPackageId).toBeNull();
  });

  it("does not mutate the input array", () => {
    const copy = [...events];
    buildTimeline(events);
    expect(events).toEqual(copy);
  });

  it("returns [] for no events", () => {
    expect(buildTimeline([])).toEqual([]);
  });
});

/* ─── TrialRequestRepository.nextTrialStatus ─── */
describe("nextTrialStatus", () => {
  it("pending → reviewing (review)", () => {
    expect(nextTrialStatus("pending", "review")).toBe("reviewing");
  });
  it("pending/reviewing → approved (approve)", () => {
    expect(nextTrialStatus("pending", "approve")).toBe("approved");
    expect(nextTrialStatus("reviewing", "approve")).toBe("approved");
  });
  it("pending/reviewing → rejected (reject)", () => {
    expect(nextTrialStatus("reviewing", "reject")).toBe("rejected");
  });
  it("blocks invalid transitions", () => {
    expect(nextTrialStatus("approved", "review")).toBeNull();
    expect(nextTrialStatus("approved", "reject")).toBeNull();
    expect(nextTrialStatus("rejected", "approve")).toBeNull();
    expect(nextTrialStatus("reviewing", "review")).toBeNull();
  });
});
