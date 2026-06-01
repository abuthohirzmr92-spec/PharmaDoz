import { BaseRepository, mapRow, mapRows } from "./base";
import type { PackageFeature, SubscriptionEvent, Invoice } from "@/types";

// ---------------------------------------------------------------------------
// PackageRepository — Platform-level package & feature management
// ---------------------------------------------------------------------------
// Used by super_admin to manage packages, features, and billing entities.
// Tenant-scoped queries are NOT enforced here — this is a platform repository.
// ---------------------------------------------------------------------------

export interface PackageRow {
  id: string;
  name: string;
  label: string;
  max_users: number;
  max_branches: number;
  max_products: number;
  monthly_price: number;
  is_active: boolean;
  is_custom: boolean;
  feature_flags: Record<string, boolean>;
  sort_order: number;
}

export interface CreatePackageInput {
  name: string;
  label: string;
  maxUsers?: number;
  maxBranches?: number;
  maxProducts?: number;
  monthlyPrice?: number;
  isActive?: boolean;
  featureFlags?: Record<string, boolean>;
  sortOrder?: number;
}

export interface UpdatePackageInput {
  name?: string;
  label?: string;
  maxUsers?: number;
  maxBranches?: number;
  maxProducts?: number;
  monthlyPrice?: number;
  isActive?: boolean;
  featureFlags?: Record<string, boolean>;
  sortOrder?: number;
}

export class PackageRepository extends BaseRepository {
  // =========================================================================
  // PACKAGES
  // =========================================================================

  async getAllPackages(): Promise<PackageRow[]> {
    if (!this.isConnected) return [];

    const { data, error } = await this.client
      .from("tenant_packages")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) return this.handleError(error, "getAllPackages");

