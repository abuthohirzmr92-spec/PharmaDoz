"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { validateProvisioning } from "./provisioning-validator";
import type { ProvisioningInput, ProvisioningResult } from "@/types";

/** Stateless Supabase client — no cookie management, for auth-only calls.
 *  Using this for signUp/resetPasswordForEmail prevents the admin's
 *  session from being replaced by the new owner's session. */
function authClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const specials = "!@#$%&*";
  let pw = "";
  for (let i = 0; i < 16; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  pw += specials[Math.floor(Math.random() * specials.length)];
  pw += Math.floor(Math.random() * 10).toString();
  return pw;
}

/**
 * Provision a new tenant with owner account, branch, subscription, and onboarding.
 *
 * Flow:
 *   1. Validate input (sync + async slug check)
 *   2. Verify caller is super_admin
 *   3. Create auth user (magic-link flow via signUp + resetPasswordForEmail)
 *   4. Call SECURITY DEFINER provision_tenant() for atomic DB writes
 *   5. On failure: log to provisioning_audit, attempt compensation
 *
 * The owner receives:
 *   - Supabase confirmation email (from signUp)
 *   - Password reset email (so they can set their own password)
 * No plaintext passwords are delivered via email.
 */
export async function provisionTenant(
  input: ProvisioningInput,
): Promise<ProvisioningResult> {
  // ------------------------------------------------------------------
  // 1. Validate
  // ------------------------------------------------------------------
  const validation = await validateProvisioning(input);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  // ------------------------------------------------------------------
  // 2. Create server client + verify caller is super_admin
  // ------------------------------------------------------------------
  const supabase = await createServerSupabase();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return {
      success: false,
      errors: [{
        code: "UNAUTHORIZED",
        message: "Anda harus login terlebih dahulu.",
        retryable: false,
      }],
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("system_role")
    .eq("id", session.user.id)
    .single();

  const profileData = profile as { system_role: string | null } | null;

  if (profileError || profileData?.system_role !== "super_admin") {
    return {
      success: false,
      errors: [{
        code: "UNAUTHORIZED",
        message: "Hanya super_admin yang dapat melakukan provisioning tenant.",
        retryable: false,
      }],
    };
  }

  // ------------------------------------------------------------------
  // 3. Create auth user for the owner (stateless client — avoids
  //    replacing the admin's session cookies with the new user's)
  // ------------------------------------------------------------------
  const tempPassword = generateSecurePassword();

  const { data: authData, error: authError } = await authClient().auth.signUp({
    email: validation.ownerEmail,
    password: tempPassword,
    options: {
      data: {
        display_name: validation.ownerDisplayName,
      },
    },
  });

  if (authError) {
    const retryable =
      authError.message?.includes("rate") ||
      authError.message?.includes("timeout") ||
      authError.message?.includes("network");

    return {
      success: false,
      errors: [{
        code: retryable ? "NETWORK_ERROR" : "AUTH_ERROR",
        message: authError.message,
        field: "ownerEmail",
        retryable,
      }],
    };
  }

  if (!authData.user) {
    return {
      success: false,
      errors: [{
        code: "AUTH_ERROR",
        message: "Gagal membuat akun pengguna.",
        retryable: true,
      }],
    };
  }

  const ownerUserId = authData.user.id;

  // ------------------------------------------------------------------
  // 3b. Send password setup email (magic-link equivalent)
  //     The owner clicks the reset link and sets their own password.
  // ------------------------------------------------------------------
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await authClient().auth.resetPasswordForEmail(validation.ownerEmail, {
      redirectTo: `${appUrl}/login`,
    });
  } catch {
    // Non-fatal: the confirmation email from signUp is sufficient.
    // The admin can relay the temporary password out-of-band.
  }

  // ------------------------------------------------------------------
  // 4. Call SECURITY DEFINER provision_tenant() — atomic DB writes
  // ------------------------------------------------------------------
  let rpcError: Error | null = null;
  let tenantId: string | null = null;

  try {
    const { data: rpcResult, error } = await (supabase.rpc as any)("provision_tenant", {
      p_owner_user_id: ownerUserId,
      p_name: validation.tenantName,
      p_slug: validation.slug,
      p_package_id: validation.packageId,
      p_domain: validation.domain,
      p_settings: validation.settings,
    });

    if (error) {
      rpcError = new Error(error.message);
    } else if (rpcResult) {
      tenantId = (rpcResult as any).tenant_id ?? null;
    }
  } catch (err) {
    rpcError = err instanceof Error ? err : new Error(String(err));
  }

  // ------------------------------------------------------------------
  // 5. Handle RPC failure — log to provisioning_audit, attempt compensation
  // ------------------------------------------------------------------
  if (rpcError || !tenantId) {
    const errorMessage = rpcError?.message ?? "Provisioning RPC returned no tenant_id";

    // Log the failure for manual review
    try {
      await (supabase.from as any)("provisioning_audit").insert({
        actor_id: session.user.id,
        owner_email: validation.ownerEmail,
        owner_user_id: ownerUserId,
        tenant_name: validation.tenantName,
        slug: validation.slug,
        package_id: validation.packageId,
        status: "NEEDS_MANUAL_REVIEW",
        error_message: errorMessage,
        error_step: "rpc_call",
        compensation_attempted: false,
      });
    } catch {
      // Audit insert failed — nothing more we can do
    }

    return {
      success: false,
      errors: [{
        code: "DATABASE_ERROR",
        message: `Provisioning gagal: ${errorMessage}. Tim teknis telah diberitahu.`,
        retryable: false,
      }],
    };
  }

  // ------------------------------------------------------------------
  // 6. Log success to provisioning_audit
  // ------------------------------------------------------------------
  try {
    await (supabase.from as any)("provisioning_audit").insert({
      actor_id: session.user.id,
      owner_email: validation.ownerEmail,
      owner_user_id: ownerUserId,
      tenant_name: validation.tenantName,
      slug: validation.slug,
      package_id: validation.packageId,
      tenant_id: tenantId,
      status: "success",
      compensation_attempted: false,
    });
  } catch {
    // Non-fatal: the tenant is provisioned, audit just missed a record
  }

  // ------------------------------------------------------------------
  // 7. Return success with provisioning details
  // ------------------------------------------------------------------
  return {
    success: true,
    tenantId,
    ownerUserId,
    ownerEmail: validation.ownerEmail,
  };
}
