import type { PaymentProvider, ProviderCapabilities, PaymentIntent, PaymentIntentStatus, WebhookEvent } from "./types";
import { safeEqual } from "./signature";
import { parseXenditWebhook } from "./webhook-parsers";

// ---------------------------------------------------------------------------
// XenditProvider — first-class adapter
// ---------------------------------------------------------------------------
// Webhook verified via the `x-callback-token` header vs XENDIT_CALLBACK_TOKEN.
// Live charge requires configured credentials (wired in staging).
// ---------------------------------------------------------------------------

function unconfigured(): never {
  throw new Error("provider_not_configured: xendit live charge requires staging credentials");
}

export class XenditProvider implements PaymentProvider {
  readonly key = "xendit";

  capabilities(): ProviderCapabilities {
    return {
      methods: ["qris", "virtual_account", "retail_outlet"],
      supportsRefund: true,
      supportsCancel: true,
      supportsWebhook: true,
      mode: process.env.XENDIT_MODE === "production" ? "production" : "sandbox",
    };
  }

  async createPayment(): Promise<PaymentIntent> {
    return unconfigured();
  }

  async getStatus(): Promise<PaymentIntentStatus> {
    return unconfigured();
  }

  async verifyWebhook(_payload: unknown, headers: Record<string, string>): Promise<boolean> {
    const token = process.env.XENDIT_CALLBACK_TOKEN;
    if (!token) return false; // fail closed
    const got = headers["x-callback-token"] ?? "";
    return got.length > 0 && safeEqual(got, token);
  }

  async processWebhook(payload: unknown): Promise<WebhookEvent> {
    return parseXenditWebhook((payload ?? {}) as Record<string, unknown>);
  }
}
