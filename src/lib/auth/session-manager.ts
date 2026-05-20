import { supabase, isSupabaseConnected } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type AuthEventCallback = (event: AuthEvent) => void;

export type AuthEvent =
  | { type: "SIGNED_IN"; session: Session }
  | { type: "SIGNED_OUT" }
  | { type: "TOKEN_REFRESHED"; session: Session }
  | { type: "USER_UPDATED"; session: Session }
  | { type: "INITIAL_SESSION"; session: Session | null };

export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConnected()) return null;
  const { data } = await supabase!.auth.getSession();
  return data.session ?? null;
}

export async function refreshSession(): Promise<Session | null> {
  if (!isSupabaseConnected()) return null;
  const { data } = await supabase!.auth.refreshSession();
  return data.session ?? null;
}

export function isSessionExpired(session: Session | null): boolean {
  if (!session) return true;
  const expiresAt = session.expires_at;
  if (!expiresAt) return false;
  return Date.now() >= expiresAt * 1000;
}

/**
 * Subscribes to Supabase auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(callback: AuthEventCallback): () => void {
  if (!isSupabaseConnected()) {
    return () => {};
  }

  const { data } = supabase!.auth.onAuthStateChange((event, session) => {
    switch (event) {
      case "INITIAL_SESSION":
        callback({ type: "INITIAL_SESSION", session });
        break;
      case "SIGNED_IN":
        callback({ type: "SIGNED_IN", session: session! });
        break;
      case "SIGNED_OUT":
        callback({ type: "SIGNED_OUT" });
        break;
      case "TOKEN_REFRESHED":
        callback({ type: "TOKEN_REFRESHED", session: session! });
        break;
      case "USER_UPDATED":
        callback({ type: "USER_UPDATED", session: session! });
        break;
    }
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
