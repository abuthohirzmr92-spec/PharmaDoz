import { BaseRepository, mapRow, mapRows } from "./base";

// ---------------------------------------------------------------------------
// InvoiceRepository — persistence for `invoices` (migration 033)
// ---------------------------------------------------------------------------
// PERSISTENCE ONLY. Amounts are computed by BillingService (the Money Rule);
// this repository stores whatever amount it is given and never calculates money.
// Invoice status is owned by BillingService.
// ---------------------------------------------------------------------------

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "canceled" | "refunded";

export interface InvoiceRecord {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateInvoiceInput {
  tenantId: string;
  subscriptionId?: string | null;
  invoiceNumber: string;
  amount: number;               // computed by BillingService
  currency?: string;
  status?: InvoiceStatus;
  dueDate?: string | null;
  notes?: string | null;
}

const COLS =
  "id, tenant_id, subscription_id, invoice_number, amount, currency, status, " +
  "due_date, paid_at, payment_method, notes, created_at";

export class InvoiceRepository extends BaseRepository {
  async create(input: CreateInvoiceInput): Promise<string | null> {
    if (!this.isConnected) return null;
    const { data, error } = await this.client
      .from("invoices")
      .insert({
        tenant_id: input.tenantId,
        subscription_id: input.subscriptionId ?? null,
        invoice_number: input.invoiceNumber,
        amount: input.amount,
        currency: input.currency ?? "IDR",
        status: input.status ?? "draft",
        due_date: input.dueDate ?? null,
        notes: input.notes ?? null,
      })
      .select("id")
      .maybeSingle();
    if (error) return this.handleError(error, "InvoiceRepository.create");
    return (data as { id: string } | null)?.id ?? null;
  }

  async getById(id: string): Promise<InvoiceRecord | null> {
    if (!this.isConnected) return null;
    const { data, error } = await this.client.from("invoices").select(COLS).eq("id", id).maybeSingle();
    if (error) return this.handleError(error, "InvoiceRepository.getById");
    return data ? mapRow<InvoiceRecord>(data as Record<string, unknown>) : null;
  }

  async listByTenant(tenantId: string): Promise<InvoiceRecord[]> {
    if (!this.isConnected) return [];
    const { data, error } = await this.client
      .from("invoices")
      .select(COLS)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) return this.handleError(error, "InvoiceRepository.listByTenant");
    return mapRows<InvoiceRecord>((data ?? []) as Record<string, unknown>[]);
  }

  /** Batch fetch: all invoices for a set of tenant IDs in a single query. */
  async listByTenants(tenantIds: string[]): Promise<InvoiceRecord[]> {
    if (!this.isConnected || tenantIds.length === 0) return [];
    const { data, error } = await this.client
      .from("invoices")
      .select(COLS)
      .in("tenant_id", tenantIds)
      .order("created_at", { ascending: false });
    if (error) return this.handleError(error, "InvoiceRepository.listByTenants");
    return mapRows<InvoiceRecord>((data ?? []) as Record<string, unknown>[]);
  }

  /** Status transition (owned by BillingService). Persistence only. */
  async updateStatus(
    id: string,
    status: InvoiceStatus,
    opts?: { paidAt?: string | null; paymentMethod?: string | null },
  ): Promise<void> {
    if (!this.isConnected) return;
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (opts?.paidAt !== undefined) patch.paid_at = opts.paidAt;
    if (opts?.paymentMethod !== undefined) patch.payment_method = opts.paymentMethod;
    const { error } = await this.client.from("invoices").update(patch).eq("id", id);
    if (error) return this.handleError(error, "InvoiceRepository.updateStatus");
  }
}
