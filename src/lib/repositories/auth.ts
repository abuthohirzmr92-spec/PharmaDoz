import { BaseRepository } from "./base";
import type { UserProfile, AppRole, SystemRole, TenantRole, Permission, Role, Tenant } from "@/types";

export class AuthRepository extends BaseRepository {
  /* ------------------------------------------------------------------ */
  /*  Profile lookup (profiles table)                                    */
  /* ------------------------------------------------------------------ */

  async getProfileByUserId(userId: string): Promise<UserProfile | null> {
    if (!this.isConnected) return null;

    const { data, error } = await this.client
      .from("profiles")
      .select(`*`)
      .eq("id", userId)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "getProfileByUserId");
    }

    const profile = data as any;
    return {
      id: profile.id,
      email: profile.email ?? "",
      displayName: profile.display_name ?? "",
      role: (profile.role as AppRole) ?? "staff",
      systemRole: profile.role === "super_admin" ? (profile.role as SystemRole) : undefined,
      isActive: profile.is_active ?? true,
      tenantId: profile.tenant_id ?? undefined,
      avatarUrl: profile.avatar_url ?? null,
      phone: profile.phone ?? null,
      lastLoginAt: profile.last_login_at ?? null,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Supabase UID lookup (legacy users table → profiles migration)       */
  /* ------------------------------------------------------------------ */

  async getUserBySupabaseUid(supabaseUid: string): Promise<UserProfile | null> {
    if (!this.isConnected) return null;

    // Try profiles table first (new schema)
    const { data: profileData, error: profileError } = await this.client
      .from("profiles")
      .select(`*, tenant:tenant_id(id, name, slug)`)
      .eq("id", supabaseUid)
      .is("deleted_at", null)
      .single();

    if (!profileError && profileData) {
      const p = profileData as any;
      return {
        id: p.id,
        email: p.email ?? "",
        displayName: p.display_name ?? "",
        role: (p.role as AppRole) ?? "staff",
        systemRole: p.role === "super_admin" ? (p.role as SystemRole) : undefined,
        isActive: p.is_active ?? true,
        tenantId: p.tenant_id ?? undefined,
        tenantName: p.tenant?.name ?? undefined,
        pharmacyId: p.tenant_id ?? undefined,
        pharmacyName: p.tenant?.name ?? undefined,
        avatarUrl: p.avatar_url ?? null,
        phone: p.phone ?? null,
        lastLoginAt: p.last_login_at ?? null,
      };
    }

    // Fallback: legacy users table
    const { data, error } = await this.client
      .from("users")
      .select(`*, role:role_id(name), pharmacy:cabang_id(id, name)`)
      .is("deleted_at", null)
      .eq("supabase_uid", supabaseUid)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "getUserBySupabaseUid");
    }

    const role = ((data as any).role?.name as AppRole) ?? ("cashier" as AppRole);

    return {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      role,
      systemRole: role === "super_admin" ? (role as SystemRole) : undefined,
      isActive: data.is_active,
      pharmacyId: (data as any).pharmacy?.id ?? undefined,
      pharmacyName: (data as any).pharmacy?.name ?? undefined,
      tenantId: (data as any).pharmacy?.id ?? undefined,
      tenantName: (data as any).pharmacy?.name ?? undefined,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Legacy email lookup                                                 */
  /* ------------------------------------------------------------------ */

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    if (!this.isConnected) return null;

    const { data, error } = await this.client
      .from("users")
      .select(`*, role:role_id(name), pharmacy:cabang_id(id, name)`)
      .is("deleted_at", null)
      .eq("email", email)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "getUserByEmail");
    }

    const role = ((data as any).role?.name as AppRole) ?? ("cashier" as AppRole);

    return {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      role,
      systemRole: role === "super_admin" ? (role as SystemRole) : undefined,
      isActive: data.is_active,
      pharmacyId: (data as any).pharmacy?.id ?? undefined,
      pharmacyName: (data as any).pharmacy?.name ?? undefined,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Tenant context                                                      */
  /* ------------------------------------------------------------------ */

  async getTenantForProfile(profileId: string): Promise<Tenant | null> {
    if (!this.isConnected) return null;

    const { data: profile, error: profileError } = await this.client
      .from("profiles")
      .select("tenant_id")
      .eq("id", profileId)
      .single();

    if (profileError || !(profile as any)?.tenant_id) return null;

    const { data: tenant, error } = await this.client
      .from("tenants")
      .select("*")
      .eq("id", (profile as any).tenant_id)
      .is("deleted_at", null)
      .single();

    if (error) return this.handleError(error, "getTenantForProfile");

    const t = tenant as any;
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      domain: t.domain ?? null,
      settings: t.settings ?? {},
      isActive: t.is_active,
      createdAt: t.created_at ?? new Date().toISOString(),
      updatedAt: t.updated_at ?? new Date().toISOString(),
    };
  }

  async getTenantRole(userId: string, tenantId: string): Promise<TenantRole | null> {
    if (!this.isConnected) return null;

    const { data, error } = await this.client
      .from("tenant_users")
      .select("role")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .single();

    if (error) return null;
    return (data as any)?.role as TenantRole ?? null;
  }

  /* ------------------------------------------------------------------ */
  /*  Permissions & Roles                                                 */
  /* ------------------------------------------------------------------ */

  async getUserPermissions(userId: string): Promise<Permission[]> {
    if (!this.isConnected) return [];

    const { data: user, error: userError } = await this.client
      .from("users")
      .select("role_id")
      .eq("id", userId)
      .single();

    if (userError) {
      if (userError.code === "PGRST116") return [];
      return this.handleError(userError, "getUserPermissions");
    }

    const { data, error } = await this.client
      .from("role_permissions")
      .select(`permission:permission_id(key)`)
      .eq("role_id", user.role_id);

    if (error) return this.handleError(error, "getUserPermissions");

    return ((data as any[]) || [])
      .map((rp: any) => rp.permission?.key as Permission)
      .filter((k: Permission | undefined): k is Permission => !!k);
  }

  async getRoles(): Promise<Role[]> {
    if (!this.isConnected) return [];

    const { data, error } = await this.client.from("roles").select("name");

    if (error) return this.handleError(error, "getRoles");

    return (data || []).map((r: Record<string, unknown>) => (r as any).name as Role);
  }

  async getPermissions(): Promise<Permission[]> {
    if (!this.isConnected) return [];

    const { data, error } = await this.client
      .from("permissions")
      .select("key");

    if (error) return this.handleError(error, "getPermissions");

    return (data || []).map((p: Record<string, unknown>) => (p as any).key as Permission);
  }

  /* ------------------------------------------------------------------ */
  /*  Profile creation (first login)                                     */
  /* ------------------------------------------------------------------ */

  async ensureProfile(params: {
    id: string;
    email: string;
    displayName: string;
  }): Promise<UserProfile | null> {
    if (!this.isConnected) return null;

    // Try to get existing profile first
    const existing = await this.getProfileByUserId(params.id);
    if (existing) return existing;

    // Create profile from auth user data
    const { error } = await this.client.from("profiles").upsert({
      id: params.id,
      display_name: params.displayName,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (error) return this.handleError(error, "ensureProfile");

    return {
      id: params.id,
      email: params.email,
      displayName: params.displayName,
      role: "staff",
      isActive: true,
    };
  }
}
