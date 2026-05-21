import { BaseRepository } from "./base";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import type { UserProfile, AppRole, SystemRole, TenantRole, Permission, Role, Tenant } from "@/types";

const DEV = process.env.NODE_ENV === "development";
function repoLog(...args: unknown[]) {
  if (DEV) console.log("[auth-repo]", ...args);
}

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
      repoLog("getProfileByUserId error:", error.message, error.code);
      return null;
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
  /*  Supabase UID lookup — profile first, tenant info separately         */
  /*  Tenant info is read in a SEPARATE query so tenant RLS cannot       */
  /*  block the profile read itself.                                      */
  /* ------------------------------------------------------------------ */

  async getUserBySupabaseUid(supabaseUid: string): Promise<UserProfile | null> {
    if (!this.isConnected) return null;

    /* 1. Read profile WITHOUT tenant join */
    const { data: profileData, error: profileError } = await this.client
      .from("profiles")
      .select("*")
      .eq("id", supabaseUid)
      .is("deleted_at", null)
      .single();

    if (profileError) {
      if (profileError.code === "PGRST116") {
        repoLog("getUserBySupabaseUid: no profile row for", supabaseUid);
        return null;
      }
      /* Non-PGRST116: RLS permission error, network error, etc.
       * Return null so callers can try ensureProfile instead of crashing. */
      repoLog("getUserBySupabaseUid: profiles query error:", profileError.message, profileError.code);
      return null;
    }

    if (!profileData) return null;

    const p = profileData as any;

    const profile: UserProfile = {
      id: p.id,
      email: p.email ?? "",
      displayName: p.display_name ?? "",
      role: (p.role as AppRole) ?? "staff",
      systemRole: isSuperAdmin(p.role as AppRole) ? (p.role as SystemRole) : undefined,
      isActive: p.is_active ?? true,
      tenantId: p.tenant_id ?? undefined,
      pharmacyId: p.tenant_id ?? undefined,
      avatarUrl: p.avatar_url ?? null,
      phone: p.phone ?? null,
      lastLoginAt: p.last_login_at ?? null,
    };

    /* 2. If profile has tenant_id, resolve tenant info in a separate query.
     *    This way, even if tenant RLS blocks the tenant read, the profile
     *    itself is already hydrated and login can proceed. */
    if (p.tenant_id) {
      try {
        const { data: tenantData, error: tenantError } = await this.client
          .from("tenants")
          .select("id, name, slug")
          .eq("id", p.tenant_id)
          .is("deleted_at", null)
          .single();

        if (!tenantError && tenantData) {
          const t = tenantData as any;
          profile.tenantName = t.name ?? undefined;
          profile.pharmacyName = t.name ?? undefined;
        } else if (tenantError && tenantError.code !== "PGRST116") {
          repoLog("getUserBySupabaseUid: tenant lookup error (non-fatal):", tenantError.message);
        }
      } catch (tenantErr) {
        /* Non-fatal: profile is valid even without tenant name */
        repoLog("getUserBySupabaseUid: tenant lookup exception (non-fatal):", tenantErr);
      }
    }

    return profile;
  }

  /* ------------------------------------------------------------------ */
  /*  Legacy email lookup                                                 */
  /* ------------------------------------------------------------------ */

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    if (!this.isConnected) return null;

    /* Try profiles table first */
    const { data: profileData, error: profileError } = await this.client
      .from("profiles")
      .select("*")
      .is("deleted_at", null)
      .eq("email", email)
      .single();

    if (!profileError && profileData) {
      const p = profileData as any;
      return {
        id: p.id,
        email: p.email ?? "",
        displayName: p.display_name ?? "",
        role: (p.role as AppRole) ?? "staff",
        systemRole: isSuperAdmin(p.role as AppRole) ? (p.role as SystemRole) : undefined,
        isActive: p.is_active ?? true,
        tenantId: p.tenant_id ?? undefined,
        pharmacyId: p.tenant_id ?? undefined,
        avatarUrl: p.avatar_url ?? null,
      };
    }

    /* Fallback: legacy users table */
    try {
      const { data, error } = await this.client
        .from("users")
        .select(`*, role:role_id(name), pharmacy:cabang_id(id, name)`)
        .is("deleted_at", null)
        .eq("email", email)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        repoLog("getUserByEmail legacy error:", error.message);
        return null;
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
    } catch {
      return null;
    }
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
  /*  Profile creation (first login / missing profile)                    */
  /* ------------------------------------------------------------------ */

  async ensureProfile(params: {
    id: string;
    email: string;
    displayName: string;
  }): Promise<UserProfile | null> {
    if (!this.isConnected) return null;

    /* 1. Try getUserBySupabaseUid first (profile + optional tenant info) */
    const existing = await this.getUserBySupabaseUid(params.id);
    if (existing) {
      repoLog("ensureProfile: profile already exists for", params.id);
      return existing;
    }

    /* 2. Double-check with getProfileByUserId (different query path) */
    try {
      const byUserId = await this.getProfileByUserId(params.id);
      if (byUserId) {
        repoLog("ensureProfile: found via getProfileByUserId for", params.id);
        return byUserId;
      }
    } catch {
      /* Non-fatal */
    }

    /* 3. Profile truly missing — try upsert.
     *    Use onConflict("id") so it's safe even on race conditions. */
    repoLog("ensureProfile: upserting profile for", params.id);
    try {
      const { error } = await this.client.from("profiles").upsert(
        {
          id: params.id,
          display_name: params.displayName,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      if (error) {
        repoLog("ensureProfile: upsert error:", error.message, error.code);
        /* If upsert fails (e.g. RLS INSERT policy), return a minimal
         * in-memory profile so login can still proceed. The profile
         * can be repaired later by a super admin. */
        return {
          id: params.id,
          email: params.email,
          displayName: params.displayName,
          role: "staff",
          isActive: true,
        };
      }
    } catch (upsertErr) {
      repoLog("ensureProfile: upsert exception:", upsertErr);
      return {
        id: params.id,
        email: params.email,
        displayName: params.displayName,
        role: "staff",
        isActive: true,
      };
    }

    /* 4. Read back the newly created profile */
    const created = await this.getUserBySupabaseUid(params.id);
    if (created) return created;

    /* 5. Fallback: return a minimal in-memory profile */
    repoLog("ensureProfile: could not read back created profile, returning minimal");
    return {
      id: params.id,
      email: params.email,
      displayName: params.displayName,
      role: "staff",
      isActive: true,
    };
  }
}
