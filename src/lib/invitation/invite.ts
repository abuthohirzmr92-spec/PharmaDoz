"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import type { TenantRole } from "@/types";
import { getPackageUserLimit } from "@/lib/quota-guard";
import { sendInvitationEmail } from "@/lib/email/send-invitation";
import { ROLE_LABELS } from "@/lib/auth/roles";

async function checkUserQuota(
  db: any,
  tenantId: string,
): Promise<{ allowed: boolean; packageName: string; maxUsers: number; currentUsers: number; error?: string }> {
  const { data: tp } = await db
    .from("tenants")
    .select("package_id, tenant_packages!inner(name)")
    .eq("id", tenantId)
    .single();

  const packageName: string = (tp as any)?.tenant_packages?.name ?? "basic";
  const maxUsers = getPackageUserLimit(packageName);

  const { count: currentUsers } = await db
    .from("tenant_users")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  const current = currentUsers ?? 0;
  if (current >= maxUsers) {
    return {
      allowed: false,
      packageName,
      maxUsers,
      currentUsers: current,
      error: `Paket ${packageName} hanya mendukung maksimal ${maxUsers} pengguna. Silakan upgrade paket untuk menambah pengguna.`,
    };
  }
  return { allowed: true, packageName, maxUsers, currentUsers: current };
}

// ============================================================================
// inviteUser — buat token undangan untuk user baru
// ============================================================================

