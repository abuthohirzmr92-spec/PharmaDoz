/* ------------------------------------------------------------------ */
/*  post-migration-validate.mjs — Run AFTER all 4 migrations applied   */
/*                                                                     */
/*  Usage:                                                             */
/*    node scripts/post-migration-validate.mjs                          */
/*                                                                     */
/*  Verifies all 17 schema items are present in production.             */
/*  Exit code 0 = ALL PASS, exit code 1 = DRIFT DETECTED.              */
/* ------------------------------------------------------------------ */

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aoxzvnlvnzgccetbsvjr.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_uelG778DtUTdFDMhyK4nxg_0P0SFUoY";

const s = createClient(URL, KEY);

let pass = 0;
let fail = 0;

function check(name, ok, detail = "") {
  if (ok) { console.log(`  ✅ ${name}${detail ? " — " + detail : ""}`); pass++; }
  else    { console.log(`  ❌ ${name}${detail ? " — " + detail : ""}`); fail++; }
}

async function run() {
  console.log("═══════════════════════════════════════════════");
  console.log("  POST-MIGRATION VALIDATION");
  console.log("═══════════════════════════════════════════════\n");

  // -----------------------------------------------
  // AGENT B: TABLE VALIDATION (9 tables)
  // -----------------------------------------------
  console.log("1. TABLE EXISTENCE (migration 031, 033, 034)");

  const tables = [
    ["financial_wallets",    "031"],
    ["wallet_transactions",  "031"],
    ["wallet_transfers",     "031"],
    ["wallet_categories",    "031"],
    ["wallet_audit_logs",    "031"],
    ["package_features",     "033"],
    ["subscription_events",  "033"],
    ["invoices",             "033"],
    ["capital_transactions", "034"],
  ];

  for (const [table, mig] of tables) {
    const { error } = await s.from(table).select("id").limit(1);
    check(table, !error, error?.message ?? "EXISTS");
  }

  // -----------------------------------------------
  // AGENT C: COLUMN VALIDATION (8 columns)
  // -----------------------------------------------
  console.log("\n2. COLUMN EXISTENCE (migration 032, 033)");

  const cols = [
    ["transaction_payments", "wallet_id",           "032"],
    ["purchase_invoices",    "wallet_id",           "032"],
    ["tenant_packages",      "is_custom",           "033"],
    ["tenant_packages",      "feature_flags",       "033"],
    ["tenant_packages",      "sort_order",          "033"],
    ["subscriptions",        "previous_package_id", "033"],
    ["subscriptions",        "changed_at",          "033"],
    ["subscriptions",        "changed_by",          "033"],
  ];

  for (const [table, col, mig] of cols) {
    const { error } = await s.from(table).select(col).limit(1);
    check(`${table}.${col}`, !error, error?.message ?? "EXISTS");
  }

  // -----------------------------------------------
  // AGENT D: SCHEMA DRIFT = ZERO?
  // -----------------------------------------------
  console.log(`\n3. SCHEMA DRIFT: ${fail > 0 ? fail + " ITEMS OUT OF SYNC" : "ZERO — ALIGNED ✅"}`);

  // -----------------------------------------------
  // AGENT E: PACKAGE MANAGEMENT SMOKE TEST
  // -----------------------------------------------
  console.log("\n4. PACKAGE MANAGEMENT SMOKE TEST");

  // Check existing packages load
  const { data: pkgs, error: pkgErr } = await s.from("tenant_packages")
    .select("name, is_custom, sort_order")
    .order("sort_order", { ascending: true });

  check("Package list loads", !pkgErr && pkgs?.length > 0,
    pkgs ? `${pkgs.length} packages: ${pkgs.map(p => p.name).join(", ")}` : pkgErr?.message);

  // Check package_features exist
  const { data: feats } = await s.from("package_features")
    .select("feature_key")
    .eq("is_enabled", true)
    .limit(5);

  check("Package features seeded", feats && feats.length > 0,
    feats ? `${feats.length}+ features enabled` : "None found");

  // -----------------------------------------------
  // AGENT F: WALLET SMOKE TEST
  // -----------------------------------------------
  console.log("\n5. WALLET SMOKE TEST");

  // Check wallet_categories seeded
  const { data: cats } = await s.from("wallet_categories")
    .select("name")
    .limit(5);

  check("Wallet categories seeded", cats && cats.length > 0,
    cats ? `${cats.length} categories: ${cats.map(c => c.name).slice(0, 3).join(", ")}...` : "None found");

  // Check RLS is active (anon should NOT see tenant wallets)
  const { data: anonWallets, error: anonErr } = await s.from("financial_wallets").select("id").limit(1);

  check("RLS blocks anon wallet access",
    !anonErr && (!anonWallets || anonWallets.length === 0),
    anonWallets?.length ? `${anonWallets.length} wallets LEAKED!` : "0 wallets — RLS working");

  // -----------------------------------------------
  // AGENT G: CAPITAL SMOKE TEST
  // -----------------------------------------------
  console.log("\n6. CAPITAL SMOKE TEST");

  const { data: capAnon, error: capAnonErr } = await s.from("capital_transactions").select("id").limit(1);

  check("RLS blocks anon capital access",
    !capAnonErr && (!capAnon || capAnon.length === 0),
    capAnon?.length ? `${capAnon.length} records LEAKED!` : "0 records — RLS working");

  // Wallet transaction source_type check
  const { error: srcErr } = await s.from("wallet_transactions").select("source_type").limit(0);
  check("Wallet transaction table accessible", !srcErr, srcErr?.message ?? "OK");

  // -----------------------------------------------
  console.log("\n═══════════════════════════════════════════════");
  console.log(`  RESULT: ${pass} PASS, ${fail} FAIL`);
  console.log("═══════════════════════════════════════════════");

  if (fail === 0) {
    console.log("\n🟢 PRODUCTION STABLE — All 17 items aligned.");
    console.log("   Ready for UAT and next phase.");
    process.exit(0);
  } else {
    console.log("\n🔴 SCHEMA DRIFT DETECTED — Run missing migrations first.");
    console.log("   See MIGRATION EXECUTION GUIDE below.");
    process.exit(1);
  }
}

run();
