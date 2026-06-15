import { BaseRepository } from "./base";
import type { Tenant, TenantSummary, TenantPackage, PlatformStats, PlatformHealth, ActivityLog } from "@/types";

export class SuperAdminRepository extends BaseRepository {
  /* ------------------------------------------------------------------ */
  /*  Tenant listing (cross-tenant — no tenant_id filter)                 */
  /* ------------------------------------------------------------------ */

  async getAllTenants(): Promise<TenantSummary[]> {
    if (!this.isConnected) return [];

    const { data, error } = await this.client
      .from("tenants")
      .select("*, profiles:tenant_users(count), branches:branches(count), expansions:store_expansion_requests(count)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) return this.handleError(error, "getAllTenants");

    const tenants = (data as any[]) || [];

    // Fetch owner names from tenant_users + profiles (single source of truth)
    const ownerMap = new Map<string, string>();
    if (tenants.length > 0) {
      const tenantIds = tenants.map((t: any) => t.id);
      const { data: ownerData } = await this.client
        .from("tenant_users")
        .select("tenant_id, profile:user_id!inner(display_name)")
        .eq("role", "tenant_owner")
        .in("tenant_id", tenantIds)
        .eq("is_active", true);

      for (const row of (ownerData as any[]) || []) {
        const displayName = row.profile?.display_name;
        if (displayName) ownerMap.set(row.tenant_id, displayName);
      }
    }

    return tenants.map((t: any) => ({
      pharmacyId: t.id,
      pharmacyName: t.name,
      packageName: (t.package_id ? this.resolvePackageName(t.package_id) : "basic") as TenantPackage,
      ownerName: ownerMap.get(t.id) ?? "—",
      userCount: t.profiles?.[0]?.count ?? 0,
      branchCount: t.branches?.[0]?.count ?? 0,
      isActive: t.is_active ?? true,
      lastActiveAt: t.settings?.last_active_at ?? null,
      lastSyncAt: t.settings?.last_sync_at ?? null,
      transactionVolume: t.settings?.transaction_volume ?? 0,
      createdAt: t.created_at,
    }));
  }

  /* ------------------------------------------------------------------ */
  /*  Single tenant detail                                                */
  /* ------------------------------------------------------------------ */

  async getTenantDetail(tenantId: string): Promise<Tenant | null> {
    if (!this.isConnected) return null;

    const { data, error } = await this.client
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "getTenantDetail");
    }

    const t = data as any;
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      domain: t.domain ?? null,
      settings: t.settings ?? {},
      isActive: t.is_active,
      packageId: t.package_id ?? null,
      createdAt: t.created_at ?? new Date().toISOString(),
      updatedAt: t.updated_at ?? new Date().toISOString(),
      deletedAt: t.deleted_at ?? null,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Tenant status management                                            */
  /* ------------------------------------------------------------------ */

  async suspendTenant(tenantId: string): Promise<boolean> {
    if (!this.isConnected) return false;

    const { error } = await this.client
      .from("tenants")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", tenantId);

    if (error) return this.handleError(error, "suspendTenant");
    return true;
  }

  async activateTenant(tenantId: string): Promise<boolean> {
    if (!this.isConnected) return false;

    const { error } = await this.client
      .from("tenants")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", tenantId);

    if (error) return this.handleError(error, "activateTenant");
    return true;
  }

  async deleteTenant(tenantId: string): Promise<boolean> {
    if (!this.isConnected) return false;

    const { error } = await this.client
      .from("tenants")
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", tenantId)
      .is("deleted_at", null);

    if (error) return this.handleError(error, "deleteTenant");
    return true;
  }

  /* ------------------------------------------------------------------ */
  /*  Platform stats (aggregate across all tenants)                       */
  /* ------------------------------------------------------------------ */

  async getPlatformStats(): Promise<PlatformStats> {
    if (!this.isConnected) {
      return {
        totalPharmacies: 0,
        totalUsers: 0,
        pendingExpansions: 0,
        activePackages: { basic: 0, professional: 0, enterprise: 0 },
      };
    }

    const [tenantsRes, profilesRes, expansionsRes] = await Promise.all([
      this.client.from("tenants").select("id, package_id, is_active").is("deleted_at", null),
      this.client.from("profiles").select("id", { count: "exact" }).is("deleted_at", null),
      this.client.from("store_expansion_requests").select("id", { count: "exact" }).eq("status", "pending"),
    ]);

    const tenants = (tenantsRes.data as any[]) || [];
    const totalPharmacies = tenants.length;
    const totalUsers = profilesRes.count ?? 0;
    const pendingExpansions = expansionsRes.count ?? 0;

    const packages = { basic: 0, professional: 0, enterprise: 0 };
    for (const t of tenants) {
      const pkg = this.resolvePackageName(t.package_id);
      if (pkg in packages) packages[pkg as keyof typeof packages]++;
    }

    return { totalPharmacies, totalUsers, pendingExpansions, activePackages: packages };
  }