export async function inviteUser(input: {
  tenantId: string;
  email: string;
  role: TenantRole;
  branchId?: string;
  tenantName?: string;
  branchName?: string;
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

  // Branch assignment required for restricted roles
  const BRANCH_REQUIRED_ROLES: TenantRole[] = ["pharmacist", "cashier", "staff"];
  if (BRANCH_REQUIRED_ROLES.includes(input.role) && !input.branchId) {
    return { success: false, error: "Cabang wajib dipilih untuk peran ini." };
  }

  // Quota enforcement — check user limit against tenant package
  const quota = await checkUserQuota(db, input.tenantId);
  if (!quota.allowed) {
    return { success: false, error: quota.error };
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

  // Fire email asynchronously — don't block the response
  sendInvitationEmail({
    to: input.email,
    token: inviteData.token,
    tenantName: input.tenantName ?? "Apotek",
    roleLabel: ROLE_LABELS[input.role] ?? input.role,
    branchName: input.branchName ?? null,
  }).catch((err) => console.error("[invite] Email send failed:", err));

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

  // Re-validate: restricted roles must have assigned branch
  const BRANCH_REQUIRED_ROLES: string[] = ["pharmacist", "cashier", "staff"];
  if (BRANCH_REQUIRED_ROLES.includes(invite.role) && !invite.assigned_branch_id) {
    return { success: false, error: "Undangan tidak valid: data cabang hilang. Minta pemilik untuk mengirim ulang." };
  }

  // Quota enforcement — re-check before accepting (prevent race with concurrent invites)
  const acceptQuota = await checkUserQuota(db, invite.tenant_id);
  if (!acceptQuota.allowed) {
    return { success: false, error: acceptQuota.error };
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

    // Guard duplicate membership — existing user path
    const { data: existingMember } = await db
      .from("tenant_users")
      .select("id, is_active")
      .eq("tenant_id", invite.tenant_id)
      .eq("user_id", existingUserId)
      .maybeSingle();

    if (existingMember) {
      if (existingMember.is_active) {
        return { success: false, error: "Anda sudah menjadi anggota tenant ini." };
      }
      // Re-activate inactive membership
      await db
        .from("tenant_users")
        .update({
          is_active: true,
          role: invite.role,
          assigned_branch_id: invite.assigned_branch_id ?? null,
        })
        .eq("id", existingMember.id);
    } else {
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
    }

    // Update profile.tenant_id so getUserBySupabaseUid can resolve the role
    await db
      .from("profiles")
      .update({ tenant_id: invite.tenant_id, updated_at: new Date().toISOString() })
      .eq("id", existingUserId);

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

  // 4. Guard duplicate membership — new user path
  const { data: existingMemberNew } = await db
    .from("tenant_users")
    .select("id, is_active")
    .eq("tenant_id", invite.tenant_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMemberNew) {
    if (existingMemberNew.is_active) {
      return { success: false, error: "Anda sudah menjadi anggota tenant ini." };
    }
    // Re-activate inactive membership
    await db
      .from("tenant_users")
      .update({
        is_active: true,
        role: invite.role,
        assigned_branch_id: invite.assigned_branch_id ?? null,
      })
      .eq("id", existingMemberNew.id);
  } else {
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
  }

  // Update profile.tenant_id so getUserBySupabaseUid can resolve the role
  await db
    .from("profiles")
    .update({ tenant_id: invite.tenant_id, updated_at: new Date().toISOString() })
    .eq("id", userId);

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

// ============================================================================
// Types for invitation listing
// ============================================================================

export interface TenantInvitation {
  id: string;
  email: string;
  role: TenantRole;
  branchId: string | null;
  branchName: string | null;
  invitedBy: string | null;
  invitedByName: string | null;
  status: "pending" | "used" | "expired";
  invitedAt: string;
  expiresAt: string;
  usedAt: string | null;
  token: string;
}

// ============================================================================
// listInvitations — daftar semua undangan dalam tenant (pending/used/expired)
// ============================================================================

export async function listInvitations(
  tenantId: string,
): Promise<{ success: boolean; invitations?: TenantInvitation[]; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: "Anda harus login terlebih dahulu." };
  }

  const { data: invitations, error } = await db
    .from("invitation_tokens")
    .select(`
      id,
      email,
      role,
      assigned_branch_id,
      is_used,
      invited_by,
      used_at,
      created_at,
      expires_at,
      token,
      branch:assigned_branch_id(name),
      inviter:invited_by(display_name)
    `)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  const now = new Date();

  const mapped: TenantInvitation[] = (invitations ?? []).map((inv: any) => {
    const isExpired = !inv.is_used && new Date(inv.expires_at) < now;
    let status: TenantInvitation["status"];
    if (inv.is_used) {
      status = "used";
    } else if (isExpired) {
      status = "expired";
    } else {
      status = "pending";
    }

    return {
      id: inv.id,
      email: inv.email,
      role: inv.role as TenantRole,
      branchId: inv.assigned_branch_id ?? null,
      branchName: inv.branch?.name ?? null,
      invitedBy: inv.invited_by ?? null,
      invitedByName: inv.inviter?.display_name ?? null,
      status,
      invitedAt: inv.created_at,
      expiresAt: inv.expires_at,
      usedAt: inv.used_at ?? null,
      token: inv.token,
    };
  });

  return { success: true, invitations: mapped };
}

// ============================================================================
// resendInvitation — buat token baru untuk email yang sama (kirim ulang)
// ============================================================================
// Tidak bisa UPDATE invitation_tokens karena RLS tidak mengizinkan direct UPDATE.
// Sebagai gantinya, kita INSERT token baru; token lama dibiarkan expire natural.
// ============================================================================

export async function resendInvitation(
  invitationId: string,
  tenantId: string,
  tenantName?: string,
  branchName?: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: "Anda harus login terlebih dahulu." };
  }

  // Validasi invitation milik tenant ini
  const { data: existing } = await db
    .from("invitation_tokens")
    .select("id, email, role, assigned_branch_id, is_used")
    .eq("id", invitationId)
    .eq("tenant_id", tenantId)
    .single();

  if (!existing) {
    return { success: false, error: "Undangan tidak ditemukan." };
  }

  if (existing.is_used) {
    return { success: false, error: "Undangan sudah digunakan, tidak bisa dikirim ulang." };
  }

  // Insert token baru (token lama dibiarkan expire natural)
  const { data: newInvite, error: insertError } = await db
    .from("invitation_tokens")
    .insert({
      tenant_id: tenantId,
      email: existing.email,
      role: existing.role,
      assigned_branch_id: existing.assigned_branch_id ?? null,
      invited_by: session.user.id,
    })
    .select("token")
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // Fire email asynchronously
  sendInvitationEmail({
    to: existing.email,
    token: newInvite.token,
    tenantName: tenantName ?? "Apotek",
    roleLabel: ROLE_LABELS[existing.role as TenantRole] ?? existing.role,
    branchName: branchName ?? null,
  }).catch((err) => console.error("[invite] Resend email failed:", err));

  return { success: true, token: newInvite.token };
}
