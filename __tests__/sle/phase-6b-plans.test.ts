import { describe, it, expect } from "vitest";
import { buildComparisonMatrix, recommendUpgrade, type PackageLite } from "@/lib/subscription/plan-compare";
import { computeUpgradeQuote } from "@/lib/billing/calc";

const PKG = (id: string, price: number, features: Record<string, boolean>): PackageLite => ({
  id, name: id, label: id, monthlyPrice: price, maxUsers: 5, maxBranches: 1, maxProducts: 200, features,
});

/* ─── buildComparisonMatrix ─── */
describe("buildComparisonMatrix", () => {
  it("produces feature × package cells", () => {
    const pkgs = [
      { id: "basic", features: { "inventory.fefo": false, "ai.ocr": false } },
      { id: "ent", features: { "inventory.fefo": true, "ai.ocr": true } },
    ];
    const rows = buildComparisonMatrix(["inventory.fefo", "ai.ocr"], { "inventory.fefo": "FEFO", "ai.ocr": "OCR" }, pkgs);
    expect(rows[0]).toEqual({ featureKey: "inventory.fefo", label: "FEFO", cells: [{ packageId: "basic", enabled: false }, { packageId: "ent", enabled: true }] });
    expect(rows[1]?.cells[1]?.enabled).toBe(true);
  });
  it("uses feature key when no label", () => {
    const rows = buildComparisonMatrix(["x.y"], {}, [{ id: "p", features: {} }]);
    expect(rows[0]?.label).toBe("x.y");
  });
});

/* ─── recommendUpgrade ─── */
describe("recommendUpgrade", () => {
  const packages = [PKG("basic", 0, {}), PKG("pro", 299000, {}), PKG("ent", 999000, {})];
  it("recommends the cheapest higher package when near a limit", () => {
    const usage = [{ resource: "users", current: 9, max: 10 }];
    expect(recommendUpgrade(0, usage, packages)).toBe("pro");
  });
  it("returns null when not near any limit", () => {
    const usage = [{ resource: "users", current: 3, max: 10 }];
    expect(recommendUpgrade(0, usage, packages)).toBeNull();
  });
  it("returns null when already on the top package", () => {
    const usage = [{ resource: "users", current: 50, max: 50 }];
    expect(recommendUpgrade(999000, usage, packages)).toBeNull();
  });
  it("ignores unlimited resources", () => {
    const usage = [{ resource: "api", current: 999999, max: null }];
    expect(recommendUpgrade(0, usage, packages)).toBeNull();
  });
});

/* ─── computeUpgradeQuote (Money layer) ─── */
describe("computeUpgradeQuote", () => {
  it("prorates the price delta, no promo", () => {
    // (300k - 100k) * 15/30 = 100k
    expect(computeUpgradeQuote(100000, 300000, 15, 30)).toEqual({ proration: 100000, discount: 0, total: 100000 });
  });
  it("applies a percentage promo to the proration", () => {
    const q = computeUpgradeQuote(100000, 300000, 15, 30, { type: "percent", value: 10 });
    expect(q).toEqual({ proration: 100000, discount: 10000, total: 90000 });
  });
  it("zero proration for a downgrade", () => {
    expect(computeUpgradeQuote(300000, 100000, 15, 30).proration).toBe(0);
  });
});
