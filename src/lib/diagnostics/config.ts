/** Feature flag gate. When NEXT_PUBLIC_ENABLE_AUTH_DIAGNOSTICS is "false",
 * the bundler tree-shakes all diagnostic code. This is a build-time constant
 * (NEXT_PUBLIC_* env vars are inlined). */

import { isAuthDiagnosticsEnabled } from "@/config/env";

export function isDiagnosticsEnabled(): boolean {
  return isAuthDiagnosticsEnabled();
}

// ---- Timeout thresholds — single source of truth ----

export const THRESHOLDS = {
  /** GoTrue auto-initialization (initializePromise) */
  goTrueInit: 5_000,
  /** supabase.auth.getSession() */
  getSession: 4_000,
  /** supabase.auth.getUser() fallback */
  getUser: 4_000,
  /** Profile lookup + ensureProfile */
  profileLookup: 8_000,
  /** Full hydration chain (initFromSupabaseSession) */
  sessionCheck: 10_000,
  /** Global auth-provider hydration budget */
  totalHydration: 12_000,
} as const;

const THRESHOLD_BY_STEP: Record<string, number> = {
  "gotrue-init": THRESHOLDS.goTrueInit,
  getSession: THRESHOLDS.getSession,
  "getUser-fallback": THRESHOLDS.getUser,
  "profile-lookup": THRESHOLDS.profileLookup,
  "initFromSupabaseSession": THRESHOLDS.sessionCheck,
  overall: THRESHOLDS.totalHydration,
};

export function isStepTimedOut(stepName: string, durationMs: number): boolean {
  const threshold = THRESHOLD_BY_STEP[stepName];
  if (threshold === undefined) return false;
  return durationMs >= threshold;
}

// ---- Pattern matcher toggles ----

export const PATTERN_CONFIG = {
  navigatorLockDeadlock: true,
  authHydrationTimeout: true,
  unaffiliatedProfile: true,
  concurrentHydration: true,
  getSessionFallback: true,
  emptySidebar: true,
} as const;
