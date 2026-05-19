import { BaseRepository } from "./base";
import type { UserProfile, AppRole, SystemRole, Permission, Role } from "@/types";

export class AuthRepository extends BaseRepository {
  /* ------------------------------------------------------------------ */
  /*  Users & Roles                                                      */
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
      systemRole: ["super_admin", "developer", "support"].includes(role)
        ? (role as SystemRole)
        : undefined,
      isActive: data.is_active,
      pharmacyId: (data as any).pharmacy?.id ?? undefined,
      pharmacyName: (data as any).pharmacy?.name ?? undefined,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Supabase UID lookup                                                 */
  /* ------------------------------------------------------------------ */

  async getUserBySupabaseUid(supabaseUid: string): Promise<UserProfile | null> {
    if (!this.isConnected) return null;

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
      systemRole: ["super_admin", "developer", "support"].includes(role)
        ? (role as SystemRole)
        : undefined,
      isActive: data.is_active,
      pharmacyId: (data as any).pharmacy?.id ?? undefined,
      pharmacyName: (data as any).pharmacy?.name ?? undefined,
    };
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    if (!this.isConnected) return [];

    // Step 1: resolve the user's role_id
    const { data: user, error: userError } = await this.client
      .from("users")
      .select("role_id")
      .eq("id", userId)
      .single();

    if (userError) {
      if (userError.code === "PGRST116") return [];
      return this.handleError(userError, "getUserPermissions");
    }

    // Step 2: fetch permission keys for that role
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
}
