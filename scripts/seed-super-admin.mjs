/* ------------------------------------------------------------------ */
/*  seed-super-admin.mjs — Create the first super_admin account        */
/*                                                                     */
/*  USAGE:                                                             */
/*    SUPABASE_SERVICE_ROLE_KEY="sb_secret_..." \                      */
/*    SUPABASE_URL="https://aoxzvnlvnzgccetbsvjr.supabase.co" \       */
/*    node scripts/seed-super-admin.mjs                                */
/*                                                                     */
/*  Get the service_role key from:                                     */
/*    Supabase Dashboard → Project Settings → API → service_role       */
/*                                                                     */
/*  This script:                                                       */
/*    1. Creates super_admin user in auth.users (bypasses email conf)  */
/*    2. Profile is auto-created by on_auth_user_created trigger       */
/*    3. Sets profile.tenant_id = NULL (marks as super_admin)          */
/*    4. Creates a default tenant "Apotek Sehat" for the platform       */
/*    5. Optionally links super_admin as tenant_owner of that tenant   */
/* ------------------------------------------------------------------ */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(`
ERROR: Missing environment variables.

Required:
  SUPABASE_URL               — Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY  — service_role key (secret, NOT the anon key)

Get the service_role key from:
  https://supabase.com/dashboard/project/aoxzvnlvnzgccetbsvjr/settings/api

Usage:
  SUPABASE_SERVICE_ROLE_KEY="sb_secret_..." \\
  SUPABASE_URL="https://aoxzvnlvnzgccetbsvjr.supabase.co" \\
  node scripts/seed-super-admin.mjs
`);
  process.exit(1);
}

// Service-role client bypasses RLS, used for admin operations
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------
// CONFIG — change these for your first super_admin
// ---------------------------------------------------------------------
const SUPER_ADMIN = {
  email: "super@apotek-manage.id",
  password: "SuperAdmin123!",
  displayName: "Super Admin",
};

const DEFAULT_TENANT = {
  name: "Apotek Sehat",
  slug: "apotek-sehat",
};

// ---------------------------------------------------------------------
// STEP 1: Create or get the super_admin user
// ---------------------------------------------------------------------
console.log("=== SEED SUPER ADMIN ===\n");

let userId;

console.log(`1. User: ${SUPER_ADMIN.email}`);

// Check if user already exists
const { data: existingUsers } = await admin.auth.admin.listUsers();
const existing = existingUsers?.users?.find(
  (u) => u.email === SUPER_ADMIN.email,
);

if (existing) {
  userId = existing.id;
  console.log(`   EXISTS — id: ${userId}`);
} else {
  // Create user (admin API bypasses email confirmation)
  const { data: newUser, error: createError } =
    await admin.auth.admin.createUser({
      email: SUPER_ADMIN.email,
      password: SUPER_ADMIN.password,
      email_confirm: true,
      user_metadata: { display_name: SUPER_ADMIN.displayName },
    });

  if (createError) {
    console.error(`   FAIL — createUser: ${createError.message}`);
    process.exit(1);
  }

  userId = newUser.user.id;
  console.log(`   CREATED — id: ${userId}`);
}

// ---------------------------------------------------------------------
// STEP 2: Wait for profile trigger, then verify + update
// ---------------------------------------------------------------------
console.log("\n2. Profile (trigger auto-creates, then mark super_admin)");

// Small delay for trigger
await new Promise((r) => setTimeout(r, 800));

// Check if profile exists
const { data: profile, error: profileError } = await admin
  .from("profiles")
  .select("*")
  .eq("id", userId)
  .single();

if (profileError) {
  // Profile not created — call ensure_profile directly
  console.log("   Trigger didn't create profile. Calling ensure_profile()...");
  const { data: epData, error: epError } = await admin.rpc("ensure_profile", {
    user_id: userId,
  });

  if (epError) {
    console.error(`   FAIL — ensure_profile: ${epError.message}`);
    process.exit(1);
  }
  console.log(`   OK — profile created via ensure_profile (display_name: "${epData?.display_name}")`);
} else {
  console.log(`   OK — profile exists (display_name: "${profile.display_name}")`);
}

