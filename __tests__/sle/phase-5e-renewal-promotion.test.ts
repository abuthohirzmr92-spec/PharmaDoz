import { describe, it, expect, vi } from "vitest";
import { computeNextPeriodEnd } from "@/lib/billing/calc";
import { BillingService } from "@/lib/services/billing-service";

/* ─── computeNextPeriodEnd ─── */
describe("computeNextPeriodEnd", () => {
  const base = "2026-01-31T00:00:00.000Z";
  it("adds one month", () => {
    expect(computeNextPeriodEnd("2026-01-15T00:00:00.000Z", "month")).toBe("2026-02-15T00:00:00.000Z");
  });
  it("adds a quarter", () => {
    expect(computeNextPeriodEnd("2026-01-15T00:00:00.000Z", "quarter")).toBe("2026-04-15T00:00:00.000Z");
  });
  it("adds a year", () => {
    expect(computeNextPeriodEnd("2026-01-15T00:00:00.000Z", "year")).toBe("2027-01-15T00:00:00.000Z");
  });
  it("lifetime has no next end", () => {
    expect(computeNextPeriodEnd(base, "lifetime")).toBeNull();
  });
  it("invalid date → null", () => {
    expect(computeNextPeriodEnd("nope", "month")).toBeNull();
  });
  it("unknown interval defaults to month", () => {
    expect(computeNextPeriodEnd("2026-01-15T00:00:00.000Z", "weird")).toBe("2026-02-15T00:00:00.000Z");
  });
});

/* ─── BillingService.previewCheckout ─── */
function billingWithPromo(offer: unknown) {
  const promotions = { resolveValidOffer: vi.fn(async () => offer) };
  return new BillingService(
    {} as never, {} as never, {} as never, {} as never, {} as never, promotions as never,
  );
}

describe("BillingService.previewCheckout", () => {
  it("passthrough when no code", async () => {
    const svc = billingWithPromo(null);
    expect(await svc.previewCheckout(200000)).toEqual({ subtotal: 200000, discount: 0, total: 200000, offerType: null });
  });
  it("passthrough when code invalid/expired", async () => {
    const svc = billingWithPromo(null);
    expect(await svc.previewCheckout(200000, "BAD")).toEqual({ subtotal: 200000, discount: 0, total: 200000, offerType: null });
  });
  it("applies a valid percentage offer", async () => {
    const svc = billingWithPromo({ type: "percent", value: 10, maxDiscount: null });
    expect(await svc.previewCheckout(200000, "SAVE10")).toEqual({ subtotal: 200000, discount: 20000, total: 180000, offerType: "percent" });
  });
  it("respects maxDiscount cap", async () => {
    const svc = billingWithPromo({ type: "percent", value: 50, maxDiscount: 30000 });
    expect(await svc.previewCheckout(200000, "HALF")).toEqual({ subtotal: 200000, discount: 30000, total: 170000, offerType: "percent" });
  });
});
