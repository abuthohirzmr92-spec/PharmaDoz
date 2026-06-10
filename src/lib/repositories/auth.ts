import { BaseRepository } from "./base";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { resolveUserRole, isSystemRoleType } from "@/lib/auth/role-resolver";
import { isDiagnosticsEnabled } from "@/lib/diagnostics";
import type { UserProfile, AppRole, SystemRole, TenantRole, Permission, Role, Tenant } from "@/types";

const DEV = process.env.NODE_ENV === "development";
function repoLog(...args: unknown[]) {
  if (DEV) console.log("[auth-repo]", ...args);
}
function diagLog(...args: unknown[]) {
  if (isDiagnosticsEnabled()) console.log("%c[DIAG]", "color:#8B5CF6", ...args);
}
function diagError(...args: unknown[]) {
  if (isDiagnosticsEnabled()) console.error("[DIAG]", ...args);
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
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      repoLog("getProfileByUserId error:", error.message, error.code);
      return null;
    }

    const profile = data as any;
    const resolved = resolveUserRole(profile.system_role, undefined);
    return {
      id: profile.id,
      email: profile.email ?? "",
      displayName: profile.display_name ?? "",
      role: resolved as AppRole,
      systemRole: isSystemRoleType(profile.system_role) ? (profile.system_role as SystemRole) : undefined,
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
      .single();

    if (profileError) {
      if (profileError.code === "PGRST116") {
        diagLog("getUserBySupabaseUid: no profile row for", supabaseUid);
        return null;
      }
      diagError("getUserBySupabaseUid: profiles query error:", profileError.message, profileError.code);
      return null;
    }

    if (!profileData) return null;

    const p = profileData as any;
    const profileRoleRaw: string | null = p.system_role ?? null;

    diagLog("getUserBySupabaseUid: profile row", {
      profileId: p.id,
      systemRole: profileRoleRaw,
      tenantId: p.tenant_id ?? null,
      isActive: p.is_active,
      displayName: p.display_name,
    });

    /* 2. System roles (super_admin, etc.) bypass tenant resolution entirely.
     *    They have no tenant_users row and must never fall back to "staff". */
    if (isSystemRoleType(profileRoleRaw)) {
      return {
        id: p.id,
        email: p.email ?? "",
        displayName: p.display_name ?? "",
        role: profileRoleRaw,
        systemRole: profileRoleRaw as SystemRole,
        isActive: p.is_active ?? true,
        tenantId: p.tenant_id ?? undefined,
        pharmacyId: p.tenant_id ?? undefined,
        assignedBranchId: undefined,
        avatarUrl: p.avatar_url ?? null,
        phone: p.phone ?? null,
        lastLoginAt: p.last_login_at ?? null,
      };
    }

    /* 3. Business user: resolve tenant info + tenant_users role in parallel */
    let tenantRole: string | null = null;

    if (p.tenant_id) {
      try {
        const [tenantResult, roleResult] = await Promise.all([
          this.client
            .from("tenants")
            .select("id, name, slug")
            .eq("id", p.tenant_id)
            .is("deleted_at", null)
            .single(),
          this.client
            .from("tenant_users")
            .select("role, assigned_branch_id")
            .eq("user_id", p.id)
            .eq("tenant_id", p.tenant_id)
            .eq("is_active", true)
            .single(),
        ]);

        const { data: tenantData, error: tenantError } = tenantResult;
        const { data: roleData, error: roleError } = roleResult;

        if (!tenantError && tenantData) {
          const t = tenantData as any;
          p._tenantName = t.name ?? undefined;
        } else if (tenantError && tenantError.code !== "PGRST116") {
          console.error("[auth-repo] tenant lookup error:", tenantError.message, tenantError.code);
        }

        if (!roleError && roleData) {
          tenantRole = (roleData as any).role ?? null;
          (p as any)._assignedBranchId = (roleData as any).assigned_branch_id ?? null;
        } else if (roleError) {
          /* Always log tenant_users lookup failures — they break role resolution.
           * PGRST116 = 0 rows — user has no active tenant_users row for this tenant. */
          console.error(
            "[auth-repo] tenant_users role lookup failed:",
            roleError.message,
            roleError.code,
            { userId: p.id, tenantId: p.tenant_id },
          );
        }
      } catch (err) {
        console.error("[auth-repo] tenant lookup exception:", err);
      }

      /* Fallback: if parallel query failed, try the dedicated getTenantRole method.
       * This is a second chance for transient RLS/network failures. */
      if (!tenantRole) {
        try {
          tenantRole = await this.getTenantRole(p.id, p.tenant_id);
          if (tenantRole) {
            console.log("[auth-repo] tenant role recovered via fallback:", tenantRole);
          }
        } catch (fallbackErr) {
          console.error("[auth-repo] fallback getTenantRole also failed:", fallbackErr);
        }
      }

      /* Hard diagnostic: user has tenant_id but we couldn't resolve a tenant role.
       * This means either the tenant_users row is missing, is_active=false, or
       * RLS is blocking the query. The profile will get role="unaffiliated" which
       * grants zero permissions — sidebar will be empty. */
      if (!tenantRole) {
        console.error(
          "[auth-repo] CRITICAL: user has tenant_id but NO tenant role resolved.",
          { userId: p.id, tenantId: p.tenant_id, profileRoleRaw },
        );
      }
    }

    const resolvedRole = resolveUserRole(profileRoleRaw, tenantRole);

    diagLog("getUserBySupabaseUid: role resolution", {
      profileRoleRaw,
      tenantRole,
      resolvedRole,
      tenantId: p.tenant_id ?? null,
      tenantName: (p as any)._tenantName ?? null,
    });

    if (resolvedRole === "unaffiliated" && p.tenant_id) {
      console.error(
        "[auth-repo] CRITICAL: role resolved to 'unaffiliated' for user with tenant_id.",
        { userId: p.id, tenantId: p.tenant_id, profileRoleRaw, tenantRole },
      );
    }

    return {
      id: p.id,
      email: p.email ?? "",
      displayName: p.display_name ?? "",
      role: resolvedRole as AppRole,
      systemRole: undefined,
      isActive: p.is_active ?? true,
      tenantId: p.tenant_id ?? undefined,
      pharmacyId: p.tenant_id ?? undefined,
      assignedBranchId: (p as any)._assignedBranchId ?? null,
      tenantName: (p as any)._tenantName ?? undefined,
      pharmacyName: (p as any)._tenantName ?? undefined,
      avatarUrl: p.avatar_url ?? null,
      phone: p.phone ?? null,
      lastLoginAt: p.last_login_at ?? null,
    };
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
      .eq("email", email)
      .single();

    if (!profileError && profileData) {
      const p = profileData as any;
      const profileRoleRaw: string | null = p.system_role ?? null;
      const resolved = resolveUserRole(profileRoleRaw, undefined);
      return {
        id: p.id,
        email: p.email ?? "",
        displayName: p.display_name ?? "",
        role: resolved as AppRole,
        systemRole: isSystemRoleType(profileRoleRaw) ? (profileRoleRaw as SystemRole) : undefined,
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

      const roleRaw = ((data as any).role?.name as string) ?? null;
      const resolved = resolveUserRole(roleRaw, undefined);

      return {
        id: data.id,
        email: data.email,
        displayName: data.display_name,
        role: resolved as AppRole,
        systemRole: isSystemRoleType(roleRaw) ? (roleRaw as SystemRole) : undefined,
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
      .select("role, assigned_branch_id")
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

    /* 1. Try getUserBySupabaseUid first (profile + optional tenant info).
     *    If the profile exists with a valid role, return it immediately.
     *    If the role is "unaffiliated" but user has a tenant_id, the
     *    tenant_users lookup failed — don't return the broken profile,
     *    continue to upsert+repair instead. */
    const existing = await this.getUserBySupabaseUid(params.id);
    if (existing && (existing.role as string) !== "unaffiliated") {
      repoLog("ensureProfile: profile already exists for", params.id);
      return existing;
    }
    if (existing && (existing.role as string) === "unaffiliated" && !existing.tenantId) {
      /* No tenant affiliation — this is fine (e.g. platform user without tenant_users row) */
      repoLog("ensureProfile: unaffiliated platform user, returning as-is");
      return existing;
    }
    if (existing) {
      console.error(
        "[auth-repo] ensureProfile: existing profile has unaffiliated role with tenant_id — attempting repair",
        { userId: params.id, tenantId: existing.tenantId },
      );
    }

    /* 2. Double-check with getProfileByUserId (different query path) */
    if (!existing) {
      try {
        const byUserId = await this.getProfileByUserId(params.id);
        if (byUserId && (byUserId.role as string) !== "unaffiliated") {
          repoLog("ensureProfile: found via getProfileByUserId for", params.id);
          return byUserId;
        }
      } catch {
        /* Non-fatal */
      }
    }

    /* 3. Profile missing or broken — try upsert.
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
        return {
          id: params.id,
          email: params.email,
          displayName: params.displayName,
          role: resolveUserRole(null, null) as AppRole,
          isActive: true,
        };
      }
    } catch (upsertErr) {
      repoLog("ensureProfile: upsert exception:", upsertErr);
      return {
        id: params.id,
        email: params.email,
        displayName: params.displayName,
        role: resolveUserRole(null, null) as AppRole,
        isActive: true,
      };
    }

    /* 4. Read back the newly created profile.
     *    getUserBySupabaseUid now has fallback retry for tenant_users lookup. */
    const created = await this.getUserBySupabaseUid(params.id);
    if (created && (created.role as string) !== "unaffiliated") {
      repoLog("ensureProfile: repair successful, role =", created.role);
      return created;
    }
    if (created) {
      console.error(
        "[auth-repo] ensureProfile: repair failed — profile still unaffiliated after upsert",
        { userId: params.id, tenantId: created.tenantId },
      );
    }

    /* 5. Last resort: try direct getTenantRole + construct profile manually */
    if (created?.tenantId) {
      try {
        const directRole = await this.getTenantRole(params.id, created.tenantId);
        if (directRole) {
          console.log("[auth-repo] ensureProfile: role recovered via direct getTenantRole:", directRole);
          return { ...created, role: directRole as AppRole };
        }
      } catch {
        /* exhausted all options */
      }
    }

    /* 6. Absolute fallback: return whatever we have (may be "unaffiliated") */
    if (created) return created;

    repoLog("ensureProfile: could not read back created profile, returning minimal");
    return {
      id: params.id,
      email: params.email,
      displayName: params.displayName,
      role: resolveUserRole(null, null) as AppRole,
      isActive: true,
    };
  }
}
