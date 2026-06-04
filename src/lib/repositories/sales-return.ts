import { BaseRepository, mapRow, mapRows } from "./base";
import type { SalesReturn, SalesReturnItem, SalesReturnAllocation } from "@/types";

// ---------------------------------------------------------------------------
// SalesReturnRepository — Retur Penjualan
// ---------------------------------------------------------------------------

export class SalesReturnRepository extends BaseRepository {
  private requireTenantUser(): void {
    this.requireTenant();
  }

  private pad(n: number): string { return String(n).padStart(2, "0"); }

  private generateRefNumber(): string {
    const now = new Date();
    const date = `${now.getFullYear()}${this.pad(now.getMonth() + 1)}${this.pad(now.getDate())}`;
    const seq = this.pad(Math.floor(Math.random() * 9999) + 1);
    return `RET-${date}-${seq}`;
  }

  // =========================================================================
  // CREATE RETURN
  // =========================================================================

  async createReturn(data: {
    originalTransactionId: string;
    reason?: string | null;
    refundMethod: string;
    refundWalletId?: string | null;
    refundAmount: number;
    conductedBy?: string | null;
    notes?: string | null;
    items: {
      originalTransactionItemId: string;
      quantity: number;
      unitPrice: number;
    }[];
  }): Promise<SalesReturn> {
    if (!this.isConnected) throw new Error("Not connected");
    this.requireTenantUser();

    const tenantId = this.requireTenant();
    const refNum = this.generateRefNumber();

    // 1. Create return header
    const { data: ret, error } = await this.client
      .from("sales_returns")
      .insert({
        tenant_id: tenantId,
        original_transaction_id: data.originalTransactionId,
        reference_number: refNum,
        return_date: new Date().toISOString(),
        reason: data.reason ?? null,
        refund_method: data.refundMethod,
        refund_wallet_id: data.refundWalletId ?? null,
        refund_amount: data.refundAmount,
        status: "confirmed",
        conducted_by: data.conductedBy ?? null,
        notes: data.notes ?? null,
      })
      .select("*")
      .single();

    if (error) return this.handleError(error, "createReturn");

    const returnId = (ret as any).id;

    // 2. Insert return items
    const returnItems: SalesReturnItem[] = [];
    for (const item of data.items) {
      const { data: ri, error: riErr } = await this.client
        .from("sales_return_items")
        .insert({
          return_id: returnId,
          original_transaction_item_id: item.originalTransactionItemId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
        })
        .select("*")
        .single();

      if (riErr) return this.handleError(riErr, "createReturn items");
      returnItems.push(mapRow<SalesReturnItem>(ri as Record<string, unknown>));
    }

    // 3. Process allocations — reverse FEFO for each returned item
    const returnAllocations: SalesReturnAllocation[] = [];
    for (const item of data.items) {
      // Get original sale allocations for this item (sorted by creation, last first = reverse-FEFO)
      const { data: allocs } = await this.client
        .from("sale_batch_allocations")
        .select("*, sra: sales_return_allocations!sale_allocation_id(quantity)")
        .eq("transaction_item_id", item.originalTransactionItemId)
        .order("created_at", { ascending: false });

      const allocations = (allocs as any[]) ?? [];
      let remaining = item.quantity;

      for (const alloc of allocations) {
        if (remaining <= 0) break;

        // Calculate already returned qty for this allocation
        const alreadyReturned = ((alloc.sra as any[]) ?? []).reduce(
          (sum: number, r: any) => sum + (r.quantity ?? 0), 0,
        );
        const available = alloc.quantity - alreadyReturned;

        if (available <= 0) continue;

        const take = Math.min(available, remaining);
        if (take <= 0) break;

        // Record return allocation
        const { data: sra, error: sraErr } = await this.client
          .from("sales_return_allocations")
          .insert({
            return_id: returnId,
            sale_allocation_id: alloc.id,
            batch_id: alloc.batch_id,
            quantity: take,
            cost_price: alloc.cost_price,
            subtotal_cost: take * alloc.cost_price,
            tenant_id: tenantId,
          })
          .select("*")
          .single();

        if (sraErr) return this.handleError(sraErr, "createReturn allocations");
        returnAllocations.push(mapRow<SalesReturnAllocation>(sra as Record<string, unknown>));

        // Restore batch quantity
        await this.client
          .from("product_batches")
          .update({ quantity: (alloc as any).batch_quantity + take })
          .eq("id", alloc.batch_id);

        // Insert stock movement (return)
        await this.client.from("stock_movements").insert({
          type: "return",
          product_id: (alloc as any).product_id,
          batch_id: alloc.batch_id,
          qty_before: (alloc as any).batch_quantity,
          qty_change: take,
          qty_after: (alloc as any).batch_quantity + take,
          reference_number: refNum,
          note: `Retur penjualan ${refNum}`,
        });

        remaining -= take;
      }

      if (remaining > 0) {
        throw new Error(
          `Tidak dapat melakukan retur: alokasi stok tidak mencukupi. Sisa ${remaining} unit tidak dapat dikembalikan.`,
        );
      }
    }

    // 4. Process refund via wallet if applicable
    if (data.refundWalletId && data.refundAmount > 0) {
      try {
        const { walletRepo } = await import("@/lib/repository-instances");
        walletRepo.setTenantContext(this["tenantContext"], this["branchId"]);
        await walletRepo.recordTransaction(data.refundWalletId, {
          type: "debit",
          amount: data.refundAmount,
          sourceType: "sale" as any, // using existing source_type, marked as refund via description
          sourceId: returnId,
          description: `Refund retur ${refNum}`,
        });
        // Mark as refunded
        await this.client
          .from("sales_returns")
          .update({ status: "refunded" })
          .eq("id", returnId);
      } catch (walletErr) {
        console.warn("[SalesReturnRepo] Refund wallet transaction failed:", walletErr);
      }
    }

    return {
      id: returnId,
      tenantId,
      originalTransactionId: data.originalTransactionId,
      referenceNumber: refNum,
      returnDate: (ret as any).return_date,
      reason: (ret as any).reason ?? null,
      refundMethod: data.refundMethod,
      refundWalletId: data.refundWalletId ?? null,
      refundAmount: data.refundAmount,
      status: data.refundWalletId ? "refunded" : "confirmed",
      conductedBy: data.conductedBy ?? null,
      notes: data.notes ?? null,
      items: returnItems,
      allocations: returnAllocations,
      createdAt: (ret as any).created_at,
      updatedAt: (ret as any).updated_at,
    };
  }

