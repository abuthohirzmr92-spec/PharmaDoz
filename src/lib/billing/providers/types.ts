// ---------------------------------------------------------------------------
// Payment Provider contract (provider-neutral)
// ---------------------------------------------------------------------------
// The single interface every gateway plugin implements. BillingService depends
// ONLY on this interface (via PaymentProviderManager) and never on a concrete
// provider. Providers move money; they never calculate it (Money Rule).
//
// Provider ≠ Payment Method: a provider EXPOSES methods (QRIS, VA, e-wallet,
// card, …); method availability is a provider capability.
// ---------------------------------------------------------------------------

export type PaymentMethod = string; // 'qris' | 'va' | 'bank_transfer' | 'gopay' | 'credit_card' | 'manual_transfer' | ...

export type PaymentIntentStatus = "pending" | "success" | "failed" | "expired";

export interface ProviderCapabilities {
  methods: PaymentMethod[];
  supportsRefund: boolean;
  supportsCancel: boolean;
  supportsWebhook: boolean;
  mode: "sandbox" | "production";
}

export interface CreatePaymentInput {
  invoiceId: string;
  amount: number;          // computed by BillingService (Money Rule)
  currency: string;        // supplied per Currency Policy
  method?: PaymentMethod;
  description?: string;
}

export interface PaymentIntent {
  providerKey: string;
  reference: string;             // provider transaction reference
  status: PaymentIntentStatus;
  redirectUrl?: string | null;
  raw?: unknown;
}

export interface WebhookEvent {
  verified: boolean;
  reference: string | null;
  status: PaymentIntentStatus | null;
  invoiceId?: string | null;
}

export interface PaymentProvider {
  readonly key: string;

  /** Capability discovery — methods + refund/cancel/webhook support + mode. */
  capabilities(): ProviderCapabilities;

  /** Create a payment for an invoice (amount/currency come from BillingService). */
  createPayment(input: CreatePaymentInput): Promise<PaymentIntent>;

  /** Look up the current status of a payment by provider reference. */
  getStatus(reference: string): Promise<PaymentIntentStatus>;

  /** Verify an incoming webhook's authenticity (signature/secret). */
  verifyWebhook(payload: unknown, headers: Record<string, string>): Promise<boolean>;

  /** Parse a verified webhook into a normalized event. */
  processWebhook(payload: unknown): Promise<WebhookEvent>;

  /** Optional: cancel a pending payment (when supported). */
  cancel?(reference: string): Promise<boolean>;

  /** Optional: refund a captured payment (amount set by BillingService). */
  refund?(reference: string, amount: number): Promise<boolean>;
}
