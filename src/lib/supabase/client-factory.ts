import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase as browserClient } from "./client";
import { createServerSupabase } from "./server";

// ---------------------------------------------------------------------------
// Server Client Factory — the SINGLE infrastructure entry point for obtaining
// a Supabase client. All privileged server execution (cron) obtains its client
// here. No business logic; only client creation. All client env lookups live
// here (nowhere else).
// ---------------------------------------------------------------------------

export type SupabaseClientKind = "browser" | "server" | "service_role" | "test";

/** Anon browser/user-scoped client (RLS applies). May be null in demo mode. */
export function getBrowserClient(): SupabaseClient | null {
  return browserClient;
}

/** SSR cookie-based, user-scoped server client. */
export function getServerClient() {
  return createServerSupabase();
}

let cachedServiceRole: SupabaseClient | null = null;

/**
 * Privileged service-role client (bypasses RLS; can call RPCs granted to
 * service_role). Server-only. Throws if the service-role env is not configured.
 */
export function getServiceRoleClient(): SupabaseClient {
  if (cachedServiceRole) return cachedServiceRole;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Service-role client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  cachedServiceRole = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedServiceRole;
}

/** Future: injected mock client for unit/integration tests. */
export function getTestClient(): SupabaseClient {
  throw new Error("Test client factory not implemented yet.");
}
