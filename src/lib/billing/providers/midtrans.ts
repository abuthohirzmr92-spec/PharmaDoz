import type { PaymentProvider, ProviderCapabilities, PaymentIntent, PaymentIntentStatus, WebhookEvent } from "./types";
import { midtransSignature, safeEqual } from "./signature";
import { parseMidtransWebhook } from "./webhook-parsers";

// ---------------------------------------------------------------------------
// MidtransProvider — first-class adapter
// ---------------------------------------------------------------------------
// Webhook verification + parsing are implemented. Live charge (createPayment /
// getStatus) requires configured credentials and is wired in staging; without
// them it throws `provider_not_configured` (never fabricates a charge).
// Money Rule: receives amount/currency; never calculates money.
// ---------------------------------------------------------------------------

function unconfigured(): never {
  throw new Error("provider_not_configured: midtrans live charge requires staging credentials");
}

export class MidtransProvider implements PaymentProvider {
  readonly key = "midtrans";

  capabilities(): ProviderCapabilities {
    return {
      methods: ["qris", "virtual_account", "gopay", "credit_card"],
      supportsRefund: true,
      supportsCancel: true,
      supportsWebhook: true,
      mode: process.env.MIDTRANS_MODE === "production" ? "production" : "sandbox",
    };
  }

  async createPayment(): Promise<PaymentIntent> {
    return unconfigured();
  }

  async getStatus(): Promise<PaymentIntentStatus> {
    return unconfigured();
  }

  async verifyWebhook(payload: unknown): Promise<boolean> {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) return false; // fail closed
    const p = (payload ?? {}) as Record<string, unknown>;
    const orderId = String(p.order_id ?? "");
    const statusCode = String(p.status_code ?? "");
    const gross = String(p.gross_amount ?? "");
    const sig = String(p.signature_key ?? "");
    if (!orderId || !sig) return false;
    return safeEqual(midtransSignature(orderId, statusCode, gross, serverKey), sig);
  }

  async processWebhook(payload: unknown): Promise<WebhookEvent> {
    return parseMidtransWebhook((payload ?? {}) as Record<string, unknown>);
  }
}
