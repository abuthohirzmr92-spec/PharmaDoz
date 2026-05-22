"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import type { TenantRole } from "@/types";

// ============================================================================
// inviteUser — buat token undangan untuk user baru
// ============================================================================

export async function inviteUser(input: {
  tenantId: string;
  email: string;
  role: TenantRole;
  branchId?: string;
}): Promise<{ success: boolean; token?: string; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  // Validasi session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: "Anda harus login terlebih dahulu." };
  }

  // Validasi caller role — hanya tenant_owner dan admin yang bisa invite
  const { data: callerMembership } = await db
    .from("tenant_users")
    .select("role")
    .eq("tenant_id", input.tenantId)
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .single();

  if (!callerMembership || !["tenant_owner", "admin"].includes(callerMembership.role)) {
    return { success: false, error: "Anda tidak memiliki izin untuk mengundang pengguna." };
  }

  // Tidak bisa invite tenant_owner (hanya satu owner per tenant)
  if (input.role === "tenant_owner") {
    return { success: false, error: "Tidak dapat mengundang dengan peran Pemilik. Hanya ada satu pemilik per tenant." };
  }

  // Cek apakah email sudah jadi anggota tenant
  // (Duplikasi dicegah oleh UNIQUE constraint tenant_users(tenant_id, user_id) di DB.
  //  Untuk pengecekan email, kita hanya verifikasi tidak ada undangan pending.)

  // Cek apakah sudah ada invitation pending untuk email ini di tenant ini
  const { data: existingInvite } = await db
    .from("invitation_tokens")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("email", input.email)
    .eq("is_used", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (existingInvite) {
    return { success: false, error: "Email ini sudah memiliki undangan yang masih berlaku." };
  }

  // Insert invitation token
  const { data: inviteData, error: insertError } = await db
    .from("invitation_tokens")
    .insert({
      tenant_id: input.tenantId,
      email: input.email,
      role: input.role,
      assigned_branch_id: input.branchId ?? null,
      invited_by: session.user.id,
    })
    .select("token")
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true, token: inviteData.token };
}

// ============================================================================
// acceptInvitation — user menerima undangan, set password, jadi tenant member
// ============================================================================

export async function acceptInvitation(input: {
  token: string;
  password: string;
  displayName: string;
}): Promise<{ success: boolean; email?: string; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  // 1. Validasi token
  const { data: invite } = await db
    .from("invitation_tokens")
    .select("id, token, tenant_id, email, role, assigned_branch_id, is_used, expires_at")
    .eq("token", input.token)
    .single();

  if (!invite) {
    return { success: false, error: "Link undangan tidak valid." };
  }

  if (invite.is_used) {
    return { success: false, error: "Link undangan sudah digunakan." };
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { success: false, error: "Link undangan sudah kadaluarsa (7 hari). Minta pemilik untuk mengirim ulang." };
  }

  // 2. Buat akun Supabase Auth via signUp
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: invite.email,
    password: input.password,
    options: { data: { display_name: input.displayName } },
  });

  if (authError) {
    if (authError.message === "User already registered") {
      // User sudah punya akun — lanjut ke assign tenant
    } else {
      return { success: false, error: authError.message };
    }
  }

  const userId = authData?.user?.id;
  if (!userId) {
    // Coba login untuk dapatkan user ID jika sudah registered
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: invite.email,
      password: input.password,
    });

    if (signInError || !signInData.user) {
      return { success: false, error: "Gagal mendapatkan data pengguna. Coba login dengan email dan password Anda." };
    }

    // Lanjut dengan user ID yang sudah ada
    const existingUserId = signInData.user.id;

    // Update display_name di metadata jika akun sudah ada
    await supabase.auth.updateUser({ data: { display_name: input.displayName } });

    // Insert ke tenant_users
    const { error: insertError } = await db
      .from("tenant_users")
      .insert({
        tenant_id: invite.tenant_id,
        user_id: existingUserId,
        role: invite.role,
        assigned_branch_id: invite.assigned_branch_id ?? null,
        is_active: true,
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Mark token as used
    await db
      .from("invitation_tokens")
      .update({
        is_used: true,
        used_by: existingUserId,
        used_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    return { success: true, email: invite.email };
  }

  // 3. Pastikan profile dibuat (trigger auto_profile seharusnya sudah handle via handle_new_user)
  // Tunggu sebentar untuk trigger
  await new Promise((r) => setTimeout(r, 500));

  // 4. Insert ke tenant_users
  const { error: insertError } = await db
    .from("tenant_users")
    .insert({
      tenant_id: invite.tenant_id,
      user_id: userId,
      role: invite.role,
      assigned_branch_id: invite.assigned_branch_id ?? null,
      is_active: true,
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // 5. Mark token as used
  await db
    .from("invitation_tokens")
    .update({
      is_used: true,
      used_by: userId,
      used_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  return { success: true, email: invite.email };
}
