"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { validateProvisioning } from "./provisioning-validator";
import type {
  ProvisioningInput,
  ProvisioningResult,
  ProvisioningWarning,
} from "@/types";

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
 * Recovery: check if a tenant with the given slug already exists in the DB.
 * Used when the RPC call is unreliable (timeout, network error) — we verify
 * against the source of truth before reporting failure.
 */
async function findTenantBySlug(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  slug: string,
): Promise<{ id: string; name: string } | null> {
  try {
    const { data } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("slug", slug)
      .is("deleted_at", null)
      .single();

    return data as { id: string; name: string } | null;
  } catch {
    return null;
  }
}

/**
 * Provision a new tenant with owner account, branch, subscription, and onboarding.
 *
 * Flow:
 *   1. Validate input (sync + async slug check)
 *   2. Verify caller is super_admin
 *   3. Create auth user (magic-link flow via signUp + resetPasswordForEmail)
 *   4. Call SECURITY DEFINER provision_tenant() for atomic DB writes
 *   5. On RPC failure: recovery check via slug lookup in DB
 *   6. Classify result as: success | success_with_warning | failure
 *
 * RESULT CLASSIFICATION:
 *   - success              → tenant fully provisioned, no issues
 *   - success_with_warning → tenant created but non-critical issue (email, RPC response lost)
 *   - failure              → provisioning transaction failed, nothing created
 */
export async function provisionTenant(
  input: ProvisioningInput,
): Promise<ProvisioningResult> {
  // ------------------------------------------------------------------
  // 1. Validate
  // ------------------------------------------------------------------
  const validation = await validateProvisioning(input);
  if (!validation.valid) {
    return {
      status: "failure",
      errors: validation.errors,
    };
  }

  // ------------------------------------------------------------------
  // 2. Create server client + verify caller is super_admin
  // ------------------------------------------------------------------
  const supabase = await createServerSupabase();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return {
      status: "failure",
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
      status: "failure",
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
      status: "failure",
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
      status: "failure",
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
  // ------------------------------------------------------------------
  let emailWarning: ProvisioningWarning | null = null;

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await authClient().auth.resetPasswordForEmail(validation.ownerEmail, {
      redirectTo: `${appUrl}/auth/set-password`,
    });
  } catch {
    emailWarning = {
      type: "email_delivery_failed",
      message:
        "Email aktivasi gagal dikirim. Pemilik dapat menggunakan 'Lupa Password' di halaman login untuk mengatur password.",
      recoverable: true,
    };
  }

  // ------------------------------------------------------------------
  // 4. Call SECURITY DEFINER provision_tenant() — atomic DB writes
  // ------------------------------------------------------------------
  let rpcError: string | null = null;
  let tenantId: string | null = null;

  try {
    const { data: rpcResult, error } = await (supabase.rpc as any)(
      "provision_tenant",
      {
        p_owner_user_id: ownerUserId,
        p_name: validation.tenantName,
        p_slug: validation.slug,
        p_package_id: validation.packageId,
        p_domain: validation.domain,
        p_settings: validation.settings,
      },
    );

    if (error) {
      rpcError = error.message;
    } else if (rpcResult) {
      tenantId = (rpcResult as any).tenant_id ?? null;
    }
  } catch (err) {
    rpcError = err instanceof Error ? err.message : String(err);
  }

  // ------------------------------------------------------------------
  // 5. RECOVERY: if RPC failed or returned no tenant_id, verify against DB
  //    The SECURITY DEFINER function may have succeeded on the database
  //    but the HTTP response was lost (timeout, network blip).
  // ------------------------------------------------------------------
  let recovered = false;

  if (!tenantId && rpcError) {
    const found = await findTenantBySlug(supabase, validation.slug);
    if (found) {
      tenantId = found.id;
      recovered = true;
    }
  }

  // ------------------------------------------------------------------
  // 6. Classify result
  // ------------------------------------------------------------------

  // --- FAILURE: no tenant, no recovery ---
  if (!tenantId) {
    const errorMessage = rpcError ?? "Provisioning RPC returned no tenant_id";

    // Log to provisioning_audit
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
      status: "failure",
      errors: [{
        code: "DATABASE_ERROR",
        message: `Provisioning gagal: ${errorMessage}. Tim teknis telah diberitahu.`,
        retryable: false,
      }],
    };
  }

  // --- SUCCESS or SUCCESS_WITH_WARNING ---
  const warnings: ProvisioningWarning[] = [];

  if (recovered) {
    warnings.push({
      type: "rpc_response_unreliable",
      message:
        "Tenant berhasil dibuat tetapi response dari server tertunda. Data sudah tersimpan dengan aman.",
      recoverable: true,
    });
  }

  if (emailWarning) {
    warnings.push(emailWarning);
  }

  const status = warnings.length > 0 ? "success_with_warning" : "success";

  // Log to provisioning_audit
  try {
    await (supabase.from as any)("provisioning_audit").insert({
      actor_id: session.user.id,
      owner_email: validation.ownerEmail,
      owner_user_id: ownerUserId,
      tenant_name: validation.tenantName,
      slug: validation.slug,
      package_id: validation.packageId,
      tenant_id: tenantId,
      status: recovered ? "NEEDS_MANUAL_REVIEW" : "success",
      error_message: recovered ? rpcError : null,
      error_step: recovered ? "rpc_call_recovered" : null,
      compensation_attempted: false,
    });
  } catch {
    // Non-fatal
  }

  return {
    status,
    tenantId,
    ownerUserId,
    ownerEmail: validation.ownerEmail,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
