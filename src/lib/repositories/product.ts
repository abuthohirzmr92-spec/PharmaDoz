import { BaseRepository, mapRow, mapRows } from "./base";
import type { InventoryProduct, ProductBatch } from "@/types/inventory";
import type { UnitLevel } from "@/types/unit";

/**
 * CamelCase representation of the `products` DB row.
 * Used internally by the repository for CRUD operations.
 */
export interface Product {
  id: string;
  categoryId: string;
  name: string;
  barcode: string | null;
  unit: string | null;
  defaultPrice: number | null;
  defaultSellingPrice: number | null;
  description: string | null;
  imageUrl: string | null;
  requiresPrescription: boolean;
  minStock: number;
  rackLocation: string | null;
  pharmacyId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * CamelCase representation of the `product_categories` DB row.
 */
export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export class ProductRepository extends BaseRepository {
  private async getScopedBatchesForProducts(productIds: string[]): Promise<Record<string, ProductBatch[]>> {
    if (productIds.length === 0) return {};

    let query = this.client
      .from("product_batches")
      .select("*")
      .is("deleted_at", null)
      .in("product_id", productIds);

    query = this.withTenantScope(query);
    query = this.withBranchScope(query);

    const { data, error } = await query;
    if (error) return this.handleError(error, "getScopedBatchesForProducts");

    const grouped: Record<string, ProductBatch[]> = {};
    for (const batch of (data || []) as Record<string, unknown>[]) {
      const productId = batch.product_id as string;
      if (!grouped[productId]) grouped[productId] = [];
      grouped[productId].push({
        id: batch.id as string,
        tenantId: (batch.tenant_id as string) ?? this.pharmacyId ?? "",
        productId,
        productName: "",
        pharmacyId: (batch.pharmacy_id as string | null) ?? null,
        batchNumber: batch.batch_number as string,
        expiredDate: batch.expired_date as string,
        quantity: (batch.quantity as number) ?? 0,
        unitPrice: (batch.unit_price as number) ?? 0,
        sellingPrice: (batch.selling_price as number) ?? 0,
        createdAt: batch.created_at as string,
      });
    }

    return grouped;
  }

  private mapInventoryProduct(
    row: Record<string, unknown>,
    batches: ProductBatch[],
    unitLevels: UnitLevel[] = [],
  ): InventoryProduct {
    const r = row as any;
    const namedBatches = batches.map((batch) => ({ ...batch, productName: r.name }));

    return {
      id: r.id,
      tenantId: r.tenant_id ?? this.pharmacyId ?? "",
      name: r.name,
      category: r.category?.name ?? "",
      categoryId: r.category_id,
      description: r.description ?? null,
      barcode: r.barcode ?? null,
      unit: r.unit ?? "",
      defaultPrice: r.default_price ?? 0,
      defaultSellingPrice: r.default_selling_price ?? 0,
      minStock: r.min_stock,
      rackLocation: r.rack_location ?? null,
      totalStock: namedBatches.reduce((sum, batch) => sum + (batch.quantity || 0), 0),
      batches: namedBatches,
      requiresPrescription: r.requires_prescription,
      isActive: r.is_active,
      unitLevels,
    } as InventoryProduct;
  }

  /* ------------------------------------------------------------------ */
  /*  Products (aggregated view)                                        */
  /* ------------------------------------------------------------------ */

  async getProducts(filters?: {
    categoryId?: string;
    searchQuery?: string;
    isActive?: boolean;
  }): Promise<InventoryProduct[]> {
    if (!this.isConnected) return [];
    if (!this.hasTenantScope()) return [];

    let query = this.client
      .from("products")
      .select(
        `
        *,
        category:category_id(name)
      `,
      )
      .is("deleted_at", null);

    query = this.withTenantScope(query);
    // Products are tenant-scoped (shared catalog) — no branch filter

    if (filters?.categoryId)
      query = query.eq("category_id", filters.categoryId);
    if (filters?.searchQuery) query = query.ilike("name", `%${filters.searchQuery}%`);
    if (filters?.isActive !== undefined)
      query = query.eq("is_active", filters.isActive);

    const { data, error } = await query;
    if (error) return this.handleError(error, "getProducts");

    const rows = (data || []) as Record<string, unknown>[];
    const productIds = rows.map((row) => row.id as string);
    const [batchesByProduct, unitLevelsByProduct] = await Promise.all([
      this.getScopedBatchesForProducts(productIds),
      this.getUnitLevelsByProducts(productIds),
    ]);

    return rows.map((row) =>
      this.mapInventoryProduct(
        row,
        batchesByProduct[row.id as string] ?? [],
        unitLevelsByProduct[row.id as string] ?? [],
      ),
    );
  }

  async getProductById(id: string): Promise<InventoryProduct | null> {
    if (!this.isConnected) return null;
    if (!this.hasTenantScope()) return null;

    let query = this.client
      .from("products")
      .select(
        `
        *,
        category:category_id(name)
      `,
      )
      .is("deleted_at", null)
      .eq("id", id);

    query = this.withTenantScope(query);
    // Products are tenant-scoped (shared catalog) — no branch filter

    const { data, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "getProductById");
    }

    const [batchesByProduct, unitLevelsByProduct] = await Promise.all([
      this.getScopedBatchesForProducts([data.id]),
      this.getUnitLevelsByProducts([data.id]),
    ]);
    return this.mapInventoryProduct(
      data as Record<string, unknown>,
      batchesByProduct[data.id] ?? [],
      unitLevelsByProduct[data.id] ?? [],
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Barcode Lookup                                                     */
  /* ------------------------------------------------------------------ */

  async searchByBarcode(barcode: string): Promise<InventoryProduct | null> {
    if (!this.isConnected) return null;
    if (!this.hasTenantScope()) return null;

    let query = this.client
      .from("products")
      .select(
        `
        *,
        category:category_id(name)
      `,
      )
      .is("deleted_at", null)
      .eq("barcode", barcode);

    query = this.withTenantScope(query);
    // Products are tenant-scoped (shared catalog) — no branch filter

    const { data, error } = await query.maybeSingle();

    if (error) return this.handleError(error, "searchByBarcode");
    if (!data) return null;

    const batchesByProduct = await this.getScopedBatchesForProducts([data.id]);
    return this.mapInventoryProduct(data as Record<string, unknown>, batchesByProduct[data.id] ?? []);
  }

  /* ------------------------------------------------------------------ */
  /*  Raw Product CRUD                                                   */
  /* ------------------------------------------------------------------ */

  async createProduct(data: {
    categoryId: string;
    name: string;
    barcode?: string | null;
    unit?: string;
    defaultPrice?: number;
    defaultSellingPrice?: number;
    description?: string | null;
    imageUrl?: string | null;
    requiresPrescription?: boolean;
    minStock?: number;
    rackLocation?: string | null;
    isActive?: boolean;
    /** V2 Multi Unit — optional unit levels (Level 2 & 3) */
    unitLevels?: UnitLevel[];
  }): Promise<Product> {
    if (!this.isConnected) throw new Error("Not connected");
    this.requireTenant();

    const insertData: Record<string, unknown> = {
      category_id: data.categoryId,
      name: data.name,
      barcode: data.barcode ?? null,
      unit: data.unit ?? "pcs",
      default_price: data.defaultPrice ?? 0,
      default_selling_price: data.defaultSellingPrice ?? 0,
      description: data.description ?? null,
      image_url: data.imageUrl ?? null,
      requires_prescription: data.requiresPrescription ?? false,
      min_stock: data.minStock ?? 0,
      rack_location: data.rackLocation ?? null,
      is_active: data.isActive ?? true,
    };

    if (this.branchId) {
      insertData["pharmacy_id"] = this.branchId;
    }
    if (this.getTenantId()) {
      insertData["tenant_id"] = this.getTenantId();
    }

    const { data: row, error } = await this.client
      .from("products")
      .insert(insertData)
      .select()
      .single();

    if (error) return this.handleError(error, "createProduct");

    const product = mapRow<Product>(row as Record<string, unknown>);

    // V2 Multi Unit — insert unit levels if provided
    if (data.unitLevels && data.unitLevels.length > 0) {
      const { error: ulError } = await this.client
        .from("product_unit_levels")
        .insert(
          data.unitLevels.map((ul) => ({
            product_id: product.id,
            level: ul.level,
            unit_name: ul.unitName,
            contains: ul.contains,
          })),
        );
      if (ulError) {
        // Best-effort: product already created, log error but don't rollback
        console.error("Failed to insert unit levels for new product:", ulError);
      }
    }

    return product;
  }

  async updateProduct(
    id: string,
    data: Partial<{
      categoryId: string;
      name: string;
      barcode: string | null;
      unit: string;
      defaultPrice: number;
      defaultSellingPrice: number;
      description: string | null;
      imageUrl: string | null;
      requiresPrescription: boolean;
      minStock: number;
      rackLocation: string | null;
      isActive: boolean;
      /** V2 Multi Unit — optional unit levels (Level 2 & 3).
       *  undefined = jangan sentuh. [] = hapus semua. [...]= sync diff. */
      unitLevels: UnitLevel[];
    }>,
  ): Promise<Product> {
    if (!this.isConnected) throw new Error("Not connected");

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.categoryId !== undefined)
      updateData["category_id"] = data.categoryId;
    if (data.name !== undefined) updateData["name"] = data.name;
    if (data.barcode !== undefined) updateData["barcode"] = data.barcode;
    if (data.unit !== undefined) updateData["unit"] = data.unit;
    if (data.defaultPrice !== undefined)
      updateData["default_price"] = data.defaultPrice;
    if (data.defaultSellingPrice !== undefined)
      updateData["default_selling_price"] = data.defaultSellingPrice;
    if (data.description !== undefined)
      updateData["description"] = data.description;
    if (data.imageUrl !== undefined)
      updateData["image_url"] = data.imageUrl;
    if (data.requiresPrescription !== undefined)
      updateData["requires_prescription"] = data.requiresPrescription;
    if (data.minStock !== undefined) updateData["min_stock"] = data.minStock;
    if (data.rackLocation !== undefined) updateData["rack_location"] = data.rackLocation;
    if (data.isActive !== undefined) updateData["is_active"] = data.isActive;

    this.requireTenant();

    let query = this.client
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select();
    query = this.withTenantScope(query);

    const { data: row, error } = await query.single();

    if (error) return this.handleError(error, "updateProduct");

    // V2 Multi Unit — sync unit levels jika dikirim (undefined = jangan sentuh)
    if (data.unitLevels !== undefined) {
      await this.upsertUnitLevels(id, data.unitLevels);
    }

    return mapRow<Product>(row as Record<string, unknown>);
  }

  /* ------------------------------------------------------------------ */
  /*  Raw Product Queries (flat, no batch aggregation)                    */
  /* ------------------------------------------------------------------ */

  async getRawProducts(filters?: {
    categoryId?: string;
    searchQuery?: string;
    isActive?: boolean;
  }): Promise<Product[]> {
    if (!this.isConnected) return [];
    if (!this.hasTenantScope()) {
      console.error("[TENANT-SCOPE] getRawProducts blocked — no tenant context set on productRepo");
      return [];
    }

    let query = this.client
      .from("products")
      .select("*")
      .is("deleted_at", null);

    query = this.withTenantScope(query);
    // Products are tenant-scoped (shared catalog) — no branch filter

    if (filters?.categoryId)
      query = query.eq("category_id", filters.categoryId);
    if (filters?.searchQuery)
      query = query.ilike("name", `%${filters.searchQuery}%`);
    if (filters?.isActive !== undefined)
      query = query.eq("is_active", filters.isActive);

    const { data, error } = await query;
    if (error) return this.handleError(error, "getRawProducts");

    return mapRows<Product>(data || []);
  }

  async softDeleteProduct(id: string): Promise<void> {
    if (!this.isConnected) throw new Error("Not connected");
    this.requireTenant();

    let query = this.client
      .from("products")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    query = this.withTenantScope(query);

    const { error } = await query;

    if (error) this.handleError(error, "softDeleteProduct");
  }

  /* ------------------------------------------------------------------ */
  /*  Categories                                                         */
  /* ------------------------------------------------------------------ */

  async getCategories(): Promise<ProductCategory[]> {
    if (!this.isConnected) return [];
    if (!this.hasTenantScope()) return [];

    let query = this.client
      .from("product_categories")
      .select("*")
      .is("deleted_at", null);
    query = this.withTenantScope(query);

    const { data, error } = await query;

    if (error) return this.handleError(error, "getCategories");

    return mapRows<ProductCategory>(data || []);
  }

  async createCategory(name: string): Promise<ProductCategory> {
    if (!this.isConnected) throw new Error("Not connected");

    const insertData: Record<string, unknown> = {
      name,
      tenant_id: this.getTenantId() ?? null,
    };

    const { data: row, error } = await this.client
      .from("product_categories")
      .insert(insertData)
      .select()
      .single();

    if (error) return this.handleError(error, "createCategory");

    return mapRow<ProductCategory>(row as Record<string, unknown>);
  }

  /* ------------------------------------------------------------------ */
  /*  Product Units                                                      */
  /* ------------------------------------------------------------------ */

  async getUnits(): Promise<{ id: string; code: string; name: string }[]> {
    if (!this.isConnected) return [];

    const { data, error } = await this.client
      .from("product_units")
      .select("id, code, name")
      .order("name");

    if (error) return this.handleError(error, "getUnits");

    return (data || []) as { id: string; code: string; name: string }[];
  }

  /* ------------------------------------------------------------------ */
  /*  V2 Multi Unit — Unit Levels                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Fetch all unit levels for a single product.
   * Level 1 (base unit) is NOT stored here — it is `products.unit`.
   */
  async getUnitLevels(productId: string): Promise<UnitLevel[]> {
    if (!this.isConnected) return [];

    const { data, error } = await this.client
      .from("product_unit_levels")
      .select("id, level, unit_name, contains")
      .eq("product_id", productId)
      .order("level", { ascending: true });

    if (error) return this.handleError(error, "getUnitLevels");

    return (data || []).map(
      (row: Record<string, unknown>): UnitLevel => ({
        id: row.id as string,
        level: row.level as number,
        unitName: row.unit_name as string,
        contains: row.contains as number,
      }),
    );
  }

  /**
   * Batch fetch unit levels for multiple products.
   * Returns a map keyed by product_id.
   */
  async getUnitLevelsByProducts(
    productIds: string[],
  ): Promise<Record<string, UnitLevel[]>> {
    const result: Record<string, UnitLevel[]> = {};
    if (!this.isConnected || productIds.length === 0) return result;

    // Init empty arrays for all requested IDs
    for (const pid of productIds) result[pid] = [];

    const { data, error } = await this.client
      .from("product_unit_levels")
      .select("id, product_id, level, unit_name, contains")
      .in("product_id", productIds)
      .order("level", { ascending: true });

    if (error) return this.handleError(error, "getUnitLevelsByProducts");

    for (const row of data || []) {
      const r = row as Record<string, unknown>;
      const pid = r.product_id as string;
      if (!result[pid]) result[pid] = [];
      result[pid].push({
        id: r.id as string,
        level: r.level as number,
        unitName: r.unit_name as string,
        contains: r.contains as number,
      });
    }

    return result;
  }

  /**
   * Diff-based sync unit levels untuk satu produk.
   *
   * Strategi (BUKAN delete-all + insert-all):
   *   1. Ambil existing unit levels
   *   2. Bandingkan dengan data baru (key = unit_name, case-insensitive)
   *   3. UPDATE yang masih ada tapi contains berubah
   *   4. INSERT yang baru (tidak ada di existing)
   *   5. DELETE yang dihapus (ada di existing, tidak ada di data baru)
   *
   * Jika unitLevels kosong, hapus semua existing (produk kembali ke base unit saja).
   */
  async upsertUnitLevels(
    productId: string,
    unitLevels: UnitLevel[],
  ): Promise<void> {
    if (!this.isConnected) return;

    // 1. Ambil existing
    const existing = await this.getUnitLevels(productId);

    // Build map keyed by normalized unit_name → existing row
    const existingByName = new Map<string, UnitLevel>();
    for (const ul of existing) {
      existingByName.set(ul.unitName.trim().toLowerCase(), ul);
    }

    // Build set of normalized incoming names
    const incomingNames = new Set(
      unitLevels.map((ul) => ul.unitName.trim().toLowerCase()),
    );

    const now = new Date().toISOString();

    // 2. UPDATE existing yang masih ada (ada di incoming)
    for (const incoming of unitLevels) {
      const key = incoming.unitName.trim().toLowerCase();
      const ex = existingByName.get(key);

      if (ex) {
        // Masih ada — update jika contains berubah
        if (ex.contains !== incoming.contains || ex.level !== incoming.level) {
          const { error } = await this.client
            .from("product_unit_levels")
            .update({
              level: incoming.level,
              unit_name: incoming.unitName,
              contains: incoming.contains,
              updated_at: now,
            })
            .eq("id", ex.id!);

          if (error) this.handleError(error, "upsertUnitLevels - update");
        }
        // else: no change — skip
      } else {
        // 3. INSERT yang baru
        const { error } = await this.client
          .from("product_unit_levels")
          .insert({
            product_id: productId,
            level: incoming.level,
            unit_name: incoming.unitName,
            contains: incoming.contains,
          });

        if (error) this.handleError(error, "upsertUnitLevels - insert");
      }
    }

    // 4. DELETE yang dihapus (ada di existing, tidak ada di incoming)
    for (const [key, ex] of existingByName) {
      if (!incomingNames.has(key)) {
        const { error } = await this.client
          .from("product_unit_levels")
          .delete()
          .eq("id", ex.id!);

        if (error) this.handleError(error, "upsertUnitLevels - delete");
      }
    }
  }

  /**
   * Hapus semua unit levels untuk satu produk.
   */
  async deleteUnitLevels(productId: string): Promise<void> {
    if (!this.isConnected) return;

    const { error } = await this.client
      .from("product_unit_levels")
      .delete()
      .eq("product_id", productId);

    if (error) this.handleError(error, "deleteUnitLevels");
  }
}
