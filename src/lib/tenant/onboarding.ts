import { supabase } from "@/lib/supabase/client";

/** Maximum time for the full registration flow */
export const REGISTRATION_TIMEOUT_MS = 30_000;

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  pharmacyName: string;
  pharmacySlug: string;
  location?: string;
}

export interface RegisterResult {
  success: boolean;
  error?: string;
  userId?: string;
  tenantId?: string;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export interface PreValidateResult {
  valid: boolean;
  error?: string;
  slug: string;
  slugAvailable?: boolean;
}

/**
 * Quick pre-validation before the full registration flow.
 * Checks slug availability without creating any resources.
 */
export async function preValidateRegistration(input: {
  pharmacyName: string;
}): Promise<PreValidateResult> {
  const slug = generateSlug(input.pharmacyName);

  if (slug.length < 2) {
    return { valid: false, error: "Nama apotek terlalu pendek.", slug };
  }

  const available = await checkSlugAvailability(slug);
  if (!available) {
    return { valid: false, error: "Nama apotek sudah digunakan. Coba nama lain.", slug, slugAvailable: false };
  }

  return { valid: true, slug, slugAvailable: true };
}

/**
 * Full tenant onboarding flow:
 * 1. Sign up via Supabase Auth
 * 2. Profile is auto-created by on_auth_user_created trigger
 * 3. Create tenant
 * 4. Assign user as tenant_owner via tenant_users
 * 5. Update profile with tenant_id
 */
export async function registerTenant(input: RegisterInput): Promise<RegisterResult> {
  if (!supabase) {
    return { success: false, error: "Supabase tidak tersedia." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;
  const slug = input.pharmacySlug || generateSlug(input.pharmacyName);

  // Step 1: Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.displayName,
      },
    },
  });

  if (authError) {
    const msg =
      authError.message === "User already registered"
        ? "Email sudah terdaftar. Silakan masuk."
        : authError.message;
    return { success: false, error: msg };
  }

  if (!authData.user) {
    return { success: false, error: "Gagal membuat akun." };
  }

  const userId = authData.user.id;

  // Step 2: Ensure profile exists (trigger should have created it, but be safe)
  const { error: profileError } = await db
    .from("profiles")
    .upsert(
      {
        id: userId,
        display_name: input.displayName,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (profileError) {
    return { success: false, error: "Gagal membuat profil: " + profileError.message };
  }

  // Step 3: Create tenant
  const { data: tenant, error: tenantError } = await db
    .from("tenants")
    .insert({
      name: input.pharmacyName,
      slug,
      is_active: true,
      settings: {
        owner_name: input.displayName,
        location: input.location ?? "",
        created_via: "onboarding",
      },
    })
    .select("id")
    .single();

  if (tenantError) {
    // Check if slug already exists
    if (tenantError.code === "23505") {
      return { success: false, error: "Nama apotek atau slug sudah digunakan. Coba nama lain." };
    }
    return { success: false, error: "Gagal membuat tenant: " + tenantError.message };
  }

  const tenantId = (tenant).id;

  // Step 4: Assign user as tenant_owner
  const { error: memberError } = await db
    .from("tenant_users")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      role: "tenant_owner",
      is_active: true,
      joined_at: new Date().toISOString(),
    });

  if (memberError) {
    // Rollback: delete tenant
    await supabase.from("tenants").delete().eq("id", tenantId);
    return { success: false, error: "Gagal menetapkan peran: " + memberError.message };
  }

  // Step 5: Update profile with tenant_id
  await db
    .from("profiles")
    .update({ tenant_id: tenantId, updated_at: new Date().toISOString() })
    .eq("id", userId);

  return { success: true, userId, tenantId };
}

/**
 * Check if a pharmacy slug is available.
 */
export async function checkSlugAvailability(slug: string): Promise<boolean> {
  if (!supabase) return true; // demo mode: always available

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;
  const { count, error } = await db
    .from("tenants")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug)
    .is("deleted_at", null);

  if (error) return false;
  return count === 0;
}
