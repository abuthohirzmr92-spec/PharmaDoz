// ---------------------------------------------------------------------------
// Payment Gateway Interface — Billing Readiness (Agent F)
// ---------------------------------------------------------------------------
// This abstraction layer prepares Medisync for payment gateway integration
// (Midtrans, Xendit, Stripe, etc.) without implementing any actual gateway.
//
// Current implementation:
//   - ManualGateway: records manual invoices (offline payment tracking)
//
// Future:
//   - class MidtransGateway implements PaymentGateway { ... }
//   - class XenditGateway implements PaymentGateway { ... }
//   - Configure via tenants.settings.payment_gateway or env var
// ---------------------------------------------------------------------------

export interface InvoiceData {
  tenantId: string;
  subscriptionId?: string | null;
  amount: number;
  currency?: string;
  description?: string;
  dueDate?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  redirectUrl?: string;
  error?: string;
}

export interface WebhookResult {
  acknowledged: boolean;
  event: string;
  invoiceId?: string;
  status?: string;
}

// ---------------------------------------------------------------------------
// Payment Gateway Interface
// ---------------------------------------------------------------------------

export interface PaymentGateway {
  /** Create an invoice for a tenant subscription */
  createInvoice(data: InvoiceData): Promise<PaymentResult>;

  /** Process a payment for an existing invoice */
  processPayment(invoiceId: string, method: string): Promise<PaymentResult>;

  /** Handle incoming webhook from payment provider */
  handleWebhook(payload: unknown): Promise<WebhookResult>;

  /** Get payment status for an invoice */
  getPaymentStatus(invoiceId: string): Promise<string>;

  /** Generate a unique invoice number */
  generateInvoiceNumber(): string;
}

// ---------------------------------------------------------------------------
// Manual Gateway — Records invoices without actual payment processing
// ---------------------------------------------------------------------------

let invoiceCounter = 0;

export class ManualGateway implements PaymentGateway {
  private prefix = "INV";

  generateInvoiceNumber(): string {
    invoiceCounter++;
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const seq = String(invoiceCounter).padStart(4, "0");
    return `${this.prefix}-${date}-${seq}`;
  }

  async createInvoice(data: InvoiceData): Promise<PaymentResult> {
    const { packageRepo } = await import("@/lib/repository-instances");
    const invoice = await packageRepo.createInvoice({
      tenantId: data.tenantId,
      subscriptionId: data.subscriptionId ?? null,
      invoiceNumber: this.generateInvoiceNumber(),
      amount: data.amount,
      currency: data.currency ?? "IDR",
      dueDate: data.dueDate ?? null,
      notes: data.description ?? null,
    });

    return {
      success: true,
      transactionId: invoice.id,
    };
  }

  async processPayment(invoiceId: string, method: string): Promise<PaymentResult> {
    const { packageRepo } = await import("@/lib/repository-instances");
    await packageRepo.updateInvoiceStatus(invoiceId, "paid", method);

    return {
      success: true,
      transactionId: invoiceId,
    };
  }

  async handleWebhook(_payload: unknown): Promise<WebhookResult> {
    return { acknowledged: true, event: "ignored", status: "manual_gateway_no_webhooks" };
  }

  async getPaymentStatus(invoiceId: string): Promise<string> {
    return "manual"; // Manual gateway — admin must manually confirm payments
  }
}

// ---------------------------------------------------------------------------
// Singleton factory — returns the configured gateway
// ---------------------------------------------------------------------------

let _gateway: PaymentGateway | null = null;

export function getPaymentGateway(): PaymentGateway {
  if (!_gateway) {
    // Future: read payment gateway config from env or tenant settings
    // const provider = process.env.PAYMENT_GATEWAY ?? "manual";
    // if (provider === "midtrans") _gateway = new MidtransGateway();
    // else if (provider === "xendit") _gateway = new XenditGateway();
    // else _gateway = new ManualGateway();
    _gateway = new ManualGateway();
  }
  return _gateway;
}