// Set tenant_id = NULL to mark as super_admin
const { error: updateError } = await admin
  .from("profiles")
  .update({ tenant_id: null, updated_at: new Date().toISOString() })
  .eq("id", userId);

if (updateError) {
  console.error(`   FAIL — set tenant_id=NULL: ${updateError.message}`);
} else {
  console.log("   OK — tenant_id set to NULL (super_admin marker)");
}

// ---------------------------------------------------------------------
// STEP 3: Create default tenant
// ---------------------------------------------------------------------
console.log(`\n3. Default tenant: "${DEFAULT_TENANT.name}" (slug: ${DEFAULT_TENANT.slug})`);

const { data: existingTenant } = await admin
  .from("tenants")
  .select("id")
  .eq("slug", DEFAULT_TENANT.slug)
  .single();

let tenantId;

if (existingTenant) {
  tenantId = existingTenant.id;
  console.log(`   EXISTS — id: ${tenantId}`);
} else {
  const { data: newTenant, error: tenantError } = await admin
    .from("tenants")
    .insert({
      name: DEFAULT_TENANT.name,
      slug: DEFAULT_TENANT.slug,
      is_active: true,
    })
    .select("id")
    .single();

  if (tenantError) {
    console.error(`   FAIL — create tenant: ${tenantError.message}`);
  } else {
    tenantId = newTenant.id;
    console.log(`   CREATED — id: ${tenantId}`);
  }
}

// ---------------------------------------------------------------------
// STEP 4: Link super_admin as tenant_owner in tenant_users
// ---------------------------------------------------------------------
if (tenantId) {
  console.log("\n4. Tenant membership (tenant_owner role)");

  const { data: existingMembership } = await admin
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .single();

  if (existingMembership) {
    console.log("   EXISTS — already tenant_owner");
  } else {
    const { error: membError } = await admin.from("tenant_users").insert({
      tenant_id: tenantId,
      user_id: userId,
      role: "tenant_owner",
      is_active: true,
      joined_at: new Date().toISOString(),
    });

    if (membError) {
      console.error(`   FAIL — create membership: ${membError.message}`);
    } else {
      console.log("   OK — linked as tenant_owner");
    }
  }
}

// ---------------------------------------------------------------------
// STEP 5: Verify end-to-end
// ---------------------------------------------------------------------
console.log("\n5. Verification");

// Verify with admin client
const { data: finalProfile, error: finalError } = await admin
  .from("profiles")
  .select("id, display_name, tenant_id, is_active, created_at")
  .eq("id", userId)
  .single();

if (finalError) {
  console.error(`   FAIL — final profile check: ${finalError.message}`);
} else {
  console.log("   Profile:");
  console.log(`     id:          ${finalProfile.id}`);
  console.log(`     display_name: ${finalProfile.display_name}`);
  console.log(`     tenant_id:    ${finalProfile.tenant_id ?? "NULL → super_admin ✅"}`);
  console.log(`     is_active:    ${finalProfile.is_active}`);
  console.log(`     created_at:   ${finalProfile.created_at}`);
}

// Verify auth
const { data: authUser, error: authError } =
  await admin.auth.admin.getUserById(userId);

if (authError) {
  console.error(`   FAIL — auth check: ${authError.message}`);
} else {
  console.log("   Auth:");
  console.log(`     email:         ${authUser.user.email}`);
  console.log(`     email_confirmed: ${authUser.user.email_confirmed_at ? "YES ✅" : "NO ❌"}`);
  console.log(`     created_at:     ${authUser.user.created_at}`);
}

// ---------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------
console.log("\n=== SUPER ADMIN SEED COMPLETE ===");
console.log(`
Login credentials:
  Email:    ${SUPER_ADMIN.email}
  Password: ${SUPER_ADMIN.password}
  Role:     super_admin
  Tenant:   ${DEFAULT_TENANT.name} (tenant_owner)

The super_admin can now:
  - Log in at http://localhost:3000/login
  - Access all tenants via RLS (is_super_admin() returns true)
  - Create new tenants and invite users
  - View platform-wide analytics
`);
