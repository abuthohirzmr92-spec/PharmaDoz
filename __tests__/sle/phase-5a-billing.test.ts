import { describe, it, expect } from "vitest";
import {
  computeProration,
  applyDiscount,
  computeOutstanding,
  nextRetryHours,
  round2,
} from "@/lib/billing/calc";

/* ─── computeProration ─── */
describe("computeProration", () => {
  it("charges the price delta for the remaining fraction", () => {
    // old 100k, new 300k, 15/30 days remaining → (300k-100k)*0.5 = 100k
    expect(computeProration(100000, 300000, 15, 30)).toBe(100000);
  });
  it("is zero when downgrading (no refund produced here)", () => {
    expect(computeProration(300000, 100000, 15, 30)).toBe(0);
  });
  it("is zero at period end (no days remaining)", () => {
    expect(computeProration(100000, 300000, 0, 30)).toBe(0);
  });
  it("handles a zero-length period safely", () => {
    expect(computeProration(100000, 300000, 5, 0)).toBe(0);
  });
});

/* ─── applyDiscount ─── */
describe("applyDiscount", () => {
  it("applies a percentage", () => {
    expect(applyDiscount(200000, { type: "percent", value: 10 })).toEqual({ discount: 20000, total: 180000 });
  });
  it("caps a percentage at maxDiscount", () => {
    expect(applyDiscount(200000, { type: "percent", value: 50, maxDiscount: 30000 })).toEqual({ discount: 30000, total: 170000 });
  });
  it("applies a fixed amount", () => {
    expect(applyDiscount(200000, { type: "fixed", value: 25000 })).toEqual({ discount: 25000, total: 175000 });
  });
  it("never discounts more than the amount", () => {
    expect(applyDiscount(10000, { type: "fixed", value: 99999 })).toEqual({ discount: 10000, total: 0 });
  });
  it("trial_extension is money-neutral", () => {
    expect(applyDiscount(200000, { type: "trial_extension", value: 7 })).toEqual({ discount: 0, total: 200000 });
  });
});

/* ─── computeOutstanding ─── */
describe("computeOutstanding", () => {
  it("returns total minus paid", () => {
    expect(computeOutstanding(200000, 50000)).toBe(150000);
  });
  it("never goes negative", () => {
    expect(computeOutstanding(200000, 250000)).toBe(0);
  });
});

/* ─── nextRetryHours ─── */
describe("nextRetryHours", () => {
  const backoff = [24, 72, 168];
  it("escalates by attempt", () => {
    expect(nextRetryHours(1, backoff)).toBe(24);
    expect(nextRetryHours(2, backoff)).toBe(72);
    expect(nextRetryHours(3, backoff)).toBe(168);
  });
  it("returns null when exhausted (→ manual review)", () => {
    expect(nextRetryHours(4, backoff)).toBeNull();
    expect(nextRetryHours(0, backoff)).toBeNull();
  });
});

/* ─── round2 ─── */
describe("round2", () => {
  it("rounds to 2 decimals", () => {
    expect(round2(10.005)).toBe(10.01);
    expect(round2(10.004)).toBe(10);
  });
});
