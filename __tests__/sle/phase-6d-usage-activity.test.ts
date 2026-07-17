import { describe, it, expect } from "vitest";
import { resourceHealth, healthSummary } from "@/lib/subscription/resource-health";
import { applyTimelineFilters, timelineEventCounts } from "@/lib/subscription/timeline-summary";
import { paymentConfidenceMessage, paymentStatusExplanation } from "@/config/payment-descriptions";

/* ─── resourceHealth ─── */
describe("resourceHealth", () => {
  it("ok under 80%", () => expect(resourceHealth("users", 5, 10).health).toBe("ok"));
  it("near at 80%", () => expect(resourceHealth("users", 8, 10).health).toBe("near"));
  it("critical at 95%", () => expect(resourceHealth("users", 10, 10).health).toBe("critical"));
  it("pct null when unlimited", () => {
    expect(resourceHealth("api", 9999, null).pct).toBeNull();
    expect(resourceHealth("api", 9999, null).health).toBe("ok");
  });
});

describe("healthSummary", () => {
  it("aggregates health levels", () => {
    const data = [resourceHealth("a", 9, 10), resourceHealth("b", 5, 10), resourceHealth("c", 15, 15)];
    expect(healthSummary(data)).toEqual({ ok: 1, near: 1, critical: 1 });
  });
});

/* ─── timeline summary ─── */
describe("applyTimelineFilters", () => {
  const nodes = [{ eventType: "trial_activated", createdAt: "a" }, { eventType: "upgraded", createdAt: "b" }] as never;
  it("unfiltered returns all", () => expect(applyTimelineFilters(nodes, {}).length).toBe(2));
  it("filtered by type", () => expect(applyTimelineFilters(nodes, { eventTypes: ["upgraded"] }).length).toBe(1));
  it("no match returns []", () => expect(applyTimelineFilters(nodes, { eventTypes: ["renewed"] }).length).toBe(0));
});

describe("timelineEventCounts", () => {
  it("counts event types", () => {
    const nodes = [{ eventType: "a", createdAt: "" }, { eventType: "a", createdAt: "" }, { eventType: "b", createdAt: "" }] as never;
    expect(timelineEventCounts(nodes)).toEqual({ a: 2, b: 1 });
  });
});

/* ─── payment status explanation → human-readable ─── */
describe("paymentStatusExplanation", () => {
  it("returns human text, never raw status", () => {
    expect(paymentStatusExplanation("success")).toMatch(/diterima/i);
    expect(paymentStatusExplanation("pending")).toMatch(/menunggu/i);
  });
});

/* ─── payment confidence message per provider ─── */
describe("paymentConfidenceMessage", () => {
  it("includes clear messaging for each known provider", () => {
    expect(paymentConfidenceMessage("manual")).toMatch(/administrator/);
    expect(paymentConfidenceMessage("flip")).toMatch(/otomatis/);
    expect(paymentConfidenceMessage("midtrans")).toBeTruthy();
    expect(paymentConfidenceMessage("xendit")).toBeTruthy();
  });
  it("returns a safe fallback for unknown providers", () => {
    expect(paymentConfidenceMessage("stripe")).toMatch(/ikuti instruksi/i);
  });
});
