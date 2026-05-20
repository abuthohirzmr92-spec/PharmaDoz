import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database";
import { isDemoMode } from "@/config/env";

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Explicit demo mode: no Supabase client
  if (isDemoMode()) {
    console.log("[MEDISYNC-TRACE] [SUPABASE_CLIENT] demo mode — no client");
    return null;
  }

  // Missing or placeholder env vars: return null (effectively demo mode).
  // The proxy and auth-provider handle this gracefully.
  if (!url || !key || url.includes("your-project") || key.includes("your-")) {
    console.log("[MEDISYNC-TRACE] [SUPABASE_CLIENT] missing/placeholder env — no client");
    return null;
  }

  console.log("[MEDISYNC-TRACE] [SUPABASE_CLIENT] creating createBrowserClient from @supabase/ssr (cookie-based storage)");
  return createBrowserClient<Database>(url, key);
}

export const supabase = createSupabaseClient();

export function getSupabaseAuth() {
  return supabase?.auth ?? null;
}

export function isSupabaseConnected(): boolean {
  return supabase !== null;
}
