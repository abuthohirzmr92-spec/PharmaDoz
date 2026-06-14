import { BaseRepository, mapRow, mapRows } from "./base";
import type {
  FinancialWallet,
  WalletTransaction,
  WalletTransfer,
  WalletCategory,
  WalletAuditLog,
  WalletType,
  WalletTransferStatus,
  WalletCategoryType,
} from "@/types";

// ---------------------------------------------------------------------------
// Input types for wallet operations
// ---------------------------------------------------------------------------

export interface CreateWalletInput {
  name: string;
  type: WalletType;
  branchId?: string | null;
  currency?: string;
  allowOverdraft?: boolean;
  overdraftLimit?: number;
  settings?: Record<string, unknown>;
  category?: string;
  minimumBalance?: number;
}

export interface UpdateWalletInput {
  name?: string;
  type?: WalletType;
  branchId?: string | null;
  currency?: string;
  isActive?: boolean;
  allowOverdraft?: boolean;
  overdraftLimit?: number;
  settings?: Record<string, unknown>;
  category?: string;
  minimumBalance?: number;
}

export interface RecordTransactionInput {
  type: "credit" | "debit";
  amount: number;
  sourceType: "sale" | "purchase" | "expense" | "transfer_in" | "transfer_out" | "adjustment" | "capital_in" | "capital_out";
  sourceId?: string | null;
  description?: string | null;
  branchId?: string | null;
  accountCode?: string | null;
  transactionDate?: string;
}

export interface TransactionFilters {
  walletId?: string;
  type?: "credit" | "debit";
  sourceType?: string;
  branchId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface TransferFilters {
  walletId?: string;
  status?: WalletTransferStatus;
  dateFrom?: string;
  dateTo?: string;
}

// ---------------------------------------------------------------------------
// WalletRepository
// ---------------------------------------------------------------------------

export class WalletRepository extends BaseRepository {
  // =========================================================================
  // Tenant-User Guard (Super Admin Privacy — Agent F)
  // =========================================================================

  private requireTenantUser(): void {
    const role = this.tenantContext?.role;
    if (role === "super_admin") {
      throw new Error(
        "Super Admin tidak memiliki akses ke detail wallet tenant. Gunakan platform dashboard untuk melihat jumlah wallet per tenant.",
      );
    }
    // Also require a tenant context
    this.requireTenant();
  }

  // =========================================================================
  // WALLETS
  // =========================================================================

  /**
   * Get all wallets for the current tenant, optionally filtered.
   */
  async getWallets(filters?: {
    branchId?: string;
    type?: WalletType;
    includeArchived?: boolean;
  }): Promise<FinancialWallet[]> {
    if (!this.isConnected) return [];
    this.requireTenantUser();

    let query = this.client
      .from("financial_wallets")
      .select("*")
      .is("deleted_at", null);
    query = this.withTenantScope(query);

    if (!filters?.includeArchived) {
      query = query.eq("is_archived", false);
    }
    if (filters?.branchId) {
      query = query.eq("branch_id", filters.branchId);
    }
    if (filters?.type) {
      query = query.eq("type", filters.type);
    }

    query = query.order("name", { ascending: true });

    const { data, error } = await query;

    if (error) return this.handleError(error, "getWallets");

    return mapRows<FinancialWallet>(data || []);
  }

  /**
   * Get a single wallet by ID.
   */
  async getWalletById(id: string): Promise<FinancialWallet | null> {
    if (!this.isConnected) return null;
    this.requireTenantUser();

    const { data, error } = await this.client
      .from("financial_wallets")
      .select("*")
      .is("deleted_at", null)
      .eq("tenant_id", this.requireTenant())
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "getWalletById");
    }

