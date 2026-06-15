import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database";
import { isDemoMode } from "@/config/env";

/**
 * No-op lock function that bypasses the Navigator Locks API entirely.
 *
 * GoTrue defaults to navigatorLock (Web Locks API — navigator.locks.request)
 * which is a browser-level, cross-tab lock. This API can deadlock when:
 * - A previous page load orphaned a lock (React StrictMode, tab crash)
 * - Another tab holds the lock during a stalled auto-refresh
 * - Browser extensions interfere with the Lock Manager
 *
 * Since auth-store already has a module-level hydrationPromise mutex that
 * prevents concurrent initFromSupabaseSession / refreshUserProfile calls,
 * the Navigator Lock is redundant and actively harmful.
 */
async function noOpLock(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<unknown>,
): Promise<unknown> {
  return fn();
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Explicit demo mode: no Supabase client
  if (isDemoMode()) return null;

  // Missing or placeholder env vars: return null (effectively demo mode).
  // The proxy and auth-provider handle this gracefully.
  if (!url || !key || url.includes("your-project") || key.includes("your-")) {
    return null;
  }

  /* The @supabase/ssr type definitions don't expose `lock` inside `auth`
   * but the runtime passes all auth options through createClient() →
   * SupabaseClient → _initSupabaseAuthClient → GoTrueClient constructor.
   * `lock` MUST be inside `auth:` — SupabaseClient only passes settings.auth
   * to _initSupabaseAuthClient, which destructures lock from it. */
  return createBrowserClient<Database>(url, key, {
    auth: {
      lock: noOpLock,
      detectSessionInUrl: false,
    },
    realtime: {
      enabled: false,
    },
  } as any);
}

export const supabase = createSupabaseClient();

export function getSupabaseAuth() {
  return supabase?.auth ?? null;
}

export function isSupabaseConnected(): boolean {
  return supabase !== null;
}
