/** Pattern matchers — scan TelemetryBus events for known failure signatures.
 *
 * Each function is a pure matcher: TelemetryEvent[] → DiagnosticFinding[].
 * All matchers are wrapped in try/catch so a single failing matcher doesn't
 * crash the app or prevent other matchers from running. */

import type { TelemetryEvent } from "@/lib/observability/types";
import type { DiagnosticFinding } from "./types";
import { PATTERN_CONFIG } from "./config";

// ---- Individual matchers ----

function detectNavigatorLockDeadlock(events: TelemetryEvent[]): DiagnosticFinding[] {
  if (!PATTERN_CONFIG.navigatorLockDeadlock) return [];

  const getSessionTimedOut = events.find(
    (e) =>
      e.source === "auth-hydration" &&
      e.level === "warn" &&
      e.message.includes("[getSession]") &&
      e.message.includes("timeout"),
  );

  if (!getSessionTimedOut) return [];

  // Check if getUser fallback succeeded shortly after
  const getUserSucceeded = events.find(
    (e) =>
      e.source === "auth-hydration" &&
      e.message.includes("[getUser-fallback]") &&
      e.message.includes("ok"),
  );

  if (!getUserSucceeded) return [];

  return [
    {
      patternId: "navigator-lock-deadlock",
      severity: "error",
      message:
        "getSession() timed out but getUser() fallback succeeded. " +
        "GoTrue internal state machine stalled — likely Navigator Locks API contention.",
      timestamp: new Date().toISOString(),
      remediation:
        "Verify lock:noOpLock is propagated to GoTrueClient. " +
        "Check that the SupabaseClient passes settings.auth.lock to _initSupabaseAuthClient. " +
        "Current fix is in src/lib/supabase/client.ts.",
    },
  ];
}

function detectAuthHydrationTimeout(events: TelemetryEvent[]): DiagnosticFinding[] {
  if (!PATTERN_CONFIG.authHydrationTimeout) return [];

  const globalTimeout = events.find(
    (e) =>
      e.source === "auth-hydration" &&
      e.message.includes("[overall]") &&
      e.message.includes("timeout"),
  );

  if (!globalTimeout) return [];

  return [
    {
      patternId: "auth-hydration-timeout",
      severity: "critical",
      message: "Full auth hydration timed out (12s budget). User redirected to login or error screen.",
      timestamp: new Date().toISOString(),
      remediation:
        "Check Supabase connectivity, network latency, GoTrue initialization, " +
        "and the hydration chain (getSession → profile lookup → ensureProfile). " +
        "Look at individual step timings to identify the bottleneck.",
    },
  ];
}

function detectUnaffiliatedProfile(events: TelemetryEvent[]): DiagnosticFinding[] {
  if (!PATTERN_CONFIG.unaffiliatedProfile) return [];

  const unaffiliated = events.find(
    (e) =>
      e.source === "diagnostic-repo" &&
      (e.message.includes("[unaffiliated-profile]") || e.message.includes("unaffiliated")),
  );

  if (!unaffiliated) return [];

  return [
    {
      patternId: "unaffiliated-profile",
      severity: "error",
      message: "User profile has tenant_id but role resolved to 'unaffiliated'. tenant_users lookup broken.",
      timestamp: new Date().toISOString(),
      remediation:
        "1) Check tenant_users table for this user. 2) Verify is_active=true. " +
        "3) Check RLS policy on tenant_users allows the user to read their own row. " +
        "4) Run authRepo.getTenantRole() directly to isolate the failure.",
    },
  ];
}

function detectConcurrentHydration(events: TelemetryEvent[]): DiagnosticFinding[] {
  if (!PATTERN_CONFIG.concurrentHydration) return [];

  const concurrent = events.find(
    (e) =>
      e.source === "diagnostic-repo" &&
      e.message.includes("[concurrent-hydration]"),
  );

  if (!concurrent) return [];

  return [
    {
      patternId: "concurrent-hydration",
      severity: "warn",
      message:
        "Multiple initFromSupabaseSession calls overlapped. " +
        "The hydrationPromise mutex prevented parallel getSession(), but this may indicate React StrictMode double-mount or rapid navigation.",
      timestamp: new Date().toISOString(),
      remediation:
        "Normal in React StrictMode (dev only). In production, this could indicate a race between " +
        "auth-provider Phase 1 and the onAuthStateChange listener. Verify isLoginInProgress() guard.",
    },
  ];
}

function detectGetSessionFallback(events: TelemetryEvent[]): DiagnosticFinding[] {
  if (!PATTERN_CONFIG.getSessionFallback) return [];

  const getSessionFailed = events.find(
    (e) =>
      e.source === "auth-hydration" &&
      (e.message.includes("[getSession]") && (e.message.includes("timeout") || e.message.includes("error"))),
  );

  if (!getSessionFailed) return [];

  const getUserOk = events.find(
    (e) =>
      e.source === "auth-hydration" &&
      e.message.includes("[getUser-fallback]") &&
      e.message.includes("ok"),
  );

  if (!getUserOk) return [];

  return [
    {
      patternId: "getSession-fallback",
      severity: "warn",
      message:
        "getSession() failed but getUser() succeeded. " +
        "GoTrue state machine is degraded. The getUser() bypass is working as designed.",
      timestamp: new Date().toISOString(),
      remediation:
        "getSession() reads from the cookie store through GoTrue's internal state machine. " +
        "getUser() bypasses it with a direct API call. The fact that getUser works means " +
        "the Supabase session is valid — GoTrue just can't read it internally.",
    },
  ];
}

function detectEmptySidebar(events: TelemetryEvent[]): DiagnosticFinding[] {
  if (!PATTERN_CONFIG.emptySidebar) return [];

  const emptySidebar = events.find(
    (e) =>
      e.source === "diagnostic-repo" &&
      e.message.includes("[empty-sidebar]"),
  );

  if (!emptySidebar) return [];

  return [
    {
      patternId: "empty-sidebar",
      severity: "warn",
      message:
        "Sidebar rendered empty for an authenticated user. Navigation items were filtered to zero.",
      timestamp: new Date().toISOString(),
      remediation:
        "1) Check the user's resolved role. 2) Verify ROLE_PERMISSIONS grants navigation permissions to this role. " +
        "3) Check resolveUserRole() output — it may have fallen back to 'staff' or 'unaffiliated'. " +
        "4) Review the TENANT_NAVIGATION permission requirements.",
    },
  ];
}

// ---- Composite ----

type MatcherFn = (events: TelemetryEvent[]) => DiagnosticFinding[];

const MATCHERS: MatcherFn[] = [
  detectNavigatorLockDeadlock,
  detectAuthHydrationTimeout,
  detectUnaffiliatedProfile,
  detectConcurrentHydration,
  detectGetSessionFallback,
  detectEmptySidebar,
];

export function runAllPatternMatchers(events: TelemetryEvent[]): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  for (const matcher of MATCHERS) {
    try {
      const result = matcher(events);
      if (result.length > 0) findings.push(...result);
    } catch {
      /* matcher threw — log and continue */
    }
  }
  return findings;
}

export {
  detectNavigatorLockDeadlock,
  detectAuthHydrationTimeout,
  detectUnaffiliatedProfile,
  detectConcurrentHydration,
  detectGetSessionFallback,
  detectEmptySidebar,
};
