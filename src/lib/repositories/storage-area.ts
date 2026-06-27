// ---------------------------------------------------------------------------
// RC1 M2 — StorageAreaRepository
// ---------------------------------------------------------------------------
// CRUD operations for storage_areas (location master data).
// Follows BaseRepository pattern — tenant-scoped, branch-aware.
// ---------------------------------------------------------------------------

import { BaseRepository, mapRow, mapRows } from "./base";

export interface StorageArea {
  id: string;
  tenantId: string;
  pharmacyId: string | null;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface StorageAreaInput {
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
}

export class StorageAreaRepository extends BaseRepository {
  /* ------------------------------------------------------------------ */
  /*  Queries                                                            */
  /* ------------------------------------------------------------------ */

  /** List all active storage areas for the current tenant (sorted by sort_order). */
  async list(): Promise<StorageArea[]> {
    if (!this.isConnected) return [];

    let query = this.client
      .from("storage_areas")
      .select("*")
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    query = this.withTenantScope(query);

    const { data, error } = await query;
    if (error) return this.handleError(error, "StorageArea.list");

    return mapRows<StorageArea>(data || []);
  }

  /** Get a single storage area by ID (active only). */
  async getById(id: string): Promise<StorageArea | null> {
    if (!this.isConnected) return null;

    let query = this.client
      .from("storage_areas")
      .select("*")
      .is("deleted_at", null)
      .eq("id", id);

    query = this.withTenantScope(query);

    const { data, error } = await query.single();
    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "StorageArea.getById");
    }

    return mapRow<StorageArea>(data as Record<string, unknown>);
  }

  /** Find a storage area by code (tenant-scoped, case-insensitive match recommended at app level). */
  async getByCode(code: string): Promise<StorageArea | null> {
    if (!this.isConnected) return null;

    let query = this.client
      .from("storage_areas")
      .select("*")
      .is("deleted_at", null)
      .eq("code", code);

    query = this.withTenantScope(query);

    const { data, error } = await query.maybeSingle();
    if (error) return this.handleError(error, "StorageArea.getByCode");

    return data ? mapRow<StorageArea>(data as Record<string, unknown>) : null;
  }

  /* ------------------------------------------------------------------ */
  /*  Mutations                                                          */
  /* ------------------------------------------------------------------ */

  /** Create a new storage area. */
  async create(input: StorageAreaInput): Promise<StorageArea> {
    if (!this.isConnected) throw new Error("Not connected");

    const tenantId = this.getTenantId();

    const payload = {
      tenant_id: tenantId,
      code: input.code.trim(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      sort_order: input.sortOrder ?? 0,
      is_active: true,
    };
    console.log("[CREATE-STORAGE-AREA]", JSON.stringify({
      tenantContext: this.tenantContext,
      tenantId,
      payload,
    }));

    const { data, error } = await this.client
      .from("storage_areas")
      .insert(payload)
      .select("*")
      .single();

    if (error) return this.handleError(error, "StorageArea.create");

    return mapRow<StorageArea>(data as Record<string, unknown>);
  }

  /** Update an existing storage area. */
  async update(id: string, input: Partial<StorageAreaInput> & { isActive?: boolean }): Promise<StorageArea> {
    if (!this.isConnected) throw new Error("Not connected");

    const updateData: Record<string, unknown> = {};
    if (input.code !== undefined) updateData.code = input.code.trim();
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.description !== undefined) updateData.description = input.description?.trim() || null;
    if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    let query = this.client
      .from("storage_areas")
      .update(updateData)
      .eq("id", id)
      .select("*");

    query = this.withTenantScope(query);

    const { data, error } = await query.single();

    if (error) return this.handleError(error, "StorageArea.update");

    return mapRow<StorageArea>(data as Record<string, unknown>);
  }

  /** Soft-delete a storage area (sets deleted_at). */
  async remove(id: string): Promise<boolean> {
    if (!this.isConnected) return false;

    let query = this.client
      .from("storage_areas")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    query = this.withTenantScope(query);

    const { error } = await query;

    if (error) {
      this.handleError(error, "StorageArea.remove");
      return false;
    }
    return true;
  }
}
