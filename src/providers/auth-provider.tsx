"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore, syncRepositoryContext, isLoginInProgress, clearDomainStores } from "@/store/auth-store";
import { logAuthHydration } from "@/lib/observability/route-debug";
import { supabase, isSupabaseConnected } from "@/lib/supabase/client";
import { isDemoMode } from "@/config/env";

/* ------------------------------------------------------------------ */
/*  Dev logging (stripped in production)                               */
/* ------------------------------------------------------------------ */

const DEV = process.env.NODE_ENV === "development";
function devLog(...args: unknown[]) {
  if (DEV) console.log("[auth-provider]", ...args);
}


/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/unauthorized", "/offline"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/** Total budget for the full session→profile→tenant hydration chain */
const HYDRATION_TIMEOUT_MS = 12_000;

/** Maximum time to wait for initFromSupabaseSession before giving up */
const SESSION_CHECK_TIMEOUT_MS = 10_000;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function clearAuthState() {
  syncRepositoryContext(null);
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    impersonating: false,
    originalUser: null,
  });
}

/** Promise race with a timeout — rejects if timeout fires first */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Hydration timeout: ${label}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/* ------------------------------------------------------------------ */
/*  AuthProvider                                                        */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isHydrating, setIsHydrating] = useState(true);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const initFromSupabaseSession = useAuthStore((s) => s.initFromSupabaseSession);
  const refreshUserProfile = useAuthStore((s) => s.refreshUserProfile);
  const router = useRouter();
  const pathname = usePathname();

  /* Refs to survive React strict-mode double-mount */
  const hydratingRef = useRef(false);
  const hydrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPublic = isPublicPath(pathname);

  /* ---- Phase 1: Initial hydration (protected routes only) ---- */
  useEffect(() => {
    /* Public routes never block — render immediately */
    if (isPublic) {
      devLog("public path, skip hydration:", pathname);
      setIsHydrating(false);
      return;
    }

    /* Already authenticated (navigation between protected routes) */
    const { isAuthenticated, user } = useAuthStore.getState();
    if (isAuthenticated && user) {
      devLog("already authenticated, skip hydration. role =", user.role);
      setIsHydrating(false);
      return;
    }

    /* Prevent duplicate concurrent hydrations (React strict mode) */
    if (hydratingRef.current) {
      devLog("hydration in progress, skip duplicate");
      return;
    }

    let cancelled = false;
    hydratingRef.current = true;

    /* Global timeout — if hydration hangs, show error instead of spinner forever */
    hydrationTimerRef.current = setTimeout(() => {
      if (cancelled) return;
      logAuthHydration("timeout");
      devLog("hydration timeout — forcing fallback");
      setHydrationError("Gagal memulihkan sesi: waktu tunggu habis. Periksa koneksi internet Anda.");
      setIsHydrating(false);
      hydratingRef.current = false;
    }, HYDRATION_TIMEOUT_MS);

    async function hydrate() {
      /* Log all Supabase-related cookies/storage for stale-state diagnosis */
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        const supabaseCookies = document.cookie.split(";").filter(c => c.includes("sb-"));
        const localStorageKeys = Object.keys(localStorage).filter(k => k.includes("sb-") || k.includes("supabase") || k.includes("apotek"));
        console.log("[SIDEBAR-DIAG] AuthProvider hydrate START", {
          pathname,
          isPublic,
          supabaseCookieCount: supabaseCookies.length,
          supabaseCookieNames: supabaseCookies.map(c => c.trim().split("=")[0]),
          localStorageKeys,
        });
      } else {
        console.log("[SIDEBAR-DIAG] AuthProvider hydrate START", { pathname, isPublic });
      }
      logAuthHydration("start");
      devLog("hydrate: start for", pathname);

      try {
        /* 1. Supabase session (with sub-timeout) */
        if (isSupabaseConnected()) {
          devLog("hydrate: checking supabase session");
          try {
            await withTimeout(
              initFromSupabaseSession(),
              SESSION_CHECK_TIMEOUT_MS,
              "initFromSupabaseSession",
            );
            const hydrateResult = useAuthStore.getState().isAuthenticated;
            console.log("[SIDEBAR-DIAG] AuthProvider after initFromSupabaseSession", {
              isAuthenticated: hydrateResult,
              userRole: useAuthStore.getState().user?.role ?? null,
              cancelled,
            });
            if (!cancelled && hydrateResult) {
              const restoredRole = useAuthStore.getState().user?.role;
              logAuthHydration("success", restoredRole);
              devLog("hydrate: session restored, role =", restoredRole);
              clearTimeout(hydrationTimerRef.current!);
              setIsHydrating(false);
              hydratingRef.current = false;
              return;
            }
          } catch (err) {
            console.error("[SIDEBAR-DIAG] AuthProvider hydrate: initFromSupabaseSession threw", err);
            /* Continue — might be demo mode or redirect to login */
          }
        } else {
          console.log("[SIDEBAR-DIAG] AuthProvider: supabase not connected, skipping init");
        }

        if (cancelled) return;

        /* 2. Demo mode fallback */
        if (isDemoMode()) {
          devLog("hydrate: demo mode active");
          try {
            const stored = localStorage.getItem("apotek-auth");
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.user && parsed.isAuthenticated) {
                devLog("hydrate: demo session from localStorage");
                clearTimeout(hydrationTimerRef.current!);
                setIsHydrating(false);
                hydratingRef.current = false;
                return;
              }
            }
          } catch {
            /* corrupt storage — ignore */
          }

          if (!useAuthStore.getState().isAuthenticated) {
            devLog("hydrate: auto-login as tenant_owner");
            useAuthStore.getState().loginAs("tenant_owner");
          }
          clearTimeout(hydrationTimerRef.current!);
          setIsHydrating(false);
          hydratingRef.current = false;
          return;
        }

        /* 3. Production with no session → redirect to /login */
        if (!cancelled) {
          console.log("[SIDEBAR-DIAG] AuthProvider: no session, redirecting to /login");
          router.replace("/login");
          clearTimeout(hydrationTimerRef.current!);
          setIsHydrating(false);
          hydratingRef.current = false;
        }
      } catch (err) {
        logAuthHydration("fail");
        devLog("hydrate: unexpected error", err);
        if (!cancelled) {
          setHydrationError("Gagal memulihkan sesi. Silakan muat ulang halaman.");
          clearTimeout(hydrationTimerRef.current!);
          setIsHydrating(false);
          hydratingRef.current = false;
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
      if (hydrationTimerRef.current) {
        clearTimeout(hydrationTimerRef.current);
        hydrationTimerRef.current = null;
      }
      hydratingRef.current = false;
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps —
     * router and pathname are needed for redirect + logging. initFromSupabaseSession
     * is stable (zustand selector). isPublic changes on navigation between public
     * and protected routes — that's intentional. */
  }, [isPublic, initFromSupabaseSession, router, pathname]);

  /* ---- Phase 2: Live auth state listener (Supabase only) ---- */
  useEffect(() => {
    if (!isSupabaseConnected()) {
      devLog("auth listener: supabase not connected, skipping");
      return;
    }

    devLog("auth listener: subscribing to onAuthStateChange");

    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange(async (event) => {
      devLog("onAuthStateChange:", event);

      try {
        if (event === "SIGNED_OUT") {
          devLog("onAuthStateChange: SIGNED_OUT — clearing all state");
          clearDomainStores();
          clearAuthState();
          if (pathname !== "/login") {
            router.push("/login");
          }
        } else if (event === "SIGNED_IN") {
          /* If loginWithEmail is in progress, it handles the full profile chain.
           * Calling initFromSupabaseSession here would race on the same queries. */
          if (isLoginInProgress()) {
            devLog("onAuthStateChange: SIGNED_IN — suppressed (login in progress)");
            return;
          }
          devLog("onAuthStateChange: SIGNED_IN — re-initializing session");
          await initFromSupabaseSession();
        } else if (event === "TOKEN_REFRESHED") {
          /* Token refresh — lightweight profile refresh, no full re-hydration needed */
          if (isLoginInProgress()) {
            devLog("onAuthStateChange: TOKEN_REFRESHED — suppressed (login in progress)");
            return;
          }
          devLog("onAuthStateChange: TOKEN_REFRESHED — refreshing profile only");
          await refreshUserProfile();
        }
        /* INITIAL_SESSION and USER_UPDATED are handled by the hydrate effect */
      } catch (err) {
        devLog("onAuthStateChange: error", err);
      }
    });

    return () => {
      devLog("auth listener: unsubscribing");
      subscription.unsubscribe();
    };
  }, [initFromSupabaseSession, refreshUserProfile, router, pathname]);

  /* ---- Render: loading ---- */
  if (isHydrating) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="text-xs text-neutral-400">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  /* ---- Render: error fallback ---- */
  if (hydrationError) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center px-4">
          <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {hydrationError}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setHydrationError(null);
                setIsHydrating(true);
                window.location.reload();
              }}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
            >
              Muat Ulang
            </button>
            <button
              onClick={() => {
                clearAuthState();
                clearDomainStores();
                router.push("/login");
                setHydrationError(null);
                setIsHydrating(false);
              }}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 transition-colors"
            >
              Ke Halaman Masuk
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Render: children ---- */
  return <>{children}</>;
}
