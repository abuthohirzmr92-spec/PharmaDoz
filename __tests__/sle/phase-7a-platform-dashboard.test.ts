import { describe, it, expect } from "vitest";
import { sleKpiCards, attentionItems } from "@/lib/subscription/platform-dashboard-model";

const base: Parameters<typeof sleKpiCards>[0] = {
  totalTenants: 50,
  byState: { active: 30, trial_active: 10, grace_period: 3, read_only: 2, suspended: 1 },
  mrrEstimate: 120_000_000,
  outstandingInvoiceCount: 5,
  outstandingAmount: 3_500_000,
  pendingTrialCount: 4,
  failedSchedulerRunCount: 1,
  overdueInvoiceCount: 2,
};

describe("sleKpiCards", () => {
  it("returns all KPI cards with values", () => {
    const cards = sleKpiCards(base);
    expect(cards.length).toBeGreaterThanOrEqual(5);
    expect(cards.find((c) => c.key === "tenants")?.value).toBe(50);
    expect(cards.find((c) => c.key === "active")?.value).toBe(30);
    expect(cards.find((c) => c.key === "mrr")?.value).toContain("120");
  });
});

describe("attentionItems", () => {
  it("surfaces trials, overdue, failed scheduler, and grace tenants", () => {
    const items = attentionItems(base);
    expect(items.some((i) => i.key === "trials")).toBe(true);
    expect(items.some((i) => i.key === "overdue")).toBe(true);
    expect(items.some((i) => i.key === "scheduler")).toBe(true);
    expect(items.some((i) => i.key === "grace")).toBe(true);
  });
  it("returns empty when everything is healthy", () => {
    const items = attentionItems({ ...base, pendingTrialCount: 0, overdueInvoiceCount: 0, failedSchedulerRunCount: 0, byState: {} });
    expect(items.length).toBe(0);
  });
});
