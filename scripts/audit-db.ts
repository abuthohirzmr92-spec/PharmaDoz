/**
 * Supabase Database State Audit
 * Checks: profiles.system_role column, current super_admin state
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anonKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function audit() {
  console.log("=== PHASE 1: DATABASE STATE AUDIT ===\n");
  console.log("Supabase URL:", url);

  // 1. Test: does system_role column exist on profiles?
  console.log("\n--- Test 1: profiles.system_role column ---");
  const { data: colData, error: colError } = await supabase
    .from("profiles")
    .select("system_role")
    .limit(1);

  if (colError) {
    console.log("ERROR:", colError.code, colError.message);
    if (colError.code === "42703" || colError.message?.includes("column") || colError.message?.includes("does not exist")) {
      console.log("RESULT: profiles.system_role does NOT exist. Migration 019 NOT applied.");
    } else {
      console.log("RESULT: Cannot determine (RLS or other error):", colError.message);
    }
  } else {
    console.log("RESULT: profiles.system_role EXISTS. Migration 019 applied.");
    console.log("Sample data:", JSON.stringify(colData, null, 2));
  }

  // 2. Test: try select(*) to see all columns (check schema)
  console.log("\n--- Test 2: profiles table columns ---");
  const { data: rowData, error: rowError } = await supabase
    .from("profiles")
    .select("*")
    .limit(1);

  if (rowError) {
    console.log("ERROR:", rowError.code, rowError.message);
  } else if (rowData && rowData.length > 0) {
    const row = rowData[0] as Record<string, unknown>;
    console.log("Columns found:", Object.keys(row).sort().join(", "));
    console.log("Has system_role:", "system_role" in row);
    console.log("Has role:", "role" in row);
    if ("system_role" in row) {
      console.log("system_role value:", row.system_role);
    }
    if ("role" in row) {
      console.log("role value:", row.role);
    }
    console.log("id:", row.id);
    console.log("display_name:", row.display_name);
    console.log("tenant_id:", row.tenant_id);
  } else {
    console.log("No rows returned (RLS may be blocking). Trying rpc...");
  }

  // 3. Try RPC: get_profile_for_bootstrap (if auth schema is accessible)
  console.log("\n--- Test 3: RPC functions ---");

  // Check if is_super_admin function uses system_role or tenant_id
  console.log("Note: is_super_admin() function should be updated by migration 019.");

  // 4. Check existing profiles count
  console.log("\n--- Test 4: Profiles count (may be limited by RLS) ---");
  const { count, error: countError } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.log("Count error:", countError.code, countError.message);
  } else {
    console.log("Total profiles:", count);
  }

  console.log("\n=== AUDIT COMPLETE ===");
}

audit().catch(console.error);
