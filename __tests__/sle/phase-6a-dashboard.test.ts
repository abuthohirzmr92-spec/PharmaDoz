import { describe, it, expect } from "vitest";
import { deriveNextAction } from "@/lib/subscription/next-action";
import { statusDisplay } from "@/lib/subscription/status-display";

/* ─── deriveNextAction (ViewModel helper — priority order) ─── */
describe("deriveNextAction", () => {
  const base = { lifecycleState: "active", daysRemaining: 30, hasOverdueInvoice: false, quotaNearLimit: false };

  it("overdue invoice wins over everything", () => {
    const a = deriveNextAction({ ...base, hasOverdueInvoice: true });
    expect(a.kind).toBe("pay_overdue");
    expect(a.tone).toBe("danger");
    expect(a.cta).toBe("Bayar Sekarang");
  });
  it("grace/read_only → pay_grace", () => {
    expect(deriveNextAction({ ...base, lifecycleState: "grace_period" }).kind).toBe("pay_grace");
    expect(deriveNextAction({ ...base, lifecycleState: "read_only" }).kind).toBe("pay_grace");
  });
  it("trial expiring within 1 day → trial_expiring", () => {
    expect(deriveNextAction({ ...base, lifecycleState: "trial_active", daysRemaining: 1 }).kind).toBe("trial_expiring");
    expect(deriveNextAction({ ...base, lifecycleState: "trial_active", daysRemaining: 0 }).message).toMatch(/hari ini/);
  });
  it("active renew within 5 days → renew_soon", () => {
    expect(deriveNextAction({ ...base, daysRemaining: 3 }).kind).toBe("renew_soon");
  });
  it("quota near limit → upgrade_recommended", () => {
    expect(deriveNextAction({ ...base, quotaNearLimit: true }).kind).toBe("upgrade_recommended");
  });
  it("healthy → none, positive tone, no CTA", () => {
    const a = deriveNextAction(base);
    expect(a.kind).toBe("none");
    expect(a.tone).toBe("success");
    expect(a.cta).toBeNull();
    expect(a.href).toBeNull();
  });
  it("priority: overdue beats trial expiring", () => {
    expect(deriveNextAction({ lifecycleState: "trial_active", daysRemaining: 0, hasOverdueInvoice: true, quotaNearLimit: true }).kind).toBe("pay_overdue");
  });
});

/* ─── statusDisplay (accessibility: color + icon + text) ─── */
describe("statusDisplay", () => {
  it("maps lifecycle states to icon + label + tone", () => {
    expect(statusDisplay("active")).toEqual({ label: "Aktif", icon: "🟢", tone: "success" });
    expect(statusDisplay("trial_active")).toEqual({ label: "Trial", icon: "⚪", tone: "info" });
    expect(statusDisplay("grace_period")).toEqual({ label: "Masa Tenggang", icon: "🟡", tone: "warning" });
    expect(statusDisplay("read_only").tone).toBe("warning");
    expect(statusDisplay("suspended")).toEqual({ label: "Ditangguhkan", icon: "🔴", tone: "danger" });
    expect(statusDisplay("terminated").tone).toBe("neutral");
  });
  it("always returns icon + label + tone (never color alone)", () => {
    const d = statusDisplay(null);
    expect(d.icon).toBeTruthy();
    expect(d.label).toBeTruthy();
    expect(d.tone).toBeTruthy();
  });
});
