import { invoiceRepo as defaultInvoiceRepo, paymentRepo as defaultPaymentRepo, subscriptionRepo as defaultSubscriptionRepo, promotionRepo as defaultPromotionRepo, packageRepo } from "@/lib/repository-instances";
import type { InvoiceRepository } from "@/lib/repositories/invoice";
import type { PaymentRepository, PaymentStatus } from "@/lib/repositories/payment";
import type { SubscriptionRepository } from "@/lib/repositories/subscription";
import type { PromotionRepository } from "@/lib/repositories/promotion";
import { subscriptionLifecycleService as defaultLifecycle, SubscriptionLifecycleService } from "./subscription-lifecycle-service";
import { reminderService as defaultReminder, ReminderService } from "./reminder-service";
import { applyDiscount, computeNextPeriodEnd, computeUpgradeQuote } from "@/lib/billing/calc";
import { paymentProviderManager, PaymentProviderManager } from "@/lib/billing/providers/manager";
import type { PaymentIntentStatus, WebhookEvent } from "@/lib/billing/providers/types";

// ---------------------------------------------------------------------------
// BillingService — end-to-end payment recording (Money Rule owner)
// ---------------------------------------------------------------------------
// Consumes a normalized webhook event (canonical status) and:
//   idempotency guard → lifecycle activation → invoice paid → payment row →
//   notification. Provider-neutral (no provider strings). Money owner.
// Dependencies constructor-injected (default = anon singletons); a privileged
// graph is built by createPrivilegedBilling() for webhook execution.
// ---------------------------------------------------------------------------

/** Idempotency key for a provider webhook. */
export function paymentCorrelationId(providerKey: string, reference: string): string {
  return `payment:${providerKey}:${reference}`;
}

/** FSM-valid transition sequence for a SUCCESSFUL payment, by current state. */
export function resolvePaymentTransitions(current: string): Array<{ toState: string; eventType: string }> {
  switch (current) {
    case "trial_active":
      return [{ toState: "converted", eventType: "trial_converted" }, { toState: "active", eventType: "subscription_created" }];
    case "converted":
      return [{ toState: "active", eventType: "subscription_created" }];
    case "grace_period":
    case "read_only":
    case "suspended":
      return [{ toState: "active", eventType: "reactivated" }];
    default:
      // 'active' (renewal period-extension) and 'expired' are NOT handled here;
      // they require period extension / an FSM edge (candidate Change Request).
      return [];
  }
}

/** Canonical intent → payment record status. */
export function mapIntentToPaymentStatus(s: PaymentIntentStatus): PaymentStatus {
  if (s === "success") return "success";
  if (s === "pending") return "pending";
  return "failed"; // expired | failed
}

export interface RecordPaymentResult {
  status: "processed" | "idempotent" | "ignored";
}

export class BillingService {
  constructor(
    private invoices: InvoiceRepository = defaultInvoiceRepo,
    private payments: PaymentRepository = defaultPaymentRepo,
    private subs: SubscriptionRepository = defaultSubscriptionRepo,
    private lifecycle: SubscriptionLifecycleService = defaultLifecycle,
    private reminders: ReminderService = defaultReminder,
    private promotions: PromotionRepository = defaultPromotionRepo,
    private manager: PaymentProviderManager = paymentProviderManager,
  ) {}

