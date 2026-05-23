"use server";

import { createServerSupabase } from "@/lib/supabase/server";
export interface UserPermissionOverride {
  id: string;
  tenantId: string;
  userId: string;
  permission: string;
  granted: boolean;
  setBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch all permission overrides for a specific user in a tenant.
 * Caller must be authenticated and be a tenant_owner.
 */
export async function getUserOverrides(
  tenantId: string,
  userId: string,
): Promise<{ success: boolean; overrides?: UserPermissionOverride[]; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: "Anda harus login terlebih dahulu." };
  }

  // Only tenant_owner can view overrides (for managing other users)
  // Users can still read their OWN overrides via RLS (select_own policy)
  const { data: caller } = await db
    .from("tenant_users")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .single();

  const isOwner = caller?.role === "tenant_owner";
  const isSelf = session.user.id === userId;

  if (!isOwner && !isSelf) {
    return { success: false, error: "Anda tidak memiliki izin." };
  }

  let query = db
    .from("user_permission_overrides")
    .select("id, tenant_id, user_id, permission, granted, set_by, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);

  // RLS will enforce: tenant_owner can see override, users can see own
  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  const overrides: UserPermissionOverride[] = ((data as any[]) || []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    permission: row.permission,
    granted: row.granted,
    setBy: row.set_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return { success: true, overrides };
}

/**
 * Create or update a permission override.
 * Only tenant_owner can set overrides for other users.
 */
export async function setUserOverride(
  tenantId: string,
  userId: string,
  permission: string,
  granted: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: "Anda harus login terlebih dahulu." };
  }

  const { data: caller } = await db
    .from("tenant_users")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .single();

  if (caller?.role !== "tenant_owner") {
    return { success: false, error: "Hanya pemilik tenant yang dapat mengubah izin pengguna." };
  }

  const { error } = await db
    .from("user_permission_overrides")
    .upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        permission,
        granted,
        set_by: session.user.id,
      },
      { onConflict: "tenant_id, user_id, permission" },
    );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a permission override (revert to role default).
 * Only tenant_owner can delete overrides.
 */
export async function deleteUserOverride(
  overrideId: string,
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: "Anda harus login terlebih dahulu." };
  }

  const { data: caller } = await db
    .from("tenant_users")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .single();

  if (caller?.role !== "tenant_owner") {
    return { success: false, error: "Hanya pemilik tenant yang dapat menghapus override izin." };
  }

  const { error } = await db
    .from("user_permission_overrides")
    .delete()
    .eq("id", overrideId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
