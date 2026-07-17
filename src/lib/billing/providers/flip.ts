import type { PaymentProvider, ProviderCapabilities, PaymentIntent, PaymentIntentStatus, WebhookEvent } from "./types";
import { safeEqual } from "./signature";
import { parseFlipWebhook } from "./webhook-parsers";

// ---------------------------------------------------------------------------
// FlipProvider — first-class adapter (Flip is a PRIMARY provider, not optional)
// ---------------------------------------------------------------------------
// Webhook verified via a validation token in the payload vs FLIP_VALIDATION_TOKEN.
// Live charge requires configured credentials (wired in staging).
// ---------------------------------------------------------------------------

function unconfigured(): never {
  throw new Error("provider_not_configured: flip live charge requires staging credentials");
}

export class FlipProvider implements PaymentProvider {
  readonly key = "flip";

  capabilities(): ProviderCapabilities {
    return {
      methods: ["qris", "virtual_account", "bank_transfer"],
      supportsRefund: true,
      supportsCancel: true,
      supportsWebhook: true,
      mode: process.env.FLIP_MODE === "production" ? "production" : "sandbox",
    };
  }

  async createPayment(): Promise<PaymentIntent> {
    return unconfigured();
  }

  async getStatus(): Promise<PaymentIntentStatus> {
    return unconfigured();
  }

  async verifyWebhook(payload: unknown): Promise<boolean> {
    const token = process.env.FLIP_VALIDATION_TOKEN;
    if (!token) return false; // fail closed
    const p = (payload ?? {}) as Record<string, unknown>;
    const got = String(p.token ?? "");
    return got.length > 0 && safeEqual(got, token);
  }

  async processWebhook(payload: unknown): Promise<WebhookEvent> {
    return parseFlipWebhook((payload ?? {}) as Record<string, unknown>);
  }
}
