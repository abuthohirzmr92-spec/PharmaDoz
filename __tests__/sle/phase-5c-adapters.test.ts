import { describe, it, expect } from "vitest";
import {
  parseMidtransWebhook, mapMidtransStatus,
  parseXenditWebhook, mapXenditStatus,
  parseFlipWebhook, mapFlipStatus,
} from "@/lib/billing/providers/webhook-parsers";
import { midtransSignature, safeEqual } from "@/lib/billing/providers/signature";
import { paymentProviderRegistry } from "@/lib/billing/providers/registry";
import { MidtransProvider } from "@/lib/billing/providers/midtrans";
import { FlipProvider } from "@/lib/billing/providers/flip";
import { XenditProvider } from "@/lib/billing/providers/xendit";

/* ─── status mappers ─── */
describe("status mappers", () => {
  it("midtrans", () => {
    expect(mapMidtransStatus("settlement")).toBe("success");
    expect(mapMidtransStatus("capture")).toBe("success");
    expect(mapMidtransStatus("pending")).toBe("pending");
    expect(mapMidtransStatus("expire")).toBe("expired");
    expect(mapMidtransStatus("deny")).toBe("failed");
  });
  it("xendit", () => {
    expect(mapXenditStatus("PAID")).toBe("success");
    expect(mapXenditStatus("EXPIRED")).toBe("expired");
  });
  it("flip", () => {
    expect(mapFlipStatus("SUCCESSFUL")).toBe("success");
    expect(mapFlipStatus("FAILED")).toBe("failed");
  });
});

/* ─── parsers ─── */
describe("webhook parsers", () => {
  it("parses midtrans", () => {
    expect(parseMidtransWebhook({ order_id: "INV-1", transaction_status: "settlement" }))
      .toEqual({ verified: false, reference: "INV-1", status: "success", invoiceId: "INV-1" });
  });
  it("parses xendit", () => {
    expect(parseXenditWebhook({ id: "xnd_1", external_id: "INV-2", status: "PAID" }))
      .toEqual({ verified: false, reference: "xnd_1", status: "success", invoiceId: "INV-2" });
  });
  it("parses flip", () => {
    expect(parseFlipWebhook({ id: 123, bill_link_id: "INV-3", status: "SUCCESSFUL" }))
      .toEqual({ verified: false, reference: "123", status: "success", invoiceId: "INV-3" });
  });
});

/* ─── signature ─── */
describe("signature", () => {
  it("safeEqual matches equal strings and rejects others", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
  it("midtransSignature is deterministic sha512", () => {
    const sig = midtransSignature("INV-1", "200", "100000.00", "server-key");
    expect(sig).toHaveLength(128); // sha512 hex
    expect(sig).toBe(midtransSignature("INV-1", "200", "100000.00", "server-key"));
  });
});

/* ─── registry has all first-class providers ─── */
describe("registry first-class providers", () => {
  it("contains manual, flip, midtrans, xendit", () => {
    for (const key of ["manual", "flip", "midtrans", "xendit"]) {
      expect(paymentProviderRegistry.has(key)).toBe(true);
    }
  });
});

/* ─── verifyWebhook fails closed without config ─── */
describe("verifyWebhook fail-closed", () => {
  it("midtrans returns false without MIDTRANS_SERVER_KEY", async () => {
    const saved = process.env.MIDTRANS_SERVER_KEY;
    delete process.env.MIDTRANS_SERVER_KEY;
    try {
      expect(await new MidtransProvider().verifyWebhook({ order_id: "x", signature_key: "y" })).toBe(false);
    } finally {
      if (saved !== undefined) process.env.MIDTRANS_SERVER_KEY = saved;
    }
  });
  it("xendit returns false without XENDIT_CALLBACK_TOKEN", async () => {
    const saved = process.env.XENDIT_CALLBACK_TOKEN;
    delete process.env.XENDIT_CALLBACK_TOKEN;
    try {
      expect(await new XenditProvider().verifyWebhook({}, { "x-callback-token": "z" })).toBe(false);
    } finally {
      if (saved !== undefined) process.env.XENDIT_CALLBACK_TOKEN = saved;
    }
  });
  it("flip returns false without FLIP_VALIDATION_TOKEN", async () => {
    const saved = process.env.FLIP_VALIDATION_TOKEN;
    delete process.env.FLIP_VALIDATION_TOKEN;
    try {
      expect(await new FlipProvider().verifyWebhook({ token: "t" })).toBe(false);
    } finally {
      if (saved !== undefined) process.env.FLIP_VALIDATION_TOKEN = saved;
    }
  });
});

/* ─── capabilities (provider ≠ method) ─── */
describe("capabilities", () => {
  it("declare provider-specific methods", () => {
    expect(new MidtransProvider().capabilities().methods).toContain("gopay");
    expect(new FlipProvider().capabilities().methods).toContain("bank_transfer");
    expect(new XenditProvider().capabilities().methods).toContain("retail_outlet");
  });
});
