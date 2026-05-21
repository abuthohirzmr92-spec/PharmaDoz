import { BaseRepository, mapRow, mapRows } from "./base";
import type {
  ProductBatch,
  StockMovement,
  MovementType,
  DashboardSummary,
  StockOpname,
} from "@/types/inventory";

export class InventoryRepository extends BaseRepository {
  /* ------------------------------------------------------------------ */
  /*  Product Batches                                                    */
  /* ------------------------------------------------------------------ */

  async getBatches(): Promise<ProductBatch[]> {
    if (!this.isConnected) return [];

    let query = this.client
      .from("product_batches")
      .select(`*, product:product_id(name)`)
      .is("deleted_at", null);
    query = this.withTenantScope(query);
    query = this.withBranchScope(query);

    const { data, error } = await query;

    if (error) return this.handleError(error, "getBatches");

    return (data || []).map((row: Record<string, unknown>) => ({
      ...mapRow<ProductBatch>(row),
      productName: ((row as any).product?.name as string) ?? "",
    }));
  }

  async getBatchesByProduct(productId: string): Promise<ProductBatch[]> {
    if (!this.isConnected) return [];

    let query = this.client
      .from("product_batches")
      .select(`*, product:product_id(name)`)
      .is("deleted_at", null)
      .eq("product_id", productId);
    query = this.withTenantScope(query);
    query = this.withBranchScope(query);

    const { data, error } = await query;

    if (error) return this.handleError(error, "getBatchesByProduct");

    return (data || []).map((row: Record<string, unknown>) => ({
      ...mapRow<ProductBatch>(row),
      productName: ((row as any).product?.name as string) ?? "",
    }));
  }

  async getFefoBatches(productId: string): Promise<ProductBatch[]> {
    if (!this.isConnected) return [];

    let query = this.client
      .from("product_batches")
      .select(`*, product:product_id(name)`)
      .is("deleted_at", null)
      .eq("product_id", productId)
      .order("expired_date", { ascending: true });
    query = this.withTenantScope(query);
    query = this.withBranchScope(query);

    const { data, error } = await query;

    if (error) return this.handleError(error, "getFefoBatches");

    return (data || []).map((row: Record<string, unknown>) => ({
      ...mapRow<ProductBatch>(row),
      productName: ((row as any).product?.name as string) ?? "",
    }));
  }

  async getBatchById(id: string): Promise<ProductBatch | null> {
    if (!this.isConnected) return null;

    let query = this.client
      .from("product_batches")
      .select(`*, product:product_id(name)`)
      .is("deleted_at", null)
      .eq("id", id);
    query = this.withTenantScope(query);

    const { data, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "getBatchById");
    }