  /**
   * Initiate payment for an invoice via the active provider (chosen by the
   * manager — the tenant NEVER chooses). Records a pending payment. Manual
   * provider returns a pending intent (admin confirms); external providers that
   * are not yet configured surface a clear, non-fatal message.
   */
  async initiatePayment(invoiceId: string): Promise<{ ok: boolean; reference?: string; redirectUrl?: string | null; message: string }> {
    const invoice = await this.invoices.getById(invoiceId);
    if (!invoice) return { ok: false, message: "Invoice tidak ditemukan." };
    if (invoice.status === "paid") return { ok: true, message: "Invoice sudah lunas." };

    let provider;
    try {
      provider = await this.manager.getActiveProvider();
    } catch {
      return { ok: false, message: "Penyedia pembayaran belum tersedia. Hubungi admin." };
    }

    try {
      const intent = await provider.createPayment({
        invoiceId: invoice.id,
        amount: invoice.amount, // Money Rule: amount from the invoice
        currency: invoice.currency,
      });
      await this.payments.record({
        tenantId: invoice.tenantId,
        subscriptionId: invoice.subscriptionId,
        amount: invoice.amount,
        currency: invoice.currency,
        status: "pending",
        paymentMethod: provider.key,
      });
      const manual = provider.key === "manual";
      return {
        ok: true,
        reference: intent.reference,
        redirectUrl: intent.redirectUrl ?? null,
        message: manual
          ? "Pembayaran manual dibuat. Instruksi transfer akan dikirim; pembayaran dikonfirmasi oleh admin."
          : "Pembayaran dibuat. Lanjutkan sesuai instruksi penyedia.",
      };
    } catch {
      return { ok: false, message: "Penyedia pembayaran belum dikonfigurasi untuk transaksi langsung. Hubungi admin." };
    }
  }

  /**
   * Create an upgrade invoice (prorated, optional promotion). Returns draft
   * invoice id + pricing breakdown. Money Rule: all amounts computed here.
   */
  async createUpgradeInvoice(
    tenantId: string,
    subscriptionId: string,
    toPackageId: string,
    promoCode?: string,
  ): Promise<{ invoiceId: string | null; amount: number; discount: number; total: number; error?: string }> {
    const current = await this.subs.getCurrent(tenantId);
    if (!current) return { invoiceId: null, amount: 0, discount: 0, total: 0, error: "Subscription tidak ditemukan." };

    const [currentPkg, targetPkg] = await Promise.all([
      packageRepo.getPackageById(current.packageId),
      packageRepo.getPackageById(toPackageId),
    ]);
    if (!currentPkg || !targetPkg) return { invoiceId: null, amount: 0, discount: 0, total: 0, error: "Paket tidak ditemukan." };

    const now = Date.now();
    const start = current.currentPeriodStart ? Date.parse(current.currentPeriodStart) : now - 30 * 86_400_000;
    const end = current.currentPeriodEnd ? Date.parse(current.currentPeriodEnd) : now;
    const periodDays = Math.max(1, Math.round((end - start) / 86_400_000));
    const daysRemaining = Math.max(0, Math.ceil((end - now) / 86_400_000));

    // Resolve promo offer if a code was provided
    let offer: Parameters<typeof computeUpgradeQuote>[4] = undefined;
    if (promoCode) {
      const promo = await this.promotions.getByCode(promoCode);
      if (promo && promo.isActive) {
        offer = { type: promo.type, value: promo.value, maxDiscount: promo.maxDiscount };
      }
    }

    const { proration, discount, total } = computeUpgradeQuote(
      currentPkg.monthlyPrice, targetPkg.monthlyPrice, daysRemaining, periodDays, offer,
    );

    // Generate a simple invoice number — app-side, UNIQUE collision-safe on DB.
    const invoiceNumber = `INV-UP-${tenantId.slice(0, 8)}-${Date.now()}`;
    const invoiceId = await this.invoices.create({
      tenantId,
      subscriptionId,
      invoiceNumber,
      amount: total,
      currency: "IDR",
      status: "draft",
      notes: `Upgrade dari ${currentPkg.label} ke ${targetPkg.label}`,
    });

    return { invoiceId, amount: proration, discount, total };
  }

