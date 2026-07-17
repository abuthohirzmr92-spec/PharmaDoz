import { BaseRepository, mapRow, mapRows } from "./base";

// ---------------------------------------------------------------------------
// PaymentRepository — persistence for `payments` (migration 009)
// ---------------------------------------------------------------------------
// PERSISTENCE ONLY. Amounts are set by BillingService (the Money Rule); this
// repository never calculates money. Payment status is owned by BillingService.
// ---------------------------------------------------------------------------

export type PaymentStatus = "pending" | "success" | "failed" | "refunded";

export interface PaymentRecord {
  id: string;
  subscriptionId: string | null;
  tenantId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface RecordPaymentInput {
  tenantId: string;
  subscriptionId?: string | null;
  amount: number;               // set by BillingService
  currency?: string;
  status?: PaymentStatus;
  paymentMethod?: string | null;
  paidAt?: string | null;
}

const COLS = "id, subscription_id, tenant_id, amount, currency, status, payment_method, paid_at, created_at";

export class PaymentRepository extends BaseRepository {
  async record(input: RecordPaymentInput): Promise<string | null> {
    if (!this.isConnected) return null;
    const { data, error } = await this.client
      .from("payments")
      .insert({
        tenant_id: input.tenantId,
        subscription_id: input.subscriptionId ?? null,
        amount: input.amount,
        currency: input.currency ?? "IDR",
        status: input.status ?? "pending",
        payment_method: input.paymentMethod ?? null,
        paid_at: input.paidAt ?? null,
      })
      .select("id")
      .maybeSingle();
    if (error) return this.handleError(error, "PaymentRepository.record");
    return (data as { id: string } | null)?.id ?? null;
  }

  async listBySubscription(subscriptionId: string): Promise<PaymentRecord[]> {
    if (!this.isConnected) return [];
    const { data, error } = await this.client
      .from("payments")
      .select(COLS)
      .eq("subscription_id", subscriptionId)
      .order("created_at", { ascending: false });
    if (error) return this.handleError(error, "PaymentRepository.listBySubscription");
    return mapRows<PaymentRecord>((data ?? []) as Record<string, unknown>[]);
  }

  async getById(id: string): Promise<PaymentRecord | null> {
    if (!this.isConnected) return null;
    const { data, error } = await this.client.from("payments").select(COLS).eq("id", id).maybeSingle();
    if (error) return this.handleError(error, "PaymentRepository.getById");
    return data ? mapRow<PaymentRecord>(data as Record<string, unknown>) : null;
  }

  async updateStatus(id: string, status: PaymentStatus, opts?: { paidAt?: string | null }): Promise<void> {
    if (!this.isConnected) return;
    const patch: Record<string, unknown> = { status };
    if (opts?.paidAt !== undefined) patch.paid_at = opts.paidAt;
    const { error } = await this.client.from("payments").update(patch).eq("id", id);
    if (error) return this.handleError(error, "PaymentRepository.updateStatus");
  }
}
