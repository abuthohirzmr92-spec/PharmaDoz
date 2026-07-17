import { describe, it, expect } from "vitest";
import { resolveGrantedCapabilities } from "@/lib/repositories/addon";
import { isPromotionValid } from "@/lib/repositories/promotion";
import { isReminderDue } from "@/lib/repositories/reminder";
import { groupIntegrationsByCategory } from "@/lib/repositories/integration-registry";
import { isTerminalRunStatus } from "@/lib/repositories/scheduler-run";

const NOW = "2026-07-12T00:00:00.000Z";

/* ─── AddonRepository.resolveGrantedCapabilities ─── */
describe("resolveGrantedCapabilities", () => {
  it("folds grants into feature/service/quota buckets", () => {
    const grants = [
      { grant_type: "feature", grant_key: "ai.ocr", grant_value: null },
      { grant_type: "service", grant_key: "integration", grant_value: null },
      { grant_type: "quota_increment", grant_key: "storage_mb", grant_value: { storage_mb: 5000 } },
    ];
    expect(resolveGrantedCapabilities(grants)).toEqual({
      features: ["ai.ocr"],
      services: ["integration"],
      quotas: { storage_mb: 5000 },
    });
  });

  it("ignores non-numeric quota values", () => {
    const grants = [{ grant_type: "quota_increment", grant_key: "storage_mb", grant_value: { storage_mb: "lots" } }];
    expect(resolveGrantedCapabilities(grants).quotas).toEqual({});
  });
});

/* ─── PromotionRepository.isPromotionValid ─── */
describe("isPromotionValid", () => {
  const base = { is_active: true, valid_from: null, valid_to: null, max_redemptions: null, redeemed_count: 0 };
  it("valid when active, in window, redemptions left", () => {
    expect(isPromotionValid(base, NOW)).toBe(true);
  });
  it("invalid when inactive", () => {
    expect(isPromotionValid({ ...base, is_active: false }, NOW)).toBe(false);
  });
  it("invalid before valid_from", () => {
    expect(isPromotionValid({ ...base, valid_from: "2026-09-01T00:00:00Z" }, NOW)).toBe(false);
  });
  it("invalid after valid_to", () => {
    expect(isPromotionValid({ ...base, valid_to: "2026-06-01T00:00:00Z" }, NOW)).toBe(false);
  });
  it("invalid when redemptions exhausted", () => {
    expect(isPromotionValid({ ...base, max_redemptions: 5, redeemed_count: 5 }, NOW)).toBe(false);
  });
});

/* ─── ReminderRepository.isReminderDue ─── */
describe("isReminderDue", () => {
  it("due when pending and scheduled in the past", () => {
    expect(isReminderDue({ status: "pending", scheduled_for: "2026-07-11T00:00:00Z" }, NOW)).toBe(true);
  });
  it("due when retrying and scheduled now", () => {
    expect(isReminderDue({ status: "retrying", scheduled_for: NOW }, NOW)).toBe(true);
  });
  it("not due when scheduled in the future", () => {
    expect(isReminderDue({ status: "pending", scheduled_for: "2026-07-13T00:00:00Z" }, NOW)).toBe(false);
  });
  it("not due when already sent", () => {
    expect(isReminderDue({ status: "sent", scheduled_for: "2026-01-01T00:00:00Z" }, NOW)).toBe(false);
  });
});

/* ─── IntegrationRegistryRepository.groupIntegrationsByCategory ─── */
describe("groupIntegrationsByCategory", () => {
  it("groups by category", () => {
    const items = [
      { category: "payment", integrationKey: "midtrans" },
      { category: "payment", integrationKey: "xendit" },
      { category: "messaging", integrationKey: "whatsapp" },
    ];
    const grouped = groupIntegrationsByCategory(items);
    expect(grouped.payment?.length).toBe(2);
    expect(grouped.messaging?.length).toBe(1);
  });
  it("returns {} for empty input", () => {
    expect(groupIntegrationsByCategory([])).toEqual({});
  });
});

/* ─── SchedulerRunRepository.isTerminalRunStatus ─── */
describe("isTerminalRunStatus", () => {
  it("completed/failed are terminal", () => {
    expect(isTerminalRunStatus("completed")).toBe(true);
    expect(isTerminalRunStatus("failed")).toBe(true);
  });
  it("running is not terminal", () => {
    expect(isTerminalRunStatus("running")).toBe(false);
  });
});
