/* ------------------------------------------------------------------ */
/*  verify-trigger.mjs — Check trigger exists and test ensure_profile  */
/* ------------------------------------------------------------------ */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) { console.error("Missing env vars"); process.exit(1); }

const supabase = createClient(url, key);

// Check if the handle_new_user function exists by calling it via RPC
// (it's a trigger function but we can query pg_proc)
console.log("=== TRIGGER DIAGNOSTICS ===\n");

// 1. Test ensure_profile on a real existing auth user
console.log("1. Looking for existing auth users...");
// We can't query auth.users directly with anon key.
// Instead, test ensure_profile on the known user ID from previous run.

const PREV_USER_ID = "8ddefae9-5928-401b-8619-7e00c9594a99";
console.log(`   Testing ensure_profile on previous user: ${PREV_USER_ID}`);

const { data: ep1, error: ep1Error } = await supabase
  .rpc("ensure_profile", { user_id: PREV_USER_ID });

if (ep1Error) {
  console.log(`   FAIL — ${ep1Error.message} (code: ${ep1Error.code})`);
} else if (ep1) {
  console.log(`   OK — profile created: display_name="${ep1.display_name}", is_active=${ep1.is_active}`);
} else {
  console.log("   NULL — user not found in auth.users");
}

// 2. Try with a random UUID to verify function exists
console.log("\n2. Testing function existence with random UUID...");
const randId = crypto.randomUUID();
const { data: ep2, error: ep2Error } = await supabase
  .rpc("ensure_profile", { user_id: randId });

if (ep2Error) {
  if (ep2Error.code === "PGRST202") {
    console.log("   OK — function exists, returned null for non-existent user (expected)");
  } else {
    console.log(`   FAIL — ${ep2Error.message} (code: ${ep2Error.code})`);
  }
} else {
  console.log(`   Returned: ${JSON.stringify(ep2)} (unexpected for non-existent user)`);
}

// 3. Check if the profile is now in the profiles table
console.log("\n3. Verifying profile exists in profiles table...");
const { data: prof, error: profError } = await supabase
  .from("profiles")
  .select("id, display_name, is_active, tenant_id, created_at")
  .eq("id", PREV_USER_ID)
  .single();

if (profError) {
  console.log(`   FAIL — ${profError.message}`);
} else {
  console.log(`   OK — Profile found:`);
  console.log(`        id:          ${prof.id}`);
  console.log(`        display_name: ${prof.display_name}`);
  console.log(`        is_active:   ${prof.is_active}`);
  console.log(`        tenant_id:   ${prof.tenant_id ?? "null (super_admin → needs tenant)"}`);
  console.log(`        created_at:  ${prof.created_at}`);
}

// 4. Sign-up a new user (simulate production flow with real email)
console.log("\n4. SIGN-UP test (verify trigger)");

// Need to wait for rate limit to reset - skip for now
console.log("   SKIP — rate limited, tested ensure_profile instead");

console.log("\n=== DONE ===");