  /* ------------------------------------------------------------------ */
  /*  Platform health snapshot                                            */
  /* ------------------------------------------------------------------ */

  async getPlatformHealth(): Promise<PlatformHealth> {
    if (!this.isConnected) {
      return {
        activeTenants: 0,
        totalTenants: 0,
        failedTransactions24h: 0,
        offlineTenants: 0,
        syncFailures24h: 0,
        activeMaintenances: 0,
        quotaAlerts: 0,
        updatedAt: new Date().toISOString(),
      };
    }

    const [tenantsRes, syncFailuresRes] = await Promise.all([
      this.client.from("tenants").select("id, is_active, settings").is("deleted_at", null),
      this.client
        .from("sync_queue")
        .select("id", { count: "exact" })
        .eq("status", "failed")
        .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
    ]);

    const tenants = (tenantsRes.data as any[]) || [];
    const total = tenants.length;
    const active = tenants.filter((t: any) => t.is_active).length;
    const offline = tenants.filter(
      (t: any) => t.settings?.last_heartbeat && (Date.now() - new Date(t.settings.last_heartbeat).getTime()) > 900000
    ).length;

    return {
      activeTenants: active,
      totalTenants: total,
      failedTransactions24h: 0,
      offlineTenants: offline,
      syncFailures24h: syncFailuresRes.count ?? 0,
      activeMaintenances: 0,
      quotaAlerts: tenants.filter((t: any) => {
        const max = 3; // basic default
        const current = t.settings?.user_count ?? 0;
        return current >= max;
      }).length,
      updatedAt: new Date().toISOString(),
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Activity logs (cross-tenant view for super admin)                   */
  /* ------------------------------------------------------------------ */

  async getActivityLogs(limit = 50): Promise<ActivityLog[]> {
    if (!this.isConnected) return [];

    const { data, error } = await this.client
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return this.handleError(error, "getActivityLogs");

    return ((data as any[]) || []).map((a: any) => ({
      id: a.id,
      tenantId: a.tenant_id ?? null,
      actorId: a.actor_id,
      action: a.action,
      resourceType: a.resource_type,
      resourceId: a.resource_id ?? null,
      metadata: a.metadata ?? null,
      ipAddress: a.ip_address ?? null,
      createdAt: a.created_at,
    }));
  }

  /* ------------------------------------------------------------------ */
  /*  All users across tenants (super admin view)                         */
  /* ------------------------------------------------------------------ */

  async getAllUsers(): Promise<any[]> {
    if (!this.isConnected) return [];

    const { data, error } = await this.client
      .from("profiles")
      .select("*, tenant:tenant_id(id, name)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) return this.handleError(error, "getAllUsers");

    return (data as any[]) || [];
  }

  /* ------------------------------------------------------------------ */
  /*  Impersonation — resolve a user's full context                       */
  /* ------------------------------------------------------------------ */

  async resolveUserContext(userId: string): Promise<{
    profile: any;
    tenant: any | null;
    tenantRole: string | null;
  } | null> {
    if (!this.isConnected) return null;

    const { data: profile, error } = await this.client
      .from("profiles")
      .select("*, tenant:tenant_id(id, name, slug, settings)")
      .eq("id", userId)
      .is("deleted_at", null)
      .single();

    if (error) return null;

    const p = profile as any;
    const tenant = p.tenant ?? null;

    let tenantRole: string | null = null;
    if (tenant) {
      const { data: tu } = await this.client
        .from("tenant_users")
        .select("role")
        .eq("user_id", userId)
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .single();
      tenantRole = (tu as any)?.role ?? null;
    }

    return { profile: p, tenant, tenantRole };
  }

  /* ------------------------------------------------------------------ */
  /*  Subscription Lifecycle (package management)                           */
  /* ------------------------------------------------------------------ */

  /**
   * Change a tenant's subscription to a new package.
   * Records subscription_event, updates tenant.package_id, subscription record.
   */
  async changeSubscription(
    tenantId: string,
    newPackageId: string,
    actorId: string,
  ): Promise<boolean> {
    if (!this.isConnected) return false;

    const oldPkg = await this.client
      .from("tenants")
      .select("package_id")
      .eq("id", tenantId)
      .single();
    const oldPackageId = (oldPkg.data as any)?.package_id ?? null;

    // Determine event type
    const eventType: string = oldPackageId ? "package_changed" : "subscription_created";

    // Update tenant's package
    const { error: tenantErr } = await this.client
      .from("tenants")
      .update({ package_id: newPackageId })
      .eq("id", tenantId);

    if (tenantErr) return this.handleError(tenantErr, "changeSubscription");

    // Update active subscription
    const { data: sub } = await this.client
      .from("subscriptions")
      .select("id")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .maybeSingle();

    if (sub) {
      await this.client
        .from("subscriptions")
        .update({
          previous_package_id: oldPackageId,
          changed_at: new Date().toISOString(),
          changed_by: actorId,
        })
        .eq("id", (sub as any).id);
    }

    // Log subscription event
    await this.client.from("subscription_events").insert({
      subscription_id: (sub as any)?.id ?? null,
      tenant_id: tenantId,
      event_type: eventType,
      previous_package_id: oldPackageId,
      new_package_id: newPackageId,
      actor_id: actorId,
    });

    // Log activity
    await this.client.from("activity_logs").insert({
      tenant_id: tenantId,
      actor_id: actorId,
      action: "subscription.package_changed",
      resource_type: "subscription",
      resource_id: (sub as any)?.id ?? null,
      metadata: {
        previous_package_id: oldPackageId,
        new_package_id: newPackageId,
      },
    });

    return true;
  }

  /** Suspend a tenant's subscription (sets status to 'past_due' or marks inactive) */
  async suspendSubscription(tenantId: string, actorId: string): Promise<boolean> {
    if (!this.isConnected) return false;

    const { data: sub } = await this.client
      .from("subscriptions")
      .select("id")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .maybeSingle();

    if (sub) {
      await this.client
        .from("subscriptions")
        .update({ status: "past_due", changed_at: new Date().toISOString(), changed_by: actorId })
        .eq("id", (sub as any).id);
    }

    // Log event
    await this.client.from("subscription_events").insert({
      subscription_id: (sub as any)?.id ?? null,
      tenant_id: tenantId,
      event_type: "suspended",
      actor_id: actorId,
    });

    return true;
  }

  /** Reactivate a suspended subscription */
  async reactivateSubscription(tenantId: string, actorId: string): Promise<boolean> {
    if (!this.isConnected) return false;

    const { data: sub } = await this.client
      .from("subscriptions")
      .select("id")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (sub) {
      await this.client
        .from("subscriptions")
        .update({ status: "active", changed_at: new Date().toISOString(), changed_by: actorId })
        .eq("id", (sub as any).id);
    }

    await this.client.from("subscription_events").insert({
      subscription_id: (sub as any)?.id ?? null,
      tenant_id: tenantId,
      event_type: "reactivated",
      actor_id: actorId,
    });

    return true;
  }

  /** Cancel a subscription */
  async cancelSubscription(tenantId: string, actorId: string): Promise<boolean> {
    if (!this.isConnected) return false;

    const { data: sub } = await this.client
      .from("subscriptions")
      .select("id")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing", "past_due"])
      .maybeSingle();

    if (sub) {
      await this.client
        .from("subscriptions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          changed_at: new Date().toISOString(),
          changed_by: actorId,
        })
        .eq("id", (sub as any).id);
    }

    await this.client.from("subscription_events").insert({
      subscription_id: (sub as any)?.id ?? null,
      tenant_id: tenantId,
      event_type: "canceled",
      actor_id: actorId,
    });

    return true;
  }

  /** Get subscription event history for a tenant */
  async getSubscriptionHistory(tenantId: string): Promise<any[]> {
    if (!this.isConnected) return [];

    const { data, error } = await this.client
      .from("subscription_events")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) return this.handleError(error, "getSubscriptionHistory");

    return data || [];
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  private resolvePackageName(packageId: string | null | undefined): string {
    if (!packageId) return "basic";
    // Map known package UUIDs to slug names (from migration 005 seed data)
    const map: Record<string, string> = {
      "00000000-0000-0000-0000-000000000101": "basic",
      "00000000-0000-0000-0000-000000000102": "professional",
      "00000000-0000-0000-0000-000000000103": "enterprise",
    };
    return map[packageId] ?? "basic";
  }
}
