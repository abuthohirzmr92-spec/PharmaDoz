import { BaseRepository, mapRow } from "./base";
import type { StockTransfer, TransferStatus, CreateTransferInput, TransferFilters } from "@/types/stock-transfer";

export class StockTransferRepository extends BaseRepository {
  private withTransferBranchScope(query: any): any {
    if (!this.branchId) return query;
    return query.or(
      `from_pharmacy_id.eq.${this.branchId},to_pharmacy_id.eq.${this.branchId}`,
    );
  }

  /* ------------------------------------------------------------------ */
  /*  List Transfers                                                     */
  /* ------------------------------------------------------------------ */

  async getTransfers(filters?: TransferFilters): Promise<StockTransfer[]> {
    if (!this.isConnected) return [];

    let query = this.client
      .from("stock_transfers")
      .select(
        `
        *,
        from_pharmacy:from_pharmacy_id(name),
        to_pharmacy:to_pharmacy_id(name),
        product:product_id(name)
      `,
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    query = this.withTenantScope(query);

    // Scope to either from_pharmacy_id OR to_pharmacy_id matching the current branch
    if (this.branchId) {
      query = query.or(
        `from_pharmacy_id.eq.${this.branchId},to_pharmacy_id.eq.${this.branchId}`,
      );
    }

    if (filters?.fromPharmacyId)
      query = query.eq("from_pharmacy_id", filters.fromPharmacyId);
    if (filters?.toPharmacyId)
      query = query.eq("to_pharmacy_id", filters.toPharmacyId);
    if (filters?.status) query = query.eq("status", filters.status);

    const { data, error } = await query;

    if (error) return this.handleError(error, "getTransfers");

    return (data || []).map((row: Record<string, unknown>) =>
      this.mapTransferRow(row),
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Get Single Transfer                                                */
  /* ------------------------------------------------------------------ */

  async getTransferById(id: string): Promise<StockTransfer | null> {
    if (!this.isConnected) return null;

    let query = this.client
      .from("stock_transfers")
      .select(
        `
        *,
        from_pharmacy:from_pharmacy_id(name),
        to_pharmacy:to_pharmacy_id(name),
        product:product_id(name)
      `,
      )
      .is("deleted_at", null)
      .eq("id", id);

    query = this.withTenantScope(query);
    query = this.withTransferBranchScope(query);

    const { data, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "getTransferById");
    }

    return this.mapTransferRow(data as Record<string, unknown>);
  }

  /* ------------------------------------------------------------------ */
  /*  Create Transfer                                                    */
  /* ------------------------------------------------------------------ */

  async createTransfer(data: CreateTransferInput): Promise<StockTransfer> {
    if (!this.isConnected) throw new Error("Not connected");

    const { data: row, error } = await this.client
      .from("stock_transfers")
      .insert({
        from_pharmacy_id: data.fromPharmacyId,
        to_pharmacy_id: data.toPharmacyId,
        product_id: data.productId,
        batch_id: data.batchId ?? null,
        quantity: data.quantity,
        status: "pending",
        requested_by: this.tenantContext?.userId ?? "unknown",
        note: data.note ?? null,
        tenant_id: this.getTenantId(),
      })
      .select(
        `
        *,
        from_pharmacy:from_pharmacy_id(name),
        to_pharmacy:to_pharmacy_id(name),
        product:product_id(name)
      `,
      )
      .single();

    if (error) return this.handleError(error, "createTransfer");

    return this.mapTransferRow(row as Record<string, unknown>);
  }

  /* ------------------------------------------------------------------ */
  /*  Approve Transfer                                                   */
  /* ------------------------------------------------------------------ */

  async approveTransfer(id: string, approvedBy: string): Promise<StockTransfer | null> {
    if (!this.isConnected) throw new Error("Not connected");

    let query = this.client
      .from("stock_transfers")
      .update({
        status: "approved",
        approved_by: approvedBy,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending")
      .select(
        `
        *,
        from_pharmacy:from_pharmacy_id(name),
        to_pharmacy:to_pharmacy_id(name),
        product:product_id(name)
      `,
      );

    query = this.withTenantScope(query);
    query = this.withTransferBranchScope(query);

    const { data: row, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "approveTransfer");
    }

    return this.mapTransferRow(row as Record<string, unknown>);
  }

  /* ------------------------------------------------------------------ */
  /*  Reject Transfer                                                    */
  /* ------------------------------------------------------------------ */

  async rejectTransfer(id: string, note?: string): Promise<StockTransfer | null> {
    if (!this.isConnected) throw new Error("Not connected");

    const updateData: Record<string, unknown> = {
      status: "rejected",
      updated_at: new Date().toISOString(),
    };
    if (note !== undefined) updateData["note"] = note;

    let query = this.client
      .from("stock_transfers")
      .update(updateData)
      .eq("id", id)
      .eq("status", "pending")
      .select(
        `
        *,
        from_pharmacy:from_pharmacy_id(name),
        to_pharmacy:to_pharmacy_id(name),
        product:product_id(name)
      `,
      );

    query = this.withTenantScope(query);
    query = this.withTransferBranchScope(query);

    const { data: row, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "rejectTransfer");
    }

    return this.mapTransferRow(row as Record<string, unknown>);
  }

  /* ------------------------------------------------------------------ */
  /*  Mark In Transit                                                    */
  /* ------------------------------------------------------------------ */

  async markInTransit(id: string): Promise<StockTransfer | null> {
    if (!this.isConnected) throw new Error("Not connected");

    let query = this.client
      .from("stock_transfers")
      .update({
        status: "in_transit",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "approved")
      .select(
        `
        *,
        from_pharmacy:from_pharmacy_id(name),
        to_pharmacy:to_pharmacy_id(name),
        product:product_id(name)
      `,
      );

    query = this.withTenantScope(query);
    query = this.withTransferBranchScope(query);

    const { data: row, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "markInTransit");
    }

    return this.mapTransferRow(row as Record<string, unknown>);
  }

  /* ------------------------------------------------------------------ */
  /*  Receive Transfer — update stock quantities atomically               */
  /* ------------------------------------------------------------------ */

  async receiveTransfer(id: string): Promise<StockTransfer | null> {
    if (!this.isConnected) throw new Error("Not connected");

    // 1. Fetch transfer with current status
    const transfer = await this.getTransferById(id);
    if (!transfer) return null;
    if (transfer.status !== "in_transit") {
      throw new Error("Transfer must be 'in_transit' to receive");
    }

    // 2. Deduct from source batch
    if (!transfer.batchId) {
      throw new Error("Cannot receive transfer without a source batch reference");
    }

    const { data: sourceBatch, error: srcErr } = await this.client
      .from("product_batches")
      .select("*")
      .is("deleted_at", null)
      .eq("id", transfer.batchId)
      .eq("tenant_id", this.requireTenant())
      .eq("pharmacy_id", transfer.fromPharmacyId)
      .single();

    if (srcErr) return this.handleError(srcErr, "receiveTransfer - source batch");
    if (!sourceBatch) throw new Error("Source batch not found");

    const sourceQty = (sourceBatch as any).quantity;
    if (sourceQty < transfer.quantity) {
      throw new Error(
        `Insufficient stock in source batch: available ${sourceQty}, requested ${transfer.quantity}`,
      );
    }

    const now = new Date().toISOString();

    // 3. Update source batch quantity (deduct)
    const newSourceQty = sourceQty - transfer.quantity;
    const { error: deductErr } = await this.client
      .from("product_batches")
      .update({ quantity: newSourceQty, updated_at: now })
      .eq("id", transfer.batchId)
      .eq("tenant_id", this.requireTenant())
      .eq("pharmacy_id", transfer.fromPharmacyId);

    if (deductErr) return this.handleError(deductErr, "receiveTransfer - deduct");

    // 4. Find or create destination batch
    const batchNumber = (sourceBatch as any).batch_number;
    const expiredDate = (sourceBatch as any).expired_date;
    const unitPrice = (sourceBatch as any).unit_price;
    const sellingPrice = (sourceBatch as any).selling_price;

    const { data: existingDest, error: destErr } = await this.client
      .from("product_batches")
      .select("*")
      .is("deleted_at", null)
      .eq("tenant_id", this.requireTenant())
      .eq("batch_number", batchNumber)
      .eq("pharmacy_id", transfer.toPharmacyId)
      .maybeSingle();

    if (destErr) return this.handleError(destErr, "receiveTransfer - check dest");

    if (existingDest) {
      // Add to existing batch
      const destQty = (existingDest as any).quantity;
      const { error: updateDestErr } = await this.client
        .from("product_batches")
        .update({ quantity: destQty + transfer.quantity, updated_at: now })
        .eq("id", (existingDest as any).id)
        .eq("tenant_id", this.requireTenant())
        .eq("pharmacy_id", transfer.toPharmacyId);

      if (updateDestErr) return this.handleError(updateDestErr, "receiveTransfer - update dest");
    } else {
      // Create new batch in destination branch
      const { error: createDestErr } = await this.client
        .from("product_batches")
        .insert({
          product_id: transfer.productId,
          batch_number: batchNumber,
          expired_date: expiredDate,
          quantity: transfer.quantity,
          unit_price: unitPrice,
          selling_price: sellingPrice,
          pharmacy_id: transfer.toPharmacyId,
          tenant_id: this.getTenantId(),
        });

      if (createDestErr) return this.handleError(createDestErr, "receiveTransfer - create dest");
    }

    // 5. Create stock movements for audit trail
    const refNumber = `TRF-${transfer.id.slice(0, 8)}`;

    // Source branch: deduction movement
    const { error: movSrcErr } = await this.client
      .from("stock_movements")
      .insert({
        timestamp: now,
        movement_type: "transfer",
        product_id: transfer.productId,
        batch_id: transfer.batchId,
        qty_before: sourceQty,
        qty_change: -transfer.quantity,
        qty_after: newSourceQty,
        reference_number: refNumber,
        note: `Transfer ke ${transfer.toPharmacyName}`,
        pharmacy_id: transfer.fromPharmacyId,
        tenant_id: this.getTenantId(),
      });

    if (movSrcErr) return this.handleError(movSrcErr, "receiveTransfer - src movement");

    // Destination branch: addition movement
    const destQtyAfter = existingDest
      ? (existingDest as any).quantity + transfer.quantity
      : transfer.quantity;
    const destQtyBefore = existingDest ? (existingDest as any).quantity : 0;

    const { error: movDstErr } = await this.client
      .from("stock_movements")
      .insert({
        timestamp: now,
        movement_type: "transfer",
        product_id: transfer.productId,
        batch_id: transfer.batchId,
        qty_before: destQtyBefore,
        qty_change: transfer.quantity,
        qty_after: destQtyAfter,
        reference_number: refNumber,
        note: `Transfer dari ${transfer.fromPharmacyName}`,
        pharmacy_id: transfer.toPharmacyId,
        tenant_id: this.getTenantId(),
      });

    if (movDstErr) return this.handleError(movDstErr, "receiveTransfer - dst movement");

    // 6. Update transfer status to received
    let updateQuery = this.client
      .from("stock_transfers")
      .update({ status: "received", updated_at: now })
      .eq("id", id)
      .select(
        `
        *,
        from_pharmacy:from_pharmacy_id(name),
        to_pharmacy:to_pharmacy_id(name),
        product:product_id(name)
      `,
      );

    updateQuery = this.withTenantScope(updateQuery);

    const { data: updated, error: updateErr } = await updateQuery.single();

    if (updateErr) return this.handleError(updateErr, "receiveTransfer - update status");

    return this.mapTransferRow(updated as Record<string, unknown>);
  }

  /* ------------------------------------------------------------------ */
  /*  Convenience: Get Pending Transfers                                 */
  /* ------------------------------------------------------------------ */

  async getPendingTransfers(): Promise<StockTransfer[]> {
    return this.getTransfers({ status: "pending" });
  }

  /* ------------------------------------------------------------------ */
  /*  Row Mapper                                                         */
  /* ------------------------------------------------------------------ */

  private mapTransferRow(row: Record<string, unknown>): StockTransfer {
    const r = row as any;
    return {
      id: r.id,
      fromPharmacyId: r.from_pharmacy_id,
      fromPharmacyName: r.from_pharmacy?.name ?? "",
      toPharmacyId: r.to_pharmacy_id,
      toPharmacyName: r.to_pharmacy?.name ?? "",
      productId: r.product_id,
      productName: r.product?.name ?? "",
      batchId: r.batch_id ?? undefined,
      batchNumber: r.batch_number ?? undefined,
      quantity: r.quantity,
      status: r.status as TransferStatus,
      requestedBy: r.requested_by ?? "",
      approvedBy: r.approved_by ?? undefined,
      note: r.note ?? undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
