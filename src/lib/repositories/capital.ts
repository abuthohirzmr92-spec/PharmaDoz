import { BaseRepository, mapRow, mapRows } from "./base";
import type { CapitalTransaction } from "@/types";

// ---------------------------------------------------------------------------
// CapitalRepository — Owner equity deposits and withdrawals
// ---------------------------------------------------------------------------

export class CapitalRepository extends BaseRepository {
  // =========================================================================
  // Tenant-User Guard (Super Admin Privacy — Agent F)
  // =========================================================================

  private requireTenantUser(): void {
    const role = this.tenantContext?.role;
    if (role === "super_admin") {
      throw new Error(
        "Super Admin tidak memiliki akses ke data modal tenant.",
      );
    }
    this.requireTenant();
  }

  // =========================================================================
  // BALANCE
  // =========================================================================

  async getCapitalBalance(tenantId?: string): Promise<number> {
    if (!this.isConnected) return 0;
    this.requireTenantUser();

    const tid = tenantId ?? this.requireTenant();

    const { data, error } = await this.client
      .from("capital_transactions")
      .select("type, amount")
      .eq("tenant_id", tid);

    if (error) return this.handleError(error, "getCapitalBalance");

    let balance = 0;
    for (const tx of data || []) {
      if (tx.type === "deposit") balance += Number(tx.amount);
      else balance -= Number(tx.amount);
    }
    return balance;
  }

  // =========================================================================
  // TRANSACTIONS
  // =========================================================================

  async getCapitalTransactions(
    tenantId?: string,
    limit: number = 50,
  ): Promise<CapitalTransaction[]> {
    if (!this.isConnected) return [];
    this.requireTenantUser();

    const tid = tenantId ?? this.requireTenant();

    const { data, error } = await this.client
      .from("capital_transactions")
      .select("*")
      .eq("tenant_id", tid)
      .order("transaction_date", { ascending: false })
      .limit(limit);

    if (error) return this.handleError(error, "getCapitalTransactions");

    return mapRows<CapitalTransaction>(data || []);
  }

  /**
   * Deposit capital — creates capital_transaction AND wallet_transaction.
   */
  async depositCapital(data: {
    amount: number;
    walletId?: string | null;
    branchId?: string | null;
    description?: string | null;
  }): Promise<CapitalTransaction> {
    if (!this.isConnected) throw new Error("Not connected");
    this.requireTenantUser();

    const tenantId = this.requireTenant();
    const actorId = this.getTenantUserId();

    // 1. Create capital_transaction
    const insert: Record<string, unknown> = {
      tenant_id: tenantId,
      branch_id: data.branchId ?? null,
      wallet_id: data.walletId ?? null,
      type: "deposit",
      amount: data.amount,
      description: data.description ?? null,
      actor_id: actorId ?? null,
    };

    const { data: row, error } = await this.client
      .from("capital_transactions")
      .insert(insert)
      .select()
      .single();

    if (error) return this.handleError(error, "depositCapital");

    // 2. Record wallet transaction (credit the wallet)
    if (data.walletId) {
      try {
        const { walletRepo } = await import("@/lib/repository-instances");
        walletRepo.setTenantContext(this["tenantContext"], this["branchId"]);
        await walletRepo.recordTransaction(data.walletId, {
          type: "credit",
          amount: data.amount,
          sourceType: "capital_in",
          sourceId: row.id,
          description: `Setor Modal${data.description ? ` - ${data.description}` : ""}`,
          branchId: data.branchId ?? null,
        });
      } catch (walletErr) {
        console.warn("[CapitalRepo] Failed to record wallet transaction:", walletErr);
      }
    }

    return mapRow<CapitalTransaction>(row as Record<string, unknown>);
  }

  /**
   * Withdraw capital — creates capital_transaction AND wallet_transaction (debit).
   * Validates sufficient capital balance before withdrawal.
   */
  async withdrawCapital(data: {
    amount: number;
    walletId?: string | null;
    branchId?: string | null;
    description?: string | null;
  }): Promise<CapitalTransaction> {
    if (!this.isConnected) throw new Error("Not connected");
    this.requireTenantUser();

    const tenantId = this.requireTenant();
    const actorId = this.getTenantUserId();

    // 1. Validate capital balance
    const currentCapital = await this.getCapitalBalance();
    if (currentCapital < data.amount) {
      throw new Error(
        `Modal tidak mencukupi. Modal saat ini: Rp ${currentCapital.toLocaleString("id-ID")}. Penarikan: Rp ${data.amount.toLocaleString("id-ID")}.`,
      );
    }

    // 2. Create capital_transaction
    const insert: Record<string, unknown> = {
      tenant_id: tenantId,
      branch_id: data.branchId ?? null,
      wallet_id: data.walletId ?? null,
      type: "withdrawal",
      amount: data.amount,
      description: data.description ?? null,
      actor_id: actorId ?? null,
    };

    const { data: row, error } = await this.client
      .from("capital_transactions")
      .insert(insert)
      .select()
      .single();

    if (error) return this.handleError(error, "withdrawCapital");

    // 3. Record wallet transaction (debit the wallet)
    if (data.walletId) {
      try {
        const { walletRepo } = await import("@/lib/repository-instances");
        walletRepo.setTenantContext(this["tenantContext"], this["branchId"]);
        await walletRepo.recordTransaction(data.walletId, {
          type: "debit",
          amount: data.amount,
          sourceType: "capital_out",
          sourceId: row.id,
          description: `Tarik Modal${data.description ? ` - ${data.description}` : ""}`,
          branchId: data.branchId ?? null,
        });
      } catch (walletErr) {
        console.warn("[CapitalRepo] Failed to record wallet transaction:", walletErr);
      }
    }

    return mapRow<CapitalTransaction>(row as Record<string, unknown>);
  }
}
