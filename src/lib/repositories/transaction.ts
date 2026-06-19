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
    countQuery = this.withBranchScope(countQuery);

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
    dataQuery = this.withBranchScope(dataQuery);

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
        pharmacyId: txn.pharmacy_id,
        invoiceNumber: txn.invoice_number,
        items: (itemsResult.data || []).map(
          (item: Record<string, unknown>) =>
            ({
              id: (item as any).id,
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
    query = this.withBranchScope(query);

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
      pharmacyId: txn.pharmacy_id,
      invoiceNumber: txn.invoice_number,
      items: (itemsResult.data || []).map(
        (item: Record<string, unknown>) =>
          ({
            id: (item as any).id,
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
    payments: { amount: number; method: PaymentMethod; ref?: string; walletId?: string }[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    cashierName: string;
    pharmacyId?: string;
  }): Promise<Transaction> {
    if (!this.isConnected) throw new Error("Not connected");

    console.log("[TXN-TRACE] STEP 1: begin createTransaction, items:", data.items.length, "payments:", data.payments.length);

    // Insert transaction header
    const txnInsert: Record<string, unknown> = {
      pharmacy_id: data.pharmacyId ?? this.branchId,
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

    console.log("[TXN-TRACE] STEP 2: inserting transactions header, payload:", JSON.stringify(txnInsert));
    console.log("[P0.4 REPO CREATE TRANSACTION]", JSON.parse(JSON.stringify({
      dataPharmacyId: data.pharmacyId,
      branchIdMemory: this.branchId,
      pharmacyIdMemory: (this as any).pharmacyId,
      tenantIdMemory: this.getTenantId(),
      finalPharmacyId: data.pharmacyId ?? this.branchId,
      finalTenantId: this.getTenantId(),
    })));
    const { data: txn, error: txnError } = await this.client
      .from("transactions")
      .insert(txnInsert)
      .select()
      .single();

    if (txnError) {
      console.error("[TXN-TRACE] STEP 2 FAILED:", txnError.code, txnError.message);
      return this.handleError(txnError, "createTransaction");
    }
    console.log("[TXN-TRACE] STEP 2 OK: transaction.id =", (txn as any).id);

    // Insert items — return inserted rows to get DB-generated IDs
    let insertedItems: Array<{ id: string; product_id: string; product_name: string; quantity: number; unit_price: number; subtotal: number }> = [];
    if (data.items.length > 0) {
      const itemsPayload = data.items.map((item) => {
        const row: Record<string, unknown> = {
          transaction_id: (txn as any).id,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          subtotal: item.subtotal,
        };
        return row;
      });
      console.log("[TXN-TRACE] STEP 3: inserting", itemsPayload.length, "items, first:", JSON.stringify(itemsPayload[0]));
      const { data: itemRows, error: itemsError } = await this.client
        .from("transaction_items")
        .insert(itemsPayload)
        .select("id, product_id, product_name, quantity, unit_price, subtotal");

      if (itemsError) {
        console.error("[TXN-TRACE] STEP 4 FAILED:", itemsError.code, itemsError.message, itemsError.details);
        return this.handleError(itemsError, "createTransaction");
      }
      console.log("[TXN-TRACE] STEP 4 OK:", (itemRows as any[])?.length, "items inserted, IDs:", (itemRows as any[])?.map((i: any) => i.id).join(", "));
      insertedItems = (itemRows as any[]) ?? [];
    } else {
      console.warn("[TXN-TRACE] STEP 3 SKIPPED: data.items.length === 0");
    }

    // Insert payments
    if (data.payments.length > 0) {
      const pmtPayload = data.payments.map((pmt) => {
        const row: Record<string, unknown> = {
          transaction_id: (txn as any).id,
          amount: pmt.amount,
          method: pmt.method,
          ref: pmt.ref ?? null,
          wallet_id: pmt.walletId ?? null,
        };
        return row;
      });
      console.log("[TXN-TRACE] STEP 5: inserting", pmtPayload.length, "payments, first:", JSON.stringify(pmtPayload[0]));
      const { error: paymentsError } = await this.client
        .from("transaction_payments")
        .insert(pmtPayload);

      if (paymentsError) {
        console.error("[TXN-TRACE] STEP 6 FAILED:", paymentsError.code, paymentsError.message);
        return this.handleError(paymentsError, "createTransaction");
      }
      console.log("[TXN-TRACE] STEP 6 OK: payments inserted");

      // Record wallet transactions
      try {
        const { walletRepo } = await import("@/lib/repository-instances");
        walletRepo.setTenantContext(this["tenantContext"], this["branchId"]);

        for (const pmt of data.payments) {
          const walletId = pmt.walletId;
          if (!walletId) continue; // Skip if no wallet assigned

          await walletRepo.recordTransaction(walletId, {
            type: "credit",
            amount: pmt.amount,
            sourceType: "sale",
            sourceId: txn.id,
            description: `Penjualan ${data.invoiceNumber} - ${pmt.method}`,
            branchId: data.pharmacyId ?? this["branchId"] ?? null,
          });
        }
      } catch (walletErr) {
        // Wallet recording is best-effort — don't fail the transaction
        console.warn("[TransactionRepo] Failed to record wallet transaction:", walletErr);
      }
    }

    return {
      id: txn.id,
      tenantId: this.pharmacyId ?? "",
      pharmacyId: txn.pharmacy_id,
      invoiceNumber: txn.invoice_number,
      items: insertedItems.map(
        (item) =>
          ({
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
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