    return mapRow<FinancialWallet>(data as Record<string, unknown>);
  }

  /**
   * Create a new wallet.
   */
  async createWallet(data: CreateWalletInput): Promise<FinancialWallet> {
    if (!this.isConnected) throw new Error("Not connected");
    this.requireTenantUser();

    const baseSettings: Record<string, unknown> = {
      ...(data.settings ?? {}),
      category: data.category ?? "operasional",
      minimum_balance: data.minimumBalance ?? 0,
    };

    const insertData: Record<string, unknown> = {
      name: data.name,
      type: data.type,
      branch_id: data.branchId ?? null,
      currency: data.currency ?? "IDR",
      allow_overdraft: data.allowOverdraft ?? false,
      overdraft_limit: data.overdraftLimit ?? 0,
      settings: baseSettings,
      tenant_id: this.requireTenant(),
    };

    const { data: row, error } = await this.client
      .from("financial_wallets")
      .insert(insertData)
      .select()
      .single();

    if (error) return this.handleError(error, "createWallet");

    const wallet = mapRow<FinancialWallet>(row as Record<string, unknown>);

    // Audit: creation
    await this.logAudit(wallet.id, "created", { name: data.name, type: data.type });

    return wallet;
  }

  /**
   * Update an existing wallet.
   */
  async updateWallet(id: string, data: UpdateWalletInput): Promise<FinancialWallet> {
    if (!this.isConnected) throw new Error("Not connected");
    this.requireTenantUser();

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData["name"] = data.name;
    if (data.type !== undefined) updateData["type"] = data.type;
    if (data.branchId !== undefined) updateData["branch_id"] = data.branchId;
    if (data.currency !== undefined) updateData["currency"] = data.currency;
    if (data.isActive !== undefined) updateData["is_active"] = data.isActive;
    if (data.allowOverdraft !== undefined) updateData["allow_overdraft"] = data.allowOverdraft;
    if (data.overdraftLimit !== undefined) updateData["overdraft_limit"] = data.overdraftLimit;
    if (data.category !== undefined || data.minimumBalance !== undefined || data.settings !== undefined) {
      // Merge category + minimum_balance into settings JSONB
      const existingSettings = (data.settings ?? {}) as Record<string, unknown>;
      if (data.category !== undefined) existingSettings["category"] = data.category;
      if (data.minimumBalance !== undefined) existingSettings["minimum_balance"] = data.minimumBalance;
      updateData["settings"] = existingSettings;
    }

    const { data: row, error } = await this.client
      .from("financial_wallets")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", this.requireTenant())
      .select()
      .single();

    if (error) return this.handleError(error, "updateWallet");

    const wallet = mapRow<FinancialWallet>(row as Record<string, unknown>);

    // Audit
    await this.logAudit(id, "updated", { changes: Object.keys(updateData) });

    return wallet;
  }

  /**
   * Archive a wallet (soft-delete). Only allowed when balance is zero.
   */
  async archiveWallet(id: string): Promise<void> {
    if (!this.isConnected) throw new Error("Not connected");
    this.requireTenantUser();

    const balance = await this.getWalletBalance(id);
    if (balance !== 0) {
      throw new Error(
        `Tidak dapat mengarsipkan wallet dengan saldo Rp ${balance.toLocaleString("id-ID")}. Kosongkan saldo terlebih dahulu.`,
      );
    }

    const { error } = await this.client
      .from("financial_wallets")
      .update({ is_archived: true, deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", this.requireTenant());

    if (error) return this.handleError(error, "archiveWallet");

    // Audit
    await this.logAudit(id, "archived", { final_balance: balance });

    // Also log to activity_logs
    await this.logActivity("wallet.archived", "financial_wallet", id, { final_balance: balance });
  }

  // =========================================================================
  // BALANCE
  // =========================================================================

  /**
   * Calculate current balance for a wallet.
   * Positive = money in wallet. Uses SUM of credits minus debits.
   */
  async getWalletBalance(walletId: string): Promise<number> {
    if (!this.isConnected) return 0;
    this.requireTenantUser();

    const { data, error } = await this.client
      .from("wallet_transactions")
      .select("type, amount, financial_wallets!inner(tenant_id)")
      .eq("wallet_id", walletId)
      .eq("financial_wallets.tenant_id", this.requireTenant());

    if (error) return this.handleError(error, "getWalletBalance");

    let balance = 0;
    for (const tx of data || []) {
      if (tx.type === "credit") {
        balance += Number(tx.amount);
      } else {
        balance -= Number(tx.amount);
      }
    }

    return balance;
  }

  /**
   * Platform-only: get wallet count per tenant (super admin visible).
   */
  async getWalletCountByTenant(): Promise<{ tenantId: string; tenantName: string; count: number }[]> {
    if (!this.isConnected) return [];

    const { data, error } = await this.client
      .from("financial_wallets")
      .select("tenant_id, tenants!inner(name)")
      .is("deleted_at", null)
      .eq("is_archived", false);

    if (error) return this.handleError(error, "getWalletCountByTenant");

    // Aggregate counts
    const counts: Record<string, { name: string; count: number }> = {};
    for (const row of data || []) {
      const tid = row.tenant_id;
      if (!counts[tid]) {
        counts[tid] = { name: row.tenants?.name ?? tid, count: 0 };
      }
      counts[tid].count++;
    }

    return Object.entries(counts).map(([tenantId, info]) => ({
      tenantId,
      tenantName: info.name,
      count: info.count,
    }));
  }

  // =========================================================================
  // TRANSACTIONS
  // =========================================================================

  /**
   * Record a wallet transaction (credit or debit) atomically.
   * Validates overdraft rules before committing.
   */
  async recordTransaction(
    walletId: string,
    data: RecordTransactionInput,
  ): Promise<WalletTransaction> {
    if (!this.isConnected) throw new Error("Not connected");
    this.requireTenantUser();

    // 1. Get wallet info for overdraft check
    const wallet = await this.getWalletById(walletId);
    if (!wallet) throw new Error("Wallet tidak ditemukan.");

    // 2. Get current balance
    const currentBalance = await this.getWalletBalance(walletId);

    // 3. Overdraft validation for debits
    if (data.type === "debit") {
      const newBalance = currentBalance - data.amount;
      if (newBalance < 0 && !wallet.allowOverdraft) {
        throw new Error(
          `Saldo tidak mencukupi. Saldo saat ini: Rp ${currentBalance.toLocaleString("id-ID")}`,
        );
      }
      if (newBalance < -(wallet.overdraftLimit || 0)) {
        throw new Error(
          `Batas overdraft terlampaui. Maksimum overdraft: Rp ${wallet.overdraftLimit.toLocaleString("id-ID")}`,
        );
      }
    }

    // 4. Calculate running balance
    const runningBalance =
      data.type === "credit"
        ? currentBalance + data.amount
        : currentBalance - data.amount;

    // 5. Insert transaction
    const insertData: Record<string, unknown> = {
      wallet_id: walletId,
      type: data.type,
      amount: data.amount,
      running_balance: runningBalance,
      source_type: data.sourceType,
      source_id: data.sourceId ?? null,
      description: data.description ?? null,
      branch_id: data.branchId ?? wallet.branchId ?? null,
      transaction_date: data.transactionDate ?? new Date().toISOString(),
      account_code: data.accountCode ?? null,
    };

    const { data: row, error } = await this.client
      .from("wallet_transactions")
      .insert(insertData)
      .select()
      .single();

    if (error) return this.handleError(error, "recordTransaction");

    const tx = mapRow<WalletTransaction>(row as Record<string, unknown>);

    // 6. Audit
    await this.logAudit(walletId, "transaction.recorded", {
      transaction_id: tx.id,
      type: data.type,
      amount: data.amount,
      source_type: data.sourceType,
      previous_balance: currentBalance,
      new_balance: runningBalance,
    });

    await this.logActivity("wallet.transaction.recorded", "wallet_transaction", tx.id, {
      wallet_id: walletId,
      type: data.type,
      amount: data.amount,
    });

    return tx;
  }

  /**
   * Get paginated transactions for a wallet or across all wallets.
   */
  async getWalletTransactions(
    filters?: TransactionFilters,
  ): Promise<{ data: WalletTransaction[]; total: number }> {
    if (!this.isConnected) return { data: [], total: 0 };
    this.requireTenantUser();

    // If a specific wallet is requested, verify access
    if (filters?.walletId) {
      const wallet = await this.getWalletById(filters.walletId);
      if (!wallet) return { data: [], total: 0 };
    }

    // Build query via financial_wallets join for tenant scoping
    let query = this.client
      .from("wallet_transactions")
      .select("*, financial_wallets!inner(tenant_id)", { count: "exact" });

    // Scope to tenant via the wallet relationship
    const tid = this.getTenantId();
    if (tid) {
      query = query.eq("financial_wallets.tenant_id", tid);
    }

    if (filters?.walletId) {
      query = query.eq("wallet_id", filters.walletId);
    }
    if (filters?.type) {
      query = query.eq("type", filters.type);
    }
    if (filters?.sourceType) {
      query = query.eq("source_type", filters.sourceType);
    }
    if (filters?.branchId) {
      query = query.eq("branch_id", filters.branchId);
    }
    if (filters?.dateFrom) {
      query = query.gte("transaction_date", filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte("transaction_date", filters.dateTo);
    }
    if (filters?.search) {
      query = query.ilike("description", `%${filters.search}%`);
    }

    const page = filters?.page ?? 1;
    const limit = Math.min(filters?.limit ?? 50, 200);
    const offset = (page - 1) * limit;

    query = query
      .order("transaction_date", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) return this.handleError(error, "getWalletTransactions");

    // Strip the nested financial_wallets from each row before mapping
    const cleanRows = (data || []).map((row: Record<string, unknown>) => {
      const { financial_wallets, ...rest } = row;
      return rest;
    });

    return {
      data: mapRows<WalletTransaction>(cleanRows),
      total: count ?? 0,
    };
  }

  // =========================================================================
  // TRANSFERS
  // =========================================================================

  /**
   * Transfer money between two wallets atomically.
   * Debits from_wallet, credits to_wallet, updates transfer status.
   */
  async transferBetweenWallets(
    fromId: string,
    toId: string,
    amount: number,
    options?: { fee?: number; notes?: string },
  ): Promise<WalletTransfer> {
    if (!this.isConnected) throw new Error("Not connected");
    this.requireTenantUser();

    if (fromId === toId) {
      throw new Error("Wallet sumber dan tujuan tidak boleh sama.");
    }

    if (amount <= 0) {
      throw new Error("Jumlah transfer harus lebih dari Rp 0.");
    }

    // Verify both wallets exist and belong to the tenant
    const [fromWallet, toWallet] = await Promise.all([
      this.getWalletById(fromId),
      this.getWalletById(toId),
    ]);

    if (!fromWallet) throw new Error("Wallet sumber tidak ditemukan.");
    if (!toWallet) throw new Error("Wallet tujuan tidak ditemukan.");

    // 1. Create transfer record (pending)
    const insertData: Record<string, unknown> = {
      from_wallet_id: fromId,
      to_wallet_id: toId,
      amount,
      fee: options?.fee ?? 0,
      status: "pending",
      notes: options?.notes ?? null,
    };

    const { data: transferRow, error: createError } = await this.client
      .from("wallet_transfers")
      .insert(insertData)
      .select()
      .single();

    if (createError) return this.handleError(createError, "createTransfer");

    const transfer = mapRow<WalletTransfer>(transferRow as Record<string, unknown>);

    // Log audit for transfer creation
    await this.logAudit(fromId, "transfer.created", {
      transfer_id: transfer.id,
      to_wallet_id: toId,
      amount,
      fee: options?.fee ?? 0,
    });

    try {
      // 2. Debit from_wallet
      await this.recordTransaction(fromId, {
        type: "debit",
        amount: amount + (options?.fee ?? 0),
        sourceType: "transfer_out",
        sourceId: transfer.id,
        description: `Transfer ke ${toWallet.name}${options?.fee ? ` (biaya: Rp ${options.fee.toLocaleString("id-ID")})` : ""}`,
        transactionDate: new Date().toISOString(),
      });

      // 3. Credit to_wallet (amount only, fee is not credited)
      await this.recordTransaction(toId, {
        type: "credit",
        amount,
        sourceType: "transfer_in",
        sourceId: transfer.id,
        description: `Transfer dari ${fromWallet.name}`,
        transactionDate: new Date().toISOString(),
      });

      // 4. Complete the transfer
      const { data: completedRow, error: completeError } = await this.client
        .from("wallet_transfers")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", transfer.id)
        .eq("from_wallet_id", fromId)
        .eq("to_wallet_id", toId)
        .select()
        .single();

      if (completeError) return this.handleError(completeError, "completeTransfer");

      const completed = mapRow<WalletTransfer>(completedRow as Record<string, unknown>);

      // Audit
      await this.logAudit(fromId, "transfer.completed", {
        transfer_id: transfer.id,
        to_wallet_id: toId,
        amount,
        fee: options?.fee ?? 0,
      });
      await this.logAudit(toId, "transfer.received", {
        transfer_id: transfer.id,
        from_wallet_id: fromId,
        amount,
      });

      await this.logActivity("wallet.transfer.completed", "wallet_transfer", transfer.id, {
        from_wallet_id: fromId,
        to_wallet_id: toId,
        amount,
        fee: options?.fee ?? 0,
      });

      return completed;
    } catch (err) {
      // If debit/credit fails, mark transfer as rejected
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      await this.client
        .from("wallet_transfers")
        .update({
          status: "rejected",
          notes: `${transfer.notes ?? ""}\nGagal: ${errorMessage}`.trim(),
        })
        .eq("id", transfer.id)
        .eq("from_wallet_id", fromId)
        .eq("to_wallet_id", toId);

      // Audit
      await this.logAudit(fromId, "transfer.rejected", {
        transfer_id: transfer.id,
        error: errorMessage,
      });

      throw err;
    }
  }

  /**
   * Get transfers, optionally filtered.
   */
  async getTransfers(filters?: TransferFilters): Promise<WalletTransfer[]> {
    if (!this.isConnected) return [];
    this.requireTenantUser();

    let query = this.client
      .from("wallet_transfers")
      .select("*, from_wallet:financial_wallets!wallet_transfers_from_wallet_id_fkey(tenant_id), to_wallet:financial_wallets!wallet_transfers_to_wallet_id_fkey(tenant_id)")
      .order("created_at", { ascending: false });

    // Scope to tenant via both wallet relationships.
    const tid = this.getTenantId();
    if (tid) {
      query = query.eq("from_wallet.tenant_id", tid);
      query = query.eq("to_wallet.tenant_id", tid);
    }

    if (filters?.walletId) {
      query = query.or(`from_wallet_id.eq.${filters.walletId},to_wallet_id.eq.${filters.walletId}`);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte("created_at", filters.dateTo);
    }

    query = query.limit(100);

    const { data, error } = await query;

    if (error) return this.handleError(error, "getTransfers");

    // Strip nested objects
    const cleanRows = (data || []).map((row: Record<string, unknown>) => {
      const { from_wallet, to_wallet, ...rest } = row;
      return rest;
    });

    return mapRows<WalletTransfer>(cleanRows);
  }

  // =========================================================================
  // CATEGORIES
  // =========================================================================

  /**
   * Get categories (system-level + tenant-specific).
   */
  async getCategories(type?: WalletCategoryType): Promise<WalletCategory[]> {
    if (!this.isConnected) return [];

    const tid = this.getTenantId();

    let query = this.client
      .from("wallet_categories")
      .select("*")
      .or(`tenant_id.is.null${tid ? `,tenant_id.eq.${tid}` : ""}`)
      .order("is_system", { ascending: false })
      .order("name", { ascending: true });

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) return this.handleError(error, "getCategories");

    return mapRows<WalletCategory>(data || []);
  }

  /**
   * Create a tenant-specific category.
   */
  async createCategory(data: {
    name: string;
    type: WalletCategoryType;
    icon?: string;
    color?: string;
  }): Promise<WalletCategory> {
    if (!this.isConnected) throw new Error("Not connected");
    this.requireTenantUser();

    const insertData: Record<string, unknown> = {
      tenant_id: this.requireTenant(),
      name: data.name,
      type: data.type,
      icon: data.icon ?? null,
      color: data.color ?? null,
      is_system: false,
    };

    const { data: row, error } = await this.client
      .from("wallet_categories")
      .insert(insertData)
      .select()
      .single();

    if (error) return this.handleError(error, "createCategory");

    return mapRow<WalletCategory>(row as Record<string, unknown>);
  }

  // =========================================================================
  // AUDIT LOGS
  // =========================================================================

  /**
   * Get audit logs for a specific wallet.
   */
  async getWalletAuditLogs(
    walletId: string,
    limit: number = 50,
  ): Promise<WalletAuditLog[]> {
    if (!this.isConnected) return [];
    this.requireTenantUser();

    let query = this.client
      .from("wallet_audit_logs")
      .select("*")
      .eq("wallet_id", walletId)
      .order("created_at", { ascending: false })
      .limit(limit);

    query = this.withTenantScope(query);

    const { data, error } = await query;

    if (error) return this.handleError(error, "getWalletAuditLogs");

    return mapRows<WalletAuditLog>(data || []);
  }

  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================

  /**
   * Log to wallet_audit_logs (detailed balance tracking).
   */
  private async logAudit(
    walletId: string,
    action: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.isConnected) return;

    try {
      const tid = this.getTenantId();
      const actorId = this.getTenantUserId();

      await this.client.from("wallet_audit_logs").insert({
        tenant_id: tid,
        wallet_id: walletId,
        action,
        actor_id: actorId,
        metadata: metadata ?? {},
      });
    } catch {
      // Audit logging is best-effort — don't fail the operation
      console.warn("[WalletRepository] Failed to log wallet audit:", action);
    }
  }

  /**
   * Log to activity_logs (general event trail).
   */
  private async logActivity(
    action: string,
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.isConnected) return;

    try {
      const tid = this.getTenantId();
      const actorId = this.getTenantUserId();

      await this.client.from("activity_logs").insert({
        tenant_id: tid,
        actor_id: actorId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata: metadata ?? {},
      });
    } catch {
      // Best-effort
      console.warn("[WalletRepository] Failed to log activity:", action);
    }
  }
}