    return {
      ...mapRow<ProductBatch>(data as Record<string, unknown>),
      productName: ((data as any).product?.name as string) ?? "",
    };
  }

  async createBatch(data: {
    productId: string;
    batchNumber: string;
    expiredDate: string;
    quantity: number;
    unitPrice: number;
    sellingPrice: number;
  }): Promise<ProductBatch> {
    if (!this.isConnected) throw new Error("Not connected");

    const { data: row, error } = await this.client
      .from("product_batches")
      .insert({
        product_id: data.productId,
        batch_number: data.batchNumber,
        expired_date: data.expiredDate,
        quantity: data.quantity,
        unit_price: data.unitPrice,
        selling_price: data.sellingPrice,
        tenant_id: this.getTenantId(),
        ...(this.branchId ? { pharmacy_id: this.branchId } : {}),
      })
      .select(`*, product:product_id(name)`)
      .single();

    if (error) return this.handleError(error, "createBatch");

    return {
      ...mapRow<ProductBatch>(row as Record<string, unknown>),
      productName: ((row as any).product?.name as string) ?? "",
    };
  }

  async updateBatchQuantity(id: string, quantity: number): Promise<ProductBatch> {
    if (!this.isConnected) throw new Error("Not connected");

    let query = this.client
      .from("product_batches")
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(`*, product:product_id(name)`);
    query = this.withTenantScope(query);

    const { data: row, error } = await query.single();

    if (error) return this.handleError(error, "updateBatchQuantity");

    return {
      ...mapRow<ProductBatch>(row as Record<string, unknown>),
      productName: ((row as any).product?.name as string) ?? "",
    };
  }

  async deductBatchQuantity(id: string, amount: number): Promise<void> {
    if (!this.isConnected) return;
    // Fetch current, validate, then update
    const batch = await this.getBatchById(id);
    if (!batch) throw new Error(`Batch ${id} not found`);
    if (batch.quantity < amount) throw new Error(`Insufficient stock in batch ${id}`);
    await this.updateBatchQuantity(id, batch.quantity - amount);
  }

  /* ------------------------------------------------------------------ */
  /*  Stock Movements                                                    */
  /* ------------------------------------------------------------------ */

  async getStockMovements(filters?: {
    productId?: string;
    batchId?: string;
    movementType?: string;
    from?: string;
    to?: string;
  }): Promise<StockMovement[]> {
    if (!this.isConnected) return [];

    let query = this.client
      .from("stock_movements")
      .select(
        `
        *,
        product:product_id(name),
        batch:batch_id(batch_number),
        user:user_id(display_name)
      `,
      )
      .order("timestamp", { ascending: false });

    query = this.withTenantScope(query);
    query = this.withBranchScope(query);

    if (filters?.productId) query = query.eq("product_id", filters.productId);
    if (filters?.batchId) query = query.eq("batch_id", filters.batchId);
    if (filters?.movementType) query = query.eq("movement_type", filters.movementType);
    if (filters?.from) query = query.gte("timestamp", filters.from);
    if (filters?.to) query = query.lte("timestamp", filters.to);

    const { data, error } = await query;

    if (error) return this.handleError(error, "getStockMovements");

    return (data || []).map((row: Record<string, unknown>) => {
      const r = row as any;
      return {
        id: r.id,
        timestamp: r.timestamp,
        type: r.movement_type as MovementType,
        productId: r.product_id,
        productName: r.product?.name ?? "",
        batchId: r.batch_id ?? "",
        batchNumber: r.batch?.batch_number ?? "",
        qtyBefore: r.qty_before,
        qtyChange: r.qty_change,
        qtyAfter: r.qty_after,
        referenceNumber: r.reference_number ?? "",
        note: r.note ?? "",
        userId: r.user_id ?? "",
        userName: r.user?.display_name ?? "",
      } as StockMovement;
    });
  }

  async createStockMovement(data: {
    timestamp?: string;
    type: MovementType;
    productId: string;
    productName?: string;
    batchId?: string;
    batchNumber?: string;
    qtyBefore: number;
    qtyChange: number;
    qtyAfter: number;
    referenceNumber?: string;
    note?: string;
    userId?: string;
    userName?: string;
  }): Promise<StockMovement> {
    if (!this.isConnected) throw new Error("Not connected");

    const { data: row, error } = await this.client
      .from("stock_movements")
      .insert({
        timestamp: data.timestamp ?? new Date().toISOString(),
        movement_type: data.type,
        product_id: data.productId,
        batch_id: data.batchId ?? null,
        qty_before: data.qtyBefore,
        qty_change: data.qtyChange,
        qty_after: data.qtyAfter,
        reference_number: data.referenceNumber ?? null,
        note: data.note ?? null,
        user_id: data.userId ?? null,
        tenant_id: this.getTenantId(),
      })
      .select(
        `
        *,
        product:product_id(name),
        batch:batch_id(batch_number),
        user:user_id(display_name)
      `,
      )
      .single();

    if (error) return this.handleError(error, "createStockMovement");

    const r = row as any;
    return {
      id: r.id,
      timestamp: r.timestamp,
      type: r.movement_type as MovementType,
      productId: r.product_id,
      productName: r.product?.name ?? "",
      batchId: r.batch_id ?? "",
      batchNumber: r.batch?.batch_number ?? "",
      qtyBefore: r.qty_before,
      qtyChange: r.qty_change,
      qtyAfter: r.qty_after,
      referenceNumber: r.reference_number ?? "",
      note: r.note ?? "",
      userId: r.user_id ?? "",
      userName: r.user?.display_name ?? "",
    } as StockMovement;
  }

  /* ------------------------------------------------------------------ */
  /*  Dashboard Summary                                                  */
  /* ------------------------------------------------------------------ */

  async createStockOpname(data: {
    opnameDate?: string;
    status?: string;
    conductedBy?: string;
    notes?: string;
    items: {
      productId: string;
      batchId?: string;
      systemQty?: number;
      physicalQty?: number;
      note?: string;
    }[];
  }): Promise<{ id: string }> {
    if (!this.isConnected) throw new Error("Not connected");

    const { data: opname, error } = await this.client
      .from("stock_opname")
      .insert({
        opname_date: data.opnameDate ?? new Date().toISOString().slice(0, 10),
        status: data.status ?? "confirmed",
        conducted_by: data.conductedBy ?? null,
        notes: data.notes ?? null,
        tenant_id: this.getTenantId(),
      })
      .select("id")
      .single();

    if (error) return this.handleError(error, "createStockOpname");

    const opnameId = (opname as any).id;

    if (data.items.length > 0) {
      const { error: itemError } = await this.client
        .from("stock_opname_items")
        .insert(
          data.items.map((item) => ({
            opname_id: opnameId,
            product_id: item.productId,
            batch_id: item.batchId ?? null,
            system_qty: item.systemQty ?? 0,
            physical_qty: item.physicalQty ?? 0,
            note: item.note ?? null,
          })),
        );

      if (itemError)
        return this.handleError(itemError, "createStockOpname items");
    }

    return { id: opnameId };
  }

  async getStockOpnames(): Promise<StockOpname[]> {
    if (!this.isConnected) return [];

    let opnameQuery = this.client
      .from("stock_opname")
      .select(
        `*,
        items:stock_opname_items(*),
        user:conducted_by(display_name)`,
      )
      .order("opname_date", { ascending: false });
    opnameQuery = this.withTenantScope(opnameQuery);
    opnameQuery = this.withBranchScope(opnameQuery);

    const { data, error } = await opnameQuery;

    if (error) return this.handleError(error, "getStockOpnames");

    return (data || []).map((row: Record<string, unknown>) => {
      const r = row as any;
      return {
        id: r.id,
        date: r.opname_date,
        status: r.status,
        conductedBy: r.user?.display_name ?? "",
        notes: r.notes ?? "",
        items: (r.items || []).map((item: any) => ({
          productId: item.product_id,
          productName: "",
          batchId: item.batch_id ?? "",
          batchNumber: "",
          systemQty: item.system_qty,
          physicalQty: item.physical_qty,
          difference: item.difference ?? (item.physical_qty - item.system_qty),
          note: item.note ?? "",
        })),
      };
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Dashboard Summary                                                  */
  /* ------------------------------------------------------------------ */

  async getDashboardSummary(): Promise<DashboardSummary> {
    if (!this.isConnected) {
      return {
        totalProducts: 0,
        totalStockValue: 0,
        lowStockCount: 0,
        nearExpiryCount: 0,
        expiredCount: 0,
        totalPurchaseValue: 0,
        movementToday: 0,
      };
    }

    const now = new Date().toISOString();
    const ninetyDaysLater = new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();

    try {
      const q1 = this.withBranchScope(this.withTenantScope(
        this.client
          .from("products")
          .select("*", { count: "exact", head: true })
          .is("deleted_at", null)
          .eq("is_active", true),
      ));
      const q2 = this.withBranchScope(this.withTenantScope(
        this.client
          .from("product_batches")
          .select("product_id, quantity, selling_price")
          .is("deleted_at", null),
      ));
      const q3 = this.withBranchScope(this.withTenantScope(
        this.client
          .from("products")
          .select("id, min_stock")
          .is("deleted_at", null)
          .eq("is_active", true),
      ));
      const q4 = this.withBranchScope(this.withTenantScope(
        this.client
          .from("product_batches")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .gt("expired_date", now)
          .lte("expired_date", ninetyDaysLater),
      ));
      const q5 = this.withBranchScope(this.withTenantScope(
        this.client
          .from("product_batches")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .lte("expired_date", now),
      ));
      const q6 = this.withBranchScope(this.withTenantScope(
        this.client
          .from("purchase_invoices")
          .select("total_amount, paid_amount")
          .is("deleted_at", null)
          .neq("status", "paid"),
      ));
      const q7 = this.withBranchScope(this.withTenantScope(
        this.client
          .from("stock_movements")
          .select("id", { count: "exact", head: true })
          .gte("timestamp", twentyFourHoursAgo),
      ));

      const [
        totalProductsResult,
        batchesResult,
        productsResult,
        nearExpiryResult,
        expiredResult,
        purchaseResult,
        movementResult,
      ] = await Promise.all([q1, q2, q3, q4, q5, q6, q7]);

      const batches = batchesResult.data || [];
      const totalStockValue = batches.reduce(
        (sum: number, b: Record<string, unknown>) =>
          sum + (b as any).quantity * (b as any).selling_price,
        0,
      );

      // Aggregate total quantity per product from all non-deleted batches
      const qtyByProduct: Record<string, number> = {};
      for (const b of batches) {
        qtyByProduct[b.product_id] =
          (qtyByProduct[b.product_id] || 0) + b.quantity;
      }

      const lowStockCount = (productsResult.data || []).filter(
        (p: Record<string, unknown>) =>
          (qtyByProduct[(p as any).id as string] || 0) <= (p as any).min_stock,
      ).length;

      const totalPurchaseValue = (purchaseResult.data || []).reduce(
        (sum: number, inv: Record<string, unknown>) =>
          sum + ((inv as any).total_amount - (inv as any).paid_amount),
        0,
      );

      return {
        totalProducts: totalProductsResult?.count ?? 0,
        totalStockValue,
        lowStockCount,
        nearExpiryCount: nearExpiryResult?.count ?? 0,
        expiredCount: expiredResult?.count ?? 0,
        totalPurchaseValue,
        movementToday: movementResult?.count ?? 0,
      };
    } catch (error) {
      return this.handleError(error, "getDashboardSummary");
    }
  }
}
