import type {
  PaymentProvider,
  ProviderCapabilities,
  CreatePaymentInput,
  PaymentIntent,
  PaymentIntentStatus,
  WebhookEvent,
} from "./types";

// ---------------------------------------------------------------------------
// ManualProvider — offline/manual payment (no gateway, admin confirms)
// ---------------------------------------------------------------------------
// First-class provider. Creates a "pending" manual payment reference; status
// stays pending until a super-admin manually confirms via BillingService.
// No webhooks. Does not calculate money.
// ---------------------------------------------------------------------------

export class ManualProvider implements PaymentProvider {
  readonly key = "manual";

  capabilities(): ProviderCapabilities {
    return {
      methods: ["manual_transfer"],
      supportsRefund: false,
      supportsCancel: true,
      supportsWebhook: false,
      mode: "production",
    };
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentIntent> {
    return {
      providerKey: this.key,
      reference: `MANUAL-${input.invoiceId}`,
      status: "pending",
      redirectUrl: null,
    };
  }

  async getStatus(): Promise<PaymentIntentStatus> {
    return "pending"; // manual — awaits admin confirmation
  }

  async verifyWebhook(): Promise<boolean> {
    return false; // no webhooks
  }

  async processWebhook(): Promise<WebhookEvent> {
    return { verified: false, reference: null, status: null };
  }

  async cancel(): Promise<boolean> {
    return true;
  }
}
