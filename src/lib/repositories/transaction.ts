import { BaseRepository } from "./base";
import type {
  Transaction,
  TransactionItem,
  SalePayment,
  PaymentMethod,
} from "@/types/transaction";

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export class TransactionRepository extends BaseRepository {
  /* ------------------------------------------------------------------ */
  /*  Read                                                               */
  /* ------------------------------------------------------------------ */

  async getTransactions(
    filters: TransactionFilters = {},
  ): Promise<{ data: Transaction[]; total: number }> {
    if (!this.isConnected) {
      return { data: [], total: 0 };
    }

    const {
      dateFrom,
      dateTo,
      searchQuery,
      sortKey = "created_at",
      sortDir = "desc",
      page = 1,
      pageSize = 20,
    } = filters;

    // --- Count ---
    let countQuery = this.client
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    if (dateFrom) countQuery = countQuery.gte("created_at", dateFrom);
    if (dateTo) countQuery = countQuery.lte("created_at", dateTo);
    if (searchQuery)
      countQuery = countQuery.ilike("invoice_number", `%${searchQuery}%`);

    countQuery = this.withTenantScope(countQuery);

    const { count: total, error: countError } = await countQuery;
    if (countError) return this.handleError(countError, "getTransactions");

    // --- Data ---
    let dataQuery = this.client
      .from("transactions")
      .select("*")
      .is("deleted_at", null)
      .order(sortKey, { ascending: sortDir === "asc" })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (dateFrom) dataQuery = dataQuery.gte("created_at", dateFrom);
    if (dateTo) dataQuery = dataQuery.lte("created_at", dateTo);
    if (searchQuery)
      dataQuery = dataQuery.ilike("invoice_number", `%${searchQuery}%`);

    dataQuery = this.withTenantScope(dataQuery);

    const { data: txnRows, error: dataError } = await dataQuery;
    if (dataError) return this.handleError(dataError, "getTransactions");

    // --- Assemble nested items & payments ---
    const transactions: Transaction[] = [];
    for (const txn of txnRows || []) {
      const [itemsResult, paymentsResult] = await Promise.all([
        this.client
          .from("transaction_items")
          .select("*")
          .eq("transaction_id", txn.id),
        this.client
          .from("transaction_payments")
          .select("*")
          .eq("transaction_id", txn.id),
      ]);

      transactions.push({
        id: txn.id,
        tenantId: this.pharmacyId ?? "",
        invoiceNumber: txn.invoice_number,
        items: (itemsResult.data || []).map(
          (item: Record<string, unknown>) =>
            ({
              productId: (item as any).product_id,
              productName: (item as any).product_name,
              quantity: (item as any).quantity,
              unitPrice: (item as any).unit_price,
              subtotal: (item as any).subtotal,
            }) as TransactionItem,
        ),
        payments: (paymentsResult.data || []).map(
          (pmt: Record<string, unknown>) =>
            ({
              amount: (pmt as any).amount,
              method: (pmt as any).method as PaymentMethod,
              ref: (pmt as any).ref ?? undefined,
            }) as SalePayment,
        ),
        subtotal: txn.subtotal,
        discount: txn.discount,
        tax: txn.tax,
        total: txn.total,
        cashierName: txn.cashier_name,
        createdAt: txn.created_at,
      });
    }

    return {
      data: transactions,
      total: total ?? 0,
    };
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    if (!this.isConnected) return null;

    let query = this.client
      .from("transactions")
      .select("*")
      .is("deleted_at", null)
      .eq("id", id);

    query = this.withTenantScope(query);

    const { data: txn, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "getTransactionById");
    }

    const [itemsResult, paymentsResult] = await Promise.all([
      this.client
        .from("transaction_items")
        .select("*")
        .eq("transaction_id", txn.id),
      this.client
        .from("transaction_payments")
        .select("*")
        .eq("transaction_id", txn.id),
    ]);

    return {
      id: txn.id,
      tenantId: this.pharmacyId ?? "",
      invoiceNumber: txn.invoice_number,
      items: (itemsResult.data || []).map(
        (item: Record<string, unknown>) =>
          ({
            productId: (item as any).product_id,
            productName: (item as any).product_name,
            quantity: (item as any).quantity,
            unitPrice: (item as any).unit_price,
            subtotal: (item as any).subtotal,
          }) as TransactionItem,
      ),
      payments: (paymentsResult.data || []).map(
        (pmt: Record<string, unknown>) =>
          ({
            amount: (pmt as any).amount,
            method: (pmt as any).method as PaymentMethod,
            ref: (pmt as any).ref ?? undefined,
          }) as SalePayment,
      ),
      subtotal: txn.subtotal,
      discount: txn.discount,
      tax: txn.tax,
      total: txn.total,
      cashierName: txn.cashier_name,
      createdAt: txn.created_at,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Create                                                             */
  /* ------------------------------------------------------------------ */

  async createTransaction(data: {
    invoiceNumber: string;
    items: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[];
    payments: { amount: number; method: PaymentMethod; ref?: string }[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    cashierName: string;
    pharmacyId?: string;
  }): Promise<Transaction> {
    if (!this.isConnected) throw new Error("Not connected");

    // Insert transaction header
    const txnInsert: Record<string, unknown> = {
      pharmacy_id: data.pharmacyId ?? this.pharmacyId,
      invoice_number: data.invoiceNumber,
      cashier_name: data.cashierName,
      subtotal: data.subtotal,
      discount: data.discount,
      tax: data.tax,
      total: data.total,
    };
    if (this.getTenantId()) {
      txnInsert["tenant_id"] = this.getTenantId();
    }

    const { data: txn, error: txnError } = await this.client
      .from("transactions")
      .insert(txnInsert)
      .select()
      .single();

    if (txnError) return this.handleError(txnError, "createTransaction");

    // Insert items
    if (data.items.length > 0) {
      const { error: itemsError } = await this.client
        .from("transaction_items")
        .insert(
          data.items.map((item) => {
            const row: Record<string, unknown> = {
              transaction_id: txn.id,
              product_id: item.productId,
              product_name: item.productName,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              subtotal: item.subtotal,
            };
            if (this.getTenantId()) {
              row["tenant_id"] = this.getTenantId();
            }
            return row;
          }),
        );

      if (itemsError) return this.handleError(itemsError, "createTransaction");
    }

    // Insert payments
    if (data.payments.length > 0) {
      const { error: paymentsError } = await this.client
        .from("transaction_payments")
        .insert(
          data.payments.map((pmt) => {
            const row: Record<string, unknown> = {
              transaction_id: txn.id,
              amount: pmt.amount,
              method: pmt.method,
              ref: pmt.ref ?? null,
            };
            if (this.getTenantId()) {
              row["tenant_id"] = this.getTenantId();
            }
            return row;
          }),
        );

      if (paymentsError)
        return this.handleError(paymentsError, "createTransaction");
    }

    return {
      id: txn.id,
      tenantId: this.pharmacyId ?? "",
      invoiceNumber: txn.invoice_number,
      items: data.items.map(
        (item) =>
          ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          }) as TransactionItem,
      ),
      payments: data.payments.map(
        (pmt) =>
          ({
            amount: pmt.amount,
            method: pmt.method,
            ref: pmt.ref,
          }) as SalePayment,
      ),
      subtotal: txn.subtotal,
      discount: txn.discount,
      tax: txn.tax,
      total: txn.total,
      cashierName: txn.cashier_name,
      createdAt: txn.created_at,
    };
  }
}
