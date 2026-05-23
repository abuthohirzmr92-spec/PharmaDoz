/** State capture utilities — snapshot browser and auth state.
 *
 * ALL snapshots capture metadata only: cookie names (not values),
 * localStorage keys (not values), boolean presence checks, role names.
 * Never capture: token values, email addresses, personal data. */

import type {
  StorageSnapshot,
  AuthSnapshot,
  TimingSnapshot,
  DiagnosticSnapshot,
  ProbeStep,
} from "./types";
import { isDiagnosticsEnabled } from "./config";

// ---- Storage snapshot ----

export function captureStorageSnapshot(): StorageSnapshot | null {
  if (!isDiagnosticsEnabled()) return null;
  if (typeof window === "undefined" || typeof document === "undefined") return null;

  try {
    const cookieNames = document.cookie
      .split(";")
      .map((c) => c.trim().split("=")[0] ?? "")
      .filter((n) => n.length > 0);

    const supabaseCookieNames: string[] = cookieNames.filter((n) => n.includes("sb-"));

    const localStorageKeys: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) localStorageKeys.push(key);
      }
    } catch {
      /* localStorage may throw in incognito */
    }

    const relevantKeys = localStorageKeys.filter(
      (k) => k.includes("sb-") || k.includes("supabase") || k.includes("apotek"),
    );

    return {
      cookieNames: supabaseCookieNames,
      cookieCount: supabaseCookieNames.length,
      localStorageKeys: relevantKeys,
      localStorageCount: relevantKeys.length,
    };
  } catch {
    return null;
  }
}

// ---- Auth snapshot ----

export function captureAuthSnapshot(): AuthSnapshot | null {
  if (!isDiagnosticsEnabled()) return null;

  try {
    // Dynamic access — avoid bundling auth-store into diagnostics at import time
    const { useAuthStore } = require("@/store/auth-store");
    const state = useAuthStore.getState();
    const { isSupabaseConnected } = require("@/lib/supabase/client");

    return {
      hasUser: !!state.user,
      role: state.user?.role ?? null,
      isLoading: state.isLoading,
      isAuthenticated: state.isAuthenticated,
      error: state.error?.message ?? null,
      supabaseConnected: isSupabaseConnected(),
    };
  } catch {
    return {
      hasUser: false,
      role: null,
      isLoading: false,
      isAuthenticated: false,
      error: "Failed to capture auth snapshot",
      supabaseConnected: false,
    };
  }
}

// ---- Timing snapshot ----

export function captureTimingSnapshot(steps: ProbeStep[]): TimingSnapshot {
  const totalDurationMs = steps.reduce((sum, s) => sum + s.durationMs, 0);
  return {
    steps: steps.slice(-10),
    totalDurationMs,
  };
}

// ---- Full snapshot ----

export function captureFullSnapshot(steps: ProbeStep[]): DiagnosticSnapshot {
  return {
    storage: captureStorageSnapshot() ?? {
      cookieNames: [],
      cookieCount: 0,
      localStorageKeys: [],
      localStorageCount: 0,
    },
    auth: captureAuthSnapshot() ?? {
      hasUser: false,
      role: null,
      isLoading: false,
      isAuthenticated: false,
      error: "snapshot unavailable",
      supabaseConnected: false,
    },
    timing: captureTimingSnapshot(steps),
  };
}
