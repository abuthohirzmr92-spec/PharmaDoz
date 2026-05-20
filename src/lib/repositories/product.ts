import { BaseRepository, mapRow, mapRows } from "./base";
import type { InventoryProduct, ProductBatch } from "@/types/inventory";

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
  /* ------------------------------------------------------------------ */
  /*  Products (aggregated view)                                        */
  /* ------------------------------------------------------------------ */

  async getProducts(filters?: {
    categoryId?: string;
    searchQuery?: string;
    isActive?: boolean;
  }): Promise<InventoryProduct[]> {
    if (!this.isConnected) return [];

    let query = this.client
      .from("products")
      .select(
        `
        *,
        category:category_id(name),
        batches:product_batches(*)
      `,
      )
      .is("deleted_at", null);

    query = this.withTenantScope(query);

    if (filters?.categoryId)
      query = query.eq("category_id", filters.categoryId);
    if (filters?.searchQuery) query = query.ilike("name", `%${filters.searchQuery}%`);
    if (filters?.isActive !== undefined)
      query = query.eq("is_active", filters.isActive);

    const { data, error } = await query;
    if (error) return this.handleError(error, "getProducts");

    return (data || []).map((row: Record<string, unknown>) => {
      const r = row as any;
      const batches: any[] = (r.batches || []).filter(
        (b: any) => !b.deleted_at,
      );

      return {
        id: r.id,
        tenantId: this.pharmacyId ?? "",
        name: r.name,
        category: r.category?.name ?? "",
        barcode: r.barcode ?? null,
        unit: r.unit ?? "",
        defaultPrice: r.default_price ?? 0,
        defaultSellingPrice: r.default_selling_price ?? 0,
        minStock: r.min_stock,
        totalStock: batches.reduce(
          (sum: number, b: any) => sum + (b.quantity || 0),
          0,
        ),
        batches: batches.map(
          (b: any): ProductBatch => ({
            id: b.id,
            tenantId: this.pharmacyId ?? "",
            productId: b.product_id,
            productName: r.name,
            batchNumber: b.batch_number,
            expiredDate: b.expired_date,
            quantity: b.quantity,
            unitPrice: b.unit_price,
            sellingPrice: b.selling_price,
            createdAt: b.created_at,
          }),
        ),
        requiresPrescription: r.requires_prescription,
        isActive: r.is_active,
      } as InventoryProduct;
    });
  }

  async getProductById(id: string): Promise<InventoryProduct | null> {
    if (!this.isConnected) return null;

    let query = this.client
      .from("products")
      .select(
        `
        *,
        category:category_id(name),
        batches:product_batches(*)
      `,
      )
      .is("deleted_at", null)
      .eq("id", id);

    query = this.withTenantScope(query);

    const { data, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "getProductById");
    }

    const r = data as any;
    const batches: any[] = (r.batches || []).filter(
      (b: any) => !b.deleted_at,
    );

    return {
      id: r.id,
      name: r.name,
      category: r.category?.name ?? "",
      barcode: r.barcode ?? null,
      unit: r.unit ?? "",
      defaultPrice: r.default_price ?? 0,
      defaultSellingPrice: r.default_selling_price ?? 0,
      minStock: r.min_stock,
      totalStock: batches.reduce(
        (sum: number, b: any) => sum + (b.quantity || 0),
        0,
      ),
      batches: batches.map(
        (b: any): ProductBatch => ({
          id: b.id,
          tenantId: this.pharmacyId ?? "",
          productId: b.product_id,
          productName: r.name,
          batchNumber: b.batch_number,
          expiredDate: b.expired_date,
          quantity: b.quantity,
          unitPrice: b.unit_price,
          sellingPrice: b.selling_price,
          createdAt: b.created_at,
        }),
      ),
      requiresPrescription: r.requires_prescription,
      isActive: r.is_active,
    } as InventoryProduct;
  }

  /* ------------------------------------------------------------------ */
  /*  Barcode Lookup                                                     */
  /* ------------------------------------------------------------------ */

  async searchByBarcode(barcode: string): Promise<InventoryProduct | null> {
    if (!this.isConnected) return null;

    let query = this.client
      .from("products")
      .select(
        `
        *,
        category:category_id(name),
        batches:product_batches(*)
      `,
      )
      .is("deleted_at", null)
      .eq("barcode", barcode);

    query = this.withTenantScope(query);

    const { data, error } = await query.maybeSingle();

    if (error) return this.handleError(error, "searchByBarcode");
    if (!data) return null;

    const r = data as any;
    const batches: any[] = (r.batches || []).filter(
      (b: any) => !b.deleted_at,
    );

    return {
      id: r.id,
      name: r.name,
      category: r.category?.name ?? "",
      barcode: r.barcode ?? null,
      unit: r.unit ?? "",
      defaultPrice: r.default_price ?? 0,
      defaultSellingPrice: r.default_selling_price ?? 0,
      minStock: r.min_stock,
      totalStock: batches.reduce(
        (sum: number, b: any) => sum + (b.quantity || 0),
        0,
      ),
      batches: batches.map(
        (b: any): ProductBatch => ({
          id: b.id,
          tenantId: this.pharmacyId ?? "",
          productId: b.product_id,
          productName: r.name,
          batchNumber: b.batch_number,
          expiredDate: b.expired_date,
          quantity: b.quantity,
          unitPrice: b.unit_price,
          sellingPrice: b.selling_price,
          createdAt: b.created_at,
        }),
      ),
      requiresPrescription: r.requires_prescription,
      isActive: r.is_active,
    } as InventoryProduct;
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
    isActive?: boolean;
  }): Promise<Product> {
    if (!this.isConnected) throw new Error("Not connected");

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
      is_active: data.isActive ?? true,
    };

    if (this.pharmacyId) {
      insertData["pharmacy_id"] = this.pharmacyId;
    }

    const { data: row, error } = await this.client
      .from("products")
      .insert(insertData)
      .select()
      .single();

    if (error) return this.handleError(error, "createProduct");

    return mapRow<Product>(row as Record<string, unknown>);
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
      isActive: boolean;
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
    if (data.isActive !== undefined) updateData["is_active"] = data.isActive;

    const { data: row, error } = await this.client
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return this.handleError(error, "updateProduct");

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

    let query = this.client
      .from("products")
      .select("*")
      .is("deleted_at", null);

    query = this.withTenantScope(query);

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

    const { error } = await this.client
      .from("products")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) this.handleError(error, "softDeleteProduct");
  }

  /* ------------------------------------------------------------------ */
  /*  Categories                                                         */
  /* ------------------------------------------------------------------ */

  async getCategories(): Promise<ProductCategory[]> {
    if (!this.isConnected) return [];

    const { data, error } = await this.client
      .from("product_categories")
      .select("*")
      .is("deleted_at", null);

    if (error) return this.handleError(error, "getCategories");

    return mapRows<ProductCategory>(data || []);
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
}