  // =========================================================================
  // QUERY RETURNS
  // =========================================================================

  async getReturnsForTransaction(transactionId: string): Promise<SalesReturn[]> {
    if (!this.isConnected) return [];

    const { data, error } = await this.client
      .from("sales_returns")
      .select("*, items:sales_return_items(*), allocations:sales_return_allocations(*)")
      .eq("original_transaction_id", transactionId)
      .order("created_at", { ascending: false });

    if (error) return this.handleError(error, "getReturnsForTransaction");

    return ((data as any[]) ?? []).map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      originalTransactionId: r.original_transaction_id,
      referenceNumber: r.reference_number,
      returnDate: r.return_date,
      reason: r.reason,
      refundMethod: r.refund_method,
      refundWalletId: r.refund_wallet_id,
      refundAmount: r.refund_amount,
      status: r.status,
      conductedBy: r.conducted_by,
      notes: r.notes,
      items: (r.items ?? []).map((i: any) => mapRow<SalesReturnItem>(i)),
      allocations: (r.allocations ?? []).map((a: any) => mapRow<SalesReturnAllocation>(a)),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Get remaining (allocated - returned) quantity per transaction item.
   * Used to validate return requests before processing.
   */
  async getReturnableQuantities(transactionItemId: string): Promise<Array<{
    saleAllocationId: string;
    batchId: string;
    batchNumber: string;
    allocatedQty: number;
    returnedQty: number;
    availableQty: number;
    costPrice: number;
  }>> {
    if (!this.isConnected) return [];

    const { data: allocs, error } = await this.client
      .from("sale_batch_allocations")
      .select(`
        id, quantity, cost_price, batch_id,
        batch: batch_id!inner(batch_number),
        returns: sales_return_allocations!sale_allocation_id(quantity)
      `)
      .eq("transaction_item_id", transactionItemId);

    if (error) return this.handleError(error, "getReturnableQuantities");

    return ((allocs as any[]) ?? []).map((a: any) => {
      const returned = ((a.returns as any[]) ?? []).reduce(
        (sum: number, r: any) => sum + (r.quantity ?? 0), 0,
      );
      return {
        saleAllocationId: a.id,
        batchId: a.batch_id,
        batchNumber: (a.batch as any)?.batch_number ?? "—",
        allocatedQty: a.quantity,
        returnedQty: returned,
        availableQty: a.quantity - returned,
        costPrice: a.cost_price,
      };
    });
  }
}