    return (mapRows<PackageRow>(data || [])).map(normalizePackage);
  }

  async getPackageById(id: string): Promise<PackageRow | null> {
    if (!this.isConnected) return null;

    const { data, error } = await this.client
      .from("tenant_packages")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "getPackageById");
    }

    return normalizePackage(mapRow<PackageRow>(data as Record<string, unknown>));
  }

  async getPackageByName(name: string): Promise<PackageRow | null> {
    if (!this.isConnected) return null;

    const { data, error } = await this.client
      .from("tenant_packages")
      .select("*")
      .eq("name", name)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "getPackageByName");
    }

    return mapRow<PackageRow>(data as Record<string, unknown>);
  }

  async createPackage(data: CreatePackageInput): Promise<PackageRow> {
    if (!this.isConnected) throw new Error("Not connected");

    const insert: Record<string, unknown> = {
      name: data.name,
      label: data.label,
      max_users: data.maxUsers ?? 5,
      max_branches: data.maxBranches ?? 1,
      max_products: data.maxProducts ?? 200,
      monthly_price: data.monthlyPrice ?? 0,
      is_active: data.isActive ?? true,
      is_custom: true,
      feature_flags: data.featureFlags ?? {},
      sort_order: data.sortOrder ?? 99,
    };

    console.log("[PackageRepo.createPackage] INSERT payload:", JSON.stringify(insert, null, 2));
    console.log("[PackageRepo.createPackage] Target table: tenant_packages");
    console.log("[PackageRepo.createPackage] Columns:", Object.keys(insert).join(", "));

    const { data: row, error } = await this.client
      .from("tenant_packages")
      .insert(insert)
      .select()
      .single();

    if (error) {
      console.error("[PackageRepo.createPackage] SUPABASE ERROR:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        full: JSON.stringify(error),
      });
      return this.handleError(error, "createPackage");
    }

    console.log("[PackageRepo.createPackage] SUCCESS — row:", JSON.stringify(row));
    return mapRow<PackageRow>(row as Record<string, unknown>);
  }

  async updatePackage(id: string, data: UpdatePackageInput): Promise<PackageRow> {
    if (!this.isConnected) throw new Error("Not connected");

    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update["name"] = data.name;
    if (data.label !== undefined) update["label"] = data.label;
    if (data.maxUsers !== undefined) update["max_users"] = data.maxUsers;
    if (data.maxBranches !== undefined) update["max_branches"] = data.maxBranches;
    if (data.maxProducts !== undefined) update["max_products"] = data.maxProducts;
    if (data.monthlyPrice !== undefined) update["monthly_price"] = data.monthlyPrice;
    if (data.isActive !== undefined) update["is_active"] = data.isActive;
    if (data.featureFlags !== undefined) update["feature_flags"] = data.featureFlags;
    if (data.sortOrder !== undefined) update["sort_order"] = data.sortOrder;

    const { data: row, error } = await this.client
      .from("tenant_packages")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) return this.handleError(error, "updatePackage");

    return mapRow<PackageRow>(row as Record<string, unknown>);
  }

  async deletePackage(id: string): Promise<void> {
    if (!this.isConnected) throw new Error("Not connected");

    // Only custom packages can be deleted
    const pkg = await this.getPackageById(id);
    if (!pkg) throw new Error("Paket tidak ditemukan.");
    if (!pkg.is_custom) throw new Error("Paket bawaan tidak dapat dihapus.");

    // Check if any tenants are using this package
    const { count, error: countError } = await this.client
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .eq("package_id", id);

    if (countError) return this.handleError(countError, "deletePackage");
    if (count && count > 0) {
      throw new Error(`Tidak dapat menghapus paket yang sedang digunakan oleh ${count} tenant.`);
    }

    const { error } = await this.client
      .from("tenant_packages")
      .delete()
      .eq("id", id);

    if (error) return this.handleError(error, "deletePackage");
  }

  // =========================================================================
  // FEATURES
  // =========================================================================

  async getPackageFeatures(packageId: string): Promise<PackageFeature[]> {
    if (!this.isConnected) return [];

    const { data, error } = await this.client
      .from("package_features")
      .select("*")
      .eq("package_id", packageId)
      .order("feature_key", { ascending: true });

    if (error) return this.handleError(error, "getPackageFeatures");

    return mapRows<PackageFeature>(data || []);
  }

  async setPackageFeature(
    packageId: string,
    featureKey: string,
    isEnabled: boolean,
  ): Promise<void> {
    if (!this.isConnected) throw new Error("Not connected");

    const { error } = await this.client
      .from("package_features")
      .upsert(
        {
          package_id: packageId,
          feature_key: featureKey,
          is_enabled: isEnabled,
        },
        { onConflict: "package_id,feature_key" },
      );

    if (error) return this.handleError(error, "setPackageFeature");
  }

  async setPackageFeatures(
    packageId: string,
    features: Record<string, boolean>,
  ): Promise<void> {
    if (!this.isConnected) throw new Error("Not connected");

    // First delete existing features, then insert new ones
    await this.client
      .from("package_features")
      .delete()
      .eq("package_id", packageId);

    const inserts = Object.entries(features).map(([featureKey, isEnabled]) => ({
      package_id: packageId,
      feature_key: featureKey,
      is_enabled: isEnabled,
    }));

    if (inserts.length > 0) {
      const { error } = await this.client
        .from("package_features")
        .insert(inserts);

      if (error) return this.handleError(error, "setPackageFeatures");
    }
  }

  // =========================================================================
  // SUBSCRIPTION EVENTS
  // =========================================================================

  async getSubscriptionEvents(
    tenantId: string,
    limit: number = 50,
  ): Promise<SubscriptionEvent[]> {
    if (!this.isConnected) return [];

    const { data, error } = await this.client
      .from("subscription_events")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return this.handleError(error, "getSubscriptionEvents");

    return mapRows<SubscriptionEvent>(data || []);
  }

  async logSubscriptionEvent(data: {
    subscriptionId: string;
    tenantId: string;
    eventType: SubscriptionEvent["eventType"];
    previousPackageId?: string | null;
    newPackageId?: string | null;
    actorId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.isConnected) return;

    const { error } = await this.client.from("subscription_events").insert({
      subscription_id: data.subscriptionId,
      tenant_id: data.tenantId,
      event_type: data.eventType,
      previous_package_id: data.previousPackageId ?? null,
      new_package_id: data.newPackageId ?? null,
      actor_id: data.actorId ?? null,
      metadata: data.metadata ?? {},
    });

    if (error) {
      console.warn("[PackageRepository] Failed to log subscription event:", error);
    }
  }

  // =========================================================================
  // INVOICES
  // =========================================================================

  async getInvoices(
    tenantId: string,
    limit: number = 50,
  ): Promise<Invoice[]> {
    if (!this.isConnected) return [];

    const { data, error } = await this.client
      .from("invoices")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return this.handleError(error, "getInvoices");

    return mapRows<Invoice>(data || []);
  }

  async createInvoice(data: {
    tenantId: string;
    subscriptionId?: string | null;
    invoiceNumber: string;
    amount: number;
    currency?: string;
    dueDate?: string | null;
    notes?: string | null;
  }): Promise<Invoice> {
    if (!this.isConnected) throw new Error("Not connected");

    const insert: Record<string, unknown> = {
      tenant_id: data.tenantId,
      subscription_id: data.subscriptionId ?? null,
      invoice_number: data.invoiceNumber,
      amount: data.amount,
      currency: data.currency ?? "IDR",
      status: "draft",
      due_date: data.dueDate ?? null,
      notes: data.notes ?? null,
    };

    const { data: row, error } = await this.client
      .from("invoices")
      .insert(insert)
      .select()
      .single();

    if (error) return this.handleError(error, "createInvoice");

    return mapRow<Invoice>(row as Record<string, unknown>);
  }

  async updateInvoiceStatus(
    id: string,
    status: Invoice["status"],
    paymentMethod?: string | null,
  ): Promise<void> {
    if (!this.isConnected) throw new Error("Not connected");

    const update: Record<string, unknown> = { status };
    if (status === "paid") {
      update["paid_at"] = new Date().toISOString();
      if (paymentMethod) update["payment_method"] = paymentMethod;
    }

    const { error } = await this.client
      .from("invoices")
      .update(update)
      .eq("id", id);

    if (error) return this.handleError(error, "updateInvoiceStatus");
  }
}

// ---------------------------------------------------------------------------
// Helper: normalize null JSONB fields from database
// ---------------------------------------------------------------------------
// Migration 033 adds feature_flags with DEFAULT '{}', but existing rows
// remain NULL. Normalize at the repository boundary so all consumers
// receive {} instead of null.

function normalizePackage(pkg: PackageRow): PackageRow {
  return {
    ...pkg,
    feature_flags: pkg.feature_flags ?? {},
  };
}