  /**
   * Create a renewal invoice for the current period. Returns draft invoice id
   * + pricing. Money Rule: amounts computed here.
   */
  async createRenewalInvoice(
    tenantId: string,
    subscriptionId: string,
  ): Promise<{ invoiceId: string | null; amount: number; nextPeriodEnd: string | null; error?: string }> {
    const current = await this.subs.getCurrent(tenantId);
    if (!current) return { invoiceId: null, amount: 0, nextPeriodEnd: null, error: "Subscription tidak ditemukan." };

    const pkg = await packageRepo.getPackageById(current.packageId);
    if (!pkg) return { invoiceId: null, amount: 0, nextPeriodEnd: null, error: "Paket tidak ditemukan." };

    const interval = (pkg as unknown as Record<string, unknown>).billingInterval as string | null | undefined;
    const nextPeriodEnd = computeNextPeriodEnd(current.currentPeriodEnd, interval ?? "month");
    const invoiceNumber = `INV-RN-${tenantId.slice(0, 8)}-${Date.now()}`;
    const invoiceId = await this.invoices.create({
      tenantId,
      subscriptionId,
      invoiceNumber,
      amount: pkg.monthlyPrice,
      currency: "IDR",
      status: "draft",
      notes: `Perpanjangan ${pkg.label} — ${interval ?? "bulanan"}`,
    });

    return { invoiceId, amount: pkg.monthlyPrice, nextPeriodEnd };
  }

  /**
   * Checkout preview — apply a validated promotion to a subtotal (Money Rule).
   * Returns passthrough when no/invalid code. Does not record redemption
   * (that happens on successful payment).
   */
  async previewCheckout(
    subtotal: number,
    promoCode?: string,
  ): Promise<{ subtotal: number; discount: number; total: number; offerType: string | null }> {
    if (!promoCode) return { subtotal, discount: 0, total: subtotal, offerType: null };
    const offer = await this.promotions.resolveValidOffer(promoCode);
    if (!offer) return { subtotal, discount: 0, total: subtotal, offerType: null };
    const { discount, total } = applyDiscount(subtotal, {
      type: offer.type,
      value: offer.value,
      maxDiscount: offer.maxDiscount,
    });
    return { subtotal, discount, total, offerType: offer.type };
  }

  /**
   * Record a payment from a verified, parsed webhook event.
   * Idempotent by correlation id (safe against provider retries).
   */
  async recordPayment(providerKey: string, event: WebhookEvent): Promise<RecordPaymentResult> {
    if (!event.invoiceId || !event.reference) return { status: "ignored" };

    const invoice = await this.invoices.getById(event.invoiceId);
    if (!invoice) return { status: "ignored" };

    const correlationId = paymentCorrelationId(providerKey, event.reference);
    if (await this.subs.existsEventByCorrelation(invoice.tenantId, correlationId)) {
      return { status: "idempotent" };
    }

    const nowISO = new Date().toISOString();
    const intent = event.status ?? "failed";

    if (intent !== "success") {
      // Non-success attempt: record for audit; no invoice/lifecycle change.
      await this.payments.record({
        tenantId: invoice.tenantId,
        subscriptionId: invoice.subscriptionId,
        amount: invoice.amount,
        currency: invoice.currency,
        status: mapIntentToPaymentStatus(intent),
        paymentMethod: providerKey,
      });
      return { status: "ignored" };
    }

    // Success — transitions FIRST (their events act as idempotency markers),
    // then money rows, then notification.
    const current = await this.subs.getCurrent(invoice.tenantId);
    if (current?.lifecycleState) {
      for (const step of resolvePaymentTransitions(current.lifecycleState)) {
        await this.lifecycle.move(current.id, invoice.tenantId, step.toState, {
          correlationId: `${correlationId}:${step.toState}`,
          trigger: "webhook",
          eventType: step.eventType,
          reason: "payment_received",
        });
      }
    }

    await this.invoices.updateStatus(invoice.id, "paid", { paidAt: nowISO, paymentMethod: providerKey });
    await this.payments.record({
      tenantId: invoice.tenantId,
      subscriptionId: invoice.subscriptionId,
      amount: invoice.amount,
      currency: invoice.currency,
      status: "success",
      paymentMethod: providerKey,
      paidAt: nowISO,
    });
    await this.reminders.notifyPaymentReceived(invoice.tenantId, invoice.subscriptionId);

    return { status: "processed" };
  }
}

export const billingService = new BillingService();
