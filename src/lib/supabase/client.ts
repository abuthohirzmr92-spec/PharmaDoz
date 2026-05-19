import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database";

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are placeholders or missing, return null (demo mode)
  if (!url || !key || url.includes("your-project")) {
    return null;
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

export const supabase = createSupabaseClient();

export function getSupabaseAuth() {
  return supabase?.auth ?? null;
}

export function isSupabaseConnected(): boolean {
  return supabase !== null;
}
