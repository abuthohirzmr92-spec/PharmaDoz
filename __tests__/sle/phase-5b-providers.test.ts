import { describe, it, expect } from "vitest";
import { decideRetry } from "@/lib/billing/retry-engine";
import {
  PaymentProviderRegistry,
  pickActiveProviderKey,
} from "@/lib/billing/providers/registry";
import { ManualProvider } from "@/lib/billing/providers/manual-provider";
import { PaymentProviderManager } from "@/lib/billing/providers/manager";
import type { PaymentProvider } from "@/lib/billing/providers/types";

/* ─── Retry Engine ─── */
describe("decideRetry", () => {
  const backoff = [24, 72, 168];
  it("retries with escalating waits", () => {
    expect(decideRetry(1, backoff)).toEqual({ action: "retry", waitHours: 24 });
    expect(decideRetry(2, backoff)).toEqual({ action: "retry", waitHours: 72 });
    expect(decideRetry(3, backoff)).toEqual({ action: "retry", waitHours: 168 });
  });
  it("escalates to manual review when exhausted", () => {
    expect(decideRetry(4, backoff)).toEqual({ action: "manual_review" });
  });
});

/* ─── Provider Registry ─── */
describe("PaymentProviderRegistry", () => {
  it("registers and retrieves providers", () => {
    const reg = new PaymentProviderRegistry();
    reg.register(new ManualProvider());
    expect(reg.has("manual")).toBe(true);
    expect(reg.get("manual")?.key).toBe("manual");
    expect(reg.keys()).toContain("manual");
  });
});

describe("pickActiveProviderKey", () => {
  it("picks the first active key that is registered (priority order)", () => {
    expect(pickActiveProviderKey(["midtrans", "flip", "manual"], ["manual", "flip"])).toBe("flip");
  });
  it("returns null when none are registered", () => {
    expect(pickActiveProviderKey(["midtrans"], ["manual"])).toBeNull();
  });
});

/* ─── ManualProvider capabilities (provider ≠ method) ─── */
describe("ManualProvider", () => {
  it("advertises capabilities and methods", () => {
    const caps = new ManualProvider().capabilities();
    expect(caps.methods).toEqual(["manual_transfer"]);
    expect(caps.supportsWebhook).toBe(false);
    expect(caps.supportsCancel).toBe(true);
  });
  it("creates a pending manual intent", async () => {
    const intent = await new ManualProvider().createPayment({ invoiceId: "inv1", amount: 100000, currency: "IDR" });
    expect(intent).toMatchObject({ providerKey: "manual", reference: "MANUAL-inv1", status: "pending" });
  });
});

/* ─── PaymentProviderManager (selection via injected registry + settings) ─── */
describe("PaymentProviderManager", () => {
  const fakeProvider = (key: string): PaymentProvider => ({
    key,
    capabilities: () => ({ methods: [], supportsRefund: false, supportsCancel: false, supportsWebhook: true, mode: "sandbox" }),
    createPayment: async () => ({ providerKey: key, reference: "r", status: "pending" }),
    getStatus: async () => "pending",
    verifyWebhook: async () => true,
    processWebhook: async () => ({ verified: true, reference: "r", status: "success" }),
  });

  it("selects the configured active provider", async () => {
    const reg = new PaymentProviderRegistry();
    reg.register(fakeProvider("flip"));
    reg.register(new ManualProvider());
    const settings = { getStringArray: async () => ["flip", "manual"] } as never;
    const mgr = new PaymentProviderManager(reg, settings);
    expect((await mgr.getActiveProvider()).key).toBe("flip");
  });

  it("falls back to manual when configured providers are not registered", async () => {
    const reg = new PaymentProviderRegistry();
    reg.register(new ManualProvider());
    const settings = { getStringArray: async () => ["midtrans"] } as never;
    const mgr = new PaymentProviderManager(reg, settings);
    expect((await mgr.getActiveProvider()).key).toBe("manual");
  });

  it("getProvider throws for an unknown key", () => {
    const reg = new PaymentProviderRegistry();
    reg.register(new ManualProvider());
    const mgr = new PaymentProviderManager(reg, { getStringArray: async () => [] } as never);
    expect(() => mgr.getProvider("nope")).toThrow(/unknown payment provider/i);
  });
});
