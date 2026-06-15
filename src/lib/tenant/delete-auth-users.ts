"use server";

import { createClient } from "@supabase/supabase-js";

/**
 * Delete ALL auth.users belonging to a tenant.
 * Uses service_role key — only callable from server actions.
 * This frees the email addresses for re-registration.
 *
 * User IDs are sourced from:
 *   - tenant_users.user_id (all tenant members)
 *   - users.supabase_uid / users.id (fallback, migration 001 schema)
 *
 * Call this BEFORE hard_delete_tenant RPC.
 * Global product catalog (global_products) is NEVER touched.
 */
export async function deleteTenantAuthUsers(
  tenantId: string,
): Promise<{ success: boolean; deleted: number; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return {
      success: false,
      deleted: 0,
      error: "SUPABASE_SERVICE_ROLE_KEY tidak dikonfigurasi. Tambahkan ke .env.local.",
    };
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ------------------------------
  // 1. Get all user IDs for this tenant via tenant_users
  // ------------------------------
  const { data: memberships, error: memberError } = await adminClient
    .from("tenant_users")
    .select("user_id")
    .eq("tenant_id", tenantId);

  if (memberError) {
    return { success: false, deleted: 0, error: `Gagal memuat user tenant: ${memberError.message}` };
  }

  // Also try users table (migration 001) if it exists (pre-profiles production)
  let extraUserIds: string[] = [];
  try {
    const { data: users } = await adminClient
      .from("users")
      .select("supabase_uid, id")
      .eq("tenant_id", tenantId);

    if (users) {
      for (const u of users as any[]) {
        const uid = u.supabase_uid || u.id;
        if (uid) extraUserIds.push(uid);
      }
    }
  } catch {
    // users table might not have tenant_id column — ignore
  }

  const userIds = new Set<string>();
  for (const m of memberships || []) {
    if (m.user_id) userIds.add(m.user_id);
  }
  for (const uid of extraUserIds) {
    userIds.add(uid);
  }

  if (userIds.size === 0) {
    return { success: true, deleted: 0 };
  }

  // ------------------------------
  // 2. Delete each auth user
  // ------------------------------
  let deleted = 0;
  const errors: string[] = [];

  for (const userId of userIds) {
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
      // User might already be deleted or not exist
      if (error.message?.includes("not found") || error.message?.includes("already")) {
        deleted++;
        continue;
      }
      errors.push(`${userId.slice(0, 8)}...: ${error.message}`);
    } else {
      deleted++;
    }
  }

  if (errors.length > 0) {
    return {
      success: true,
      deleted,
      error: `Beberapa user gagal dihapus: ${errors.join("; ")}`,
    };
  }

  return { success: true, deleted };
}
