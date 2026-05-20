/* ------------------------------------------------------------------ */
/*  verify-supabase.mjs — Full auth chain verification                 */
/*  Run: node --env-file=.env.local scripts/verify-supabase.mjs        */
/* ------------------------------------------------------------------ */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE;

console.log("=== Supabase Auth Chain Verification ===\n");
console.log(`  SUPABASE_URL:          ${url}`);
console.log(`  ANON_KEY:              ${key ? "(set)" : "(MISSING)"}`);
console.log(`  DEMO_MODE:             ${demoMode ?? "(unset→false)"}`);
console.log("");

if (!url || !key) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set.");
  process.exit(1);
}

const supabase = createClient(url, key);

// ---------------------------------------------------------------------
// 1. Basic connectivity
// ---------------------------------------------------------------------
console.log("1. BASIC CONNECTIVITY");
try {
  const start = performance.now();
  const { data, error } = await supabase
    .from("profiles")
    .select("count", { count: "exact", head: true });
  const ms = (performance.now() - start).toFixed(0);
  if (error) {
    console.log(`   FAIL — ${error.message}`);
  } else {
    console.log(`   OK — ${ms}ms — profiles table accessible (${data?.count ?? "?"} rows)`);
  }
} catch (e) {
  console.log(`   FAIL — ${e.message}`);
}

// ---------------------------------------------------------------------
// 2. Check trigger exists
// ---------------------------------------------------------------------
console.log("2. AUTH TRIGGER (on_auth_user_created)");
try {
  const { data, error } = await supabase
    .rpc("ensure_profile", { user_id: "00000000-0000-0000-0000-000000000000" });
  if (error) {
    // PGRST202 = not found, which is expected for a non-existent user
    if (error.code === "PGRST202") {
      console.log("   OK — ensure_profile() function exists and runs (no row for fake UUID)");
    } else {
      console.log(`   FAIL — ${error.message} (code: ${error.code})`);
    }
  } else {
    console.log(`   OK — ensure_profile() returned (unexpected for fake UUID)`);
  }
} catch (e) {
  console.log(`   FAIL — ${e.message}`);
}

// ---------------------------------------------------------------------
// 3. Check helper functions
// ---------------------------------------------------------------------
console.log("3. HELPER FUNCTIONS");
try {
  const { data: fnData, error: fnError } = await supabase
    .rpc("is_super_admin");
  if (fnError) {
    console.log(`   FAIL — is_super_admin(): ${fnError.message}`);
  } else {
    console.log(`   OK — is_super_admin() works (returns: ${fnData})`);
  }
} catch (e) {
  console.log(`   FAIL — is_super_admin(): ${e.message}`);
}

try {
  const { data: tid, error: tidError } = await supabase.rpc("user_tenant_id");
  if (tidError) {
    console.log(`   FAIL — user_tenant_id(): ${tidError.message}`);
  } else {
    console.log(`   OK — user_tenant_id() works (returns: ${tid ?? "null"})`);
  }
} catch (e) {
  console.log(`   FAIL — user_tenant_id(): ${e.message}`);
}

// ---------------------------------------------------------------------
// 4. Sign-Up Flow (create a test user)
// ---------------------------------------------------------------------
const TEST_EMAIL = `test-verify-${Date.now()}@gmail.com`;
const TEST_PASSWORD = "TestVerify123!";

console.log(`\n4. SIGN-UP FLOW (email: ${TEST_EMAIL})`);
let signUpUserId = null;
try {
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    options: { data: { display_name: "Test Verify User" } },
  });

  if (signUpError) {
    console.log(`   FAIL — signUp: ${signUpError.message}`);
  } else if (!signUpData.user) {
    console.log("   FAIL — signUp returned no user");
  } else {
    signUpUserId = signUpData.user.id;
    console.log(`   OK — auth.users row created (id: ${signUpUserId})`);

    // Wait a beat for the trigger to fire
    await new Promise((r) => setTimeout(r, 500));

    // Check if profile was auto-created
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", signUpUserId)
      .single();

    if (profileError) {
      console.log(`   FAIL — profile NOT auto-created: ${profileError.message}`);
    } else {
      console.log(`   OK — profile auto-created by trigger (display_name: "${profile.display_name}", is_active: ${profile.is_active})`);
    }
  }
} catch (e) {
  console.log(`   FAIL — ${e.message}`);
}

// ---------------------------------------------------------------------
// 5. Direct ensure_profile call with the new user ID
// ---------------------------------------------------------------------
console.log("\n5. ENSURE_PROFILE (direct call with new user ID)");
if (signUpUserId) {
  try {
    const { data: epData, error: epError } = await supabase
      .rpc("ensure_profile", { user_id: signUpUserId });

    if (epError) {
      console.log(`   FAIL — ensure_profile(): ${epError.message}`);
    } else if (epData) {
      console.log(`   OK — ensure_profile() created/resolved profile (display_name: "${epData.display_name}", id: ${epData.id})`);
    } else {
      console.log("   FAIL — ensure_profile() returned null (user not in auth.users?)");
    }
  } catch (e) {
    console.log(`   FAIL — ${e.message}`);
  }
}

// ---------------------------------------------------------------------
// 6. Login Flow (with the test user)
// ---------------------------------------------------------------------
console.log("\n6. LOGIN FLOW");
try {
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (loginError) {
    console.log(`   FAIL — login: ${loginError.message}`);
  } else if (!loginData.session) {
    console.log("   FAIL — login returned no session");
  } else {
    console.log(`   OK — session created (user: ${loginData.user.email})`);

    // Verify profile resolution
    const { data: profile2, error: profile2Error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", loginData.user.id)
      .single();

    if (profile2Error) {
      console.log(`   FAIL — profile resolution: ${profile2Error.message}`);
    } else {
      console.log(`   OK — profile resolved (role: ${profile2.role ?? "staff (default)"}, tenant_id: ${profile2.tenant_id ?? "null → super_admin"})`);
    }
  }
} catch (e) {
  console.log(`   FAIL — ${e.message}`);
}

// ---------------------------------------------------------------------
// 7. Cleanup: Delete test user (via admin API or direct)
// ---------------------------------------------------------------------
console.log("\n7. CLEANUP");
if (signUpUserId) {
  try {
    // Delete profile first (FK CASCADE may handle this)
    const { error: delProfileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", signUpUserId);
    if (delProfileError) {
      console.log(`   WARN — could not delete profile: ${delProfileError.message}`);
    } else {
      console.log(`   OK — test profile deleted`);
    }
    console.log("   NOTE — auth.users row remains (requires service_role key to delete)");
  } catch (e) {
    console.log(`   WARN — ${e.message}`);
  }
} else {
  console.log("   SKIP — no test user to clean up");
}

// ---------------------------------------------------------------------
// 7. Summary
// ---------------------------------------------------------------------
console.log("\n=== VERIFICATION COMPLETE ===");
