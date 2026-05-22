"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import type { TenantRole } from "@/types";

// ============================================================================
// listTenantMembers — daftar semua user dalam tenant
// ============================================================================

export interface TenantMember {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: TenantRole;
  branchId: string | null;
  branchName: string | null;
  branchCode: string | null;
  isActive: boolean;
  joinedAt: string | null;
}

export async function listTenantMembers(
  tenantId: string,
): Promise<{ success: boolean; members?: TenantMember[]; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: "Anda harus login terlebih dahulu." };
  }

  const { data: members, error } = await db
    .from("tenant_users")
    .select(`
      id,
      user_id,
      role,
      is_active,
      joined_at,
      assigned_branch_id,
      profile:user_id!inner(display_name),
      branch:assigned_branch_id(name, code)
    `)
    .eq("tenant_id", tenantId)
    .order("role", { ascending: true })
    .order("joined_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  // Ambil email dari auth.users (tidak bisa via anon client)
  // Email akan ditampilkan sebagai "—" jika tidak tersedia

  const mapped = ((members as any[]) || []).map((m: any) => ({
    id: m.id,
    userId: m.user_id,
    displayName: m.profile?.display_name ?? "—",
    email: "—", // auth.users email not accessible via anon key
    role: m.role as TenantRole,
    branchId: m.assigned_branch_id ?? null,
    branchName: m.branch?.name ?? null,
    branchCode: m.branch?.code ?? null,
    isActive: m.is_active,
    joinedAt: m.joined_at ?? null,
  }));

  return { success: true, members: mapped };
}

// ============================================================================
// updateMemberRole — ubah peran user dalam tenant
// ============================================================================

export async function updateMemberRole(
  membershipId: string,
  tenantId: string,
  newRole: TenantRole,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: "Anda harus login terlebih dahulu." };
  }

  // Validasi caller role
  const { data: caller } = await db
    .from("tenant_users")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .single();

  if (!caller) {
    return { success: false, error: "Anda bukan anggota tenant ini." };
  }

  // Hanya tenant_owner yang bisa ubah role
  if (caller.role !== "tenant_owner") {
    return { success: false, error: "Hanya pemilik yang dapat mengubah peran pengguna." };
  }

  // Tidak bisa ubah role menjadi tenant_owner
  if (newRole === "tenant_owner") {
    return { success: false, error: "Hanya ada satu pemilik per tenant." };
  }

  // Validasi target — tidak bisa ubah role diri sendiri
  const { data: target } = await db
    .from("tenant_users")
    .select("id, user_id, role")
    .eq("id", membershipId)
    .eq("tenant_id", tenantId)
    .single();

  if (!target) {
    return { success: false, error: "Pengguna tidak ditemukan." };
  }

  if (target.user_id === session.user.id) {
    return { success: false, error: "Anda tidak dapat mengubah peran Anda sendiri." };
  }

  // Tidak bisa ubah role tenant_owner lain
  if (target.role === "tenant_owner") {
    return { success: false, error: "Tidak dapat mengubah peran pemilik tenant." };
  }

  const { error } = await db
    .from("tenant_users")
    .update({ role: newRole })
    .eq("id", membershipId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// updateBranchAssignment — ubah branch assignment user
// ============================================================================

export async function updateBranchAssignment(
  membershipId: string,
  tenantId: string,
  branchId: string | null,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: "Anda harus login terlebih dahulu." };
  }

  const { error } = await db
    .from("tenant_users")
    .update({ assigned_branch_id: branchId })
    .eq("id", membershipId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// removeMember — nonaktifkan keanggotaan user dalam tenant
// ============================================================================

export async function removeMember(
  membershipId: string,
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: "Anda harus login terlebih dahulu." };
  }

  const { data: target } = await db
    .from("tenant_users")
    .select("user_id, role")
    .eq("id", membershipId)
    .eq("tenant_id", tenantId)
    .single();

  if (!target) {
    return { success: false, error: "Pengguna tidak ditemukan." };
  }

  if (target.user_id === session.user.id) {
    return { success: false, error: "Anda tidak dapat menghapus diri sendiri." };
  }

  if (target.role === "tenant_owner") {
    return { success: false, error: "Tidak dapat menghapus pemilik tenant." };
  }

  const { error } = await db
    .from("tenant_users")
    .update({ is_active: false })
    .eq("id", membershipId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
