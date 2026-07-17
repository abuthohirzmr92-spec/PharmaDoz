import { describe, it, expect } from "vitest";
import { pickActiveSetting } from "@/lib/repositories/subscription-settings";
import { resolveFeatureKeys } from "@/lib/repositories/service-catalog";
import { resolveLimit, evaluateQuota } from "@/lib/repositories/quota";
import { collectRequiredDependencies } from "@/lib/features/resolver";

const NOW = "2026-07-12T00:00:00.000Z";

/* ─── SettingsRepository.pickActiveSetting ─── */
describe("pickActiveSetting", () => {
  it("picks the highest version among active rows", () => {
    const rows = [
      { version: 1, effective_from: "2026-01-01T00:00:00Z", effective_until: null, days: 30 },
      { version: 2, effective_from: "2026-06-01T00:00:00Z", effective_until: null, days: 14 },
    ];
    expect(pickActiveSetting(rows, NOW)?.days).toBe(14);
  });

  it("excludes rows whose effective_from is in the future", () => {
    const rows = [
      { version: 1, effective_from: "2026-01-01T00:00:00Z", effective_until: null, days: 30 },
      { version: 2, effective_from: "2026-09-01T00:00:00Z", effective_until: null, days: 14 },
    ];
    expect(pickActiveSetting(rows, NOW)?.days).toBe(30);
  });

  it("excludes rows past their effective_until", () => {
    const rows = [
      { version: 3, effective_from: "2026-01-01T00:00:00Z", effective_until: "2026-06-30T00:00:00Z", days: 60 },
    ];
    expect(pickActiveSetting(rows, NOW)).toBeNull();
  });

  it("returns null when there are no rows", () => {
    expect(pickActiveSetting([], NOW)).toBeNull();
  });
});

/* ─── ServiceCatalogRepository.resolveFeatureKeys ─── */
describe("resolveFeatureKeys", () => {
  it("returns only features of enabled services", () => {
    const sf = [
      { service_key: "inventory", feature_key: "inventory.fefo" },
      { service_key: "inventory", feature_key: "inventory.batch" },
      { service_key: "ai", feature_key: "ai.ocr" },
    ];
    expect(resolveFeatureKeys(["inventory"], sf).sort()).toEqual(["inventory.batch", "inventory.fefo"]);
  });

  it("returns [] when no services enabled", () => {
    expect(resolveFeatureKeys([], [{ service_key: "ai", feature_key: "ai.ocr" }])).toEqual([]);
  });
});

/* ─── FeatureResolver.collectRequiredDependencies ─── */
describe("collectRequiredDependencies", () => {
  const edges = [
    { feature_key: "ai.ocr", requires_feature_key: "ai.assistant", dependency_type: "required" },
    { feature_key: "ai.ocr", requires_feature_key: "integration.api", dependency_type: "required" },
    { feature_key: "ai.assistant", requires_feature_key: "reports.executive", dependency_type: "required" },
    { feature_key: "ai.ocr", requires_feature_key: "backup.automatic", dependency_type: "optional" },
  ];

  it("resolves transitive required deps", () => {
    expect(collectRequiredDependencies("ai.ocr", edges).sort()).toEqual(
      ["ai.assistant", "integration.api", "reports.executive"].sort(),
    );
  });

  it("excludes optional deps", () => {
    expect(collectRequiredDependencies("ai.ocr", edges)).not.toContain("backup.automatic");
  });

  it("is circular-safe", () => {
    const cyc = [
      { feature_key: "a", requires_feature_key: "b", dependency_type: "required" },
      { feature_key: "b", requires_feature_key: "a", dependency_type: "required" },
    ];
    expect(collectRequiredDependencies("a", cyc).sort()).toEqual(["a", "b"]);
  });

  it("returns [] when feature has no deps", () => {
    expect(collectRequiredDependencies("standalone", edges)).toEqual([]);
  });
});

/* ─── QuotaRepository.resolveLimit (dual-source) ─── */
describe("resolveLimit (dual-source order)", () => {
  it("override wins over everything", () => {
    expect(resolveLimit(20, 10, 3)).toBe(20);
  });
  it("resource_limits used when no override", () => {
    expect(resolveLimit(null, 10, 3)).toBe(10);
  });
  it("legacy max_* used when resource_limits absent", () => {
    expect(resolveLimit(null, null, 3)).toBe(3);
  });
  it("null (unlimited) when nothing set", () => {
    expect(resolveLimit(null, null, null)).toBeNull();
  });
  it("respects 0 as a real limit (not falsy-skipped)", () => {
    expect(resolveLimit(null, 0, 3)).toBe(0);
  });
});

/* ─── QuotaRepository.evaluateQuota ─── */
describe("evaluateQuota", () => {
  it("allows below limit", () => {
    expect(evaluateQuota("users", 8, 10).allowed).toBe(true);
  });
  it("blocks at the boundary (current+delta > max)", () => {
    expect(evaluateQuota("users", 10, 10).allowed).toBe(false);
  });
  it("allows exactly reaching the limit", () => {
    expect(evaluateQuota("users", 9, 10).allowed).toBe(true);
  });
  it("treats null max as unlimited", () => {
    const r = evaluateQuota("api_calls_monthly", 999999, null);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBeNull();
  });
  it("computes remaining", () => {
    expect(evaluateQuota("branches", 2, 5, 0).remaining).toBe(3);
  });
});
