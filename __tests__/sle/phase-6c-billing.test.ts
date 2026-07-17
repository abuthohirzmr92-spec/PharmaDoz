import { describe, it, expect } from "vitest";
import { diffAddedFeatures } from "@/lib/subscription/plan-compare";
import { promoOutcome } from "@/lib/subscription/promo-evaluate";
import { buildPaymentTimeline } from "@/lib/subscription/payment-timeline";

/* ─── diffAddedFeatures ─── */
describe("diffAddedFeatures", () => {
  it("finds features in next that are not in current", () => {
    expect(diffAddedFeatures({ f1: true, f2: false }, { f1: true, f2: true, f3: true }).sort()).toEqual(["f2", "f3"]);
  });
  it("returns [] when nothing is added", () => {
    expect(diffAddedFeatures({ a: true }, { a: true })).toEqual([]);
  });
});

/* ─── promoOutcome ─── */
describe("promoOutcome", () => {
  const valid = { isActive: true, validFrom: null, validTo: null, maxRedemptions: null, redeemedCount: 0, appliesToPlanId: null, minAmount: null };
  it("applied", () => {
    expect(promoOutcome(valid, { nowISO: "2026-07-01", amount: 100000, planId: null })).toMatchObject({ applied: true, status: "applied" });
  });
  it("not_found", () => expect(promoOutcome(null, {} as never).status).toBe("not_found"));
  it("inactive", () => expect(promoOutcome({ ...valid, isActive: false }, {} as never).status).toBe("inactive"));
  it("expired", () => expect(promoOutcome({ ...valid, validTo: "2020-01-01" }, { nowISO: "2026-07-01", amount: 0, planId: null }).status).toBe("expired"));
  it("not_yet_valid", () => expect(promoOutcome({ ...valid, validFrom: "2030-01-01" }, { nowISO: "2026-07-01", amount: 0, planId: null }).status).toBe("not_yet_valid"));
  it("exhausted", () => expect(promoOutcome({ ...valid, maxRedemptions: 5, redeemedCount: 5 }, {} as never).status).toBe("exhausted"));
  it("plan_mismatch", () => expect(promoOutcome({ ...valid, appliesToPlanId: "plan-a" }, { nowISO: "", amount: 0, planId: "plan-b" }).status).toBe("plan_mismatch"));
  it("min_not_met", () => expect(promoOutcome({ ...valid, minAmount: 200000 }, { nowISO: "", amount: 100000, planId: null }).status).toBe("min_not_met"));
});

/* ─── buildPaymentTimeline ─── */
describe("buildPaymentTimeline", () => {
  it("marks steps for an unpaid invoice", () => {
    const t = buildPaymentTimeline({ invoiceCreatedAt: "2026-01-01", invoiceStatus: "sent", paymentStatus: null, paidAt: null });
    expect(t[0]?.done).toBe(true);
    expect(t[1]?.done).toBe(false);
  });
  it("marks all steps for a paid invoice", () => {
    const t = buildPaymentTimeline({ invoiceCreatedAt: "2026-01-01", invoiceStatus: "paid", paymentStatus: "success", paidAt: "2026-01-02" });
    expect(t.every((s) => s.done)).toBe(true);
  });
});
