import { supabase, isSupabaseConnected } from "@/lib/supabase/client";
import type { AppRole } from "@/types";

export interface RegisterResult {
  success: boolean;
  error?: string;
  userId?: string;
}

/**
 * Register a new user via invitation flow.
 * Only tenant_owner can register; other roles must be invited.
 */
export async function registerTenantOwner(
  email: string,
  password: string,
  displayName: string,
  tenantName: string,
): Promise<RegisterResult> {
  if (!isSupabaseConnected()) {
    return { success: false, error: "Supabase tidak tersedia." };
  }

  // Step 1: Sign up with Supabase Auth
  const { data: signUpData, error: signUpError } = await supabase!.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });

  if (signUpError) {
    return {
      success: false,
      error:
        signUpError.message === "User already registered"
          ? "Email sudah terdaftar."
          : signUpError.message,
    };
  }

  if (!signUpData.user) {
    return { success: false, error: "Gagal membuat akun." };
  }

  // Step 2: Create tenant + profile in database
  // This would typically be done via a server-side API route or edge function
  // to ensure the user has proper permissions.
  // TODO: Replace with server-side API call once edge functions are deployed.
  return {
    success: true,
    userId: signUpData.user.id,
  };
}

/**
 * Invite a user to a tenant.
 * Requires tenant_owner or admin role.
 */
export async function inviteUser(
  email: string,
  role: AppRole,
  tenantId: string,
): Promise<RegisterResult> {
  if (!isSupabaseConnected()) {
    return { success: false, error: "Supabase tidak tersedia." };
  }

  // Invitation flow — typically server-side via edge function
  // TODO: Replace with server-side API call
  return {
    success: false,
    error: "Fitur undangan belum tersedia. Hubungi Super Admin.",
  };
}

/**
 * Accept an invitation and set password.
 */
export async function acceptInvitation(
  token: string,
  password: string,
): Promise<RegisterResult> {
  if (!isSupabaseConnected()) {
    return { success: false, error: "Supabase tidak tersedia." };
  }

  // Accept invitation flow
  // TODO: Replace with server-side API call
  return {
    success: false,
    error: "Fitur ini belum tersedia.",
  };
}
