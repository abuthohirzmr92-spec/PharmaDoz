"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore, syncRepositoryContext, isLoginInProgress } from "@/store/auth-store";
import { useCashierStore } from "@/store/cashier-store";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { useHoldCartStore } from "@/store/hold-cart-store";
import { supabase, isSupabaseConnected } from "@/lib/supabase/client";
import { isDemoMode } from "@/config/env";

/* ------------------------------------------------------------------ */
/*  Dev logging (stripped in production)                               */
/* ------------------------------------------------------------------ */

const DEV = process.env.NODE_ENV === "development";
function devLog(...args: unknown[]) {
  if (DEV) console.log("[auth-provider]", ...args);
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPORARY — Deep debug tracing for silent redirect-to-login bug
   Prefix: [MEDISYNC-TRACE] — REMOVE AFTER FIX CONFIRMED
   ═══════════════════════════════════════════════════════════════════════════ */
function trace(tag: string, ...args: unknown[]) {
  console.log(`[MEDISYNC-TRACE] [${tag}]`, ...args);
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

function clearAllDomainStores() {
  useCashierStore.getState().resetCashier();
  useTransactionStore.setState({
    transactions: [],
    isLoaded: false,
    isLoading: false,
    isDemoMode: isDemoMode(),
  });
  useInventoryStore.setState({
    batches: [],
    suppliers: [],
    purchaseInvoices: [],
    stockMovements: [],
    stockOpnames: [],
    dataSource: isDemoMode() ? "demo" : "loading",
    isDemoMode: isDemoMode(),
    isLoading: false,
    isSubmitting: false,
  });
  useHoldCartStore.setState({ heldCarts: [], isHoldListOpen: false });
}

function clearAuthState() {
  console.log("[MEDISYNC-TRACE] [CLEAR_AUTH_STATE] clearing auth state! caller stack:", new Error().stack?.split("\n").slice(1, 4).join(" → "));
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
      trace("HYDRATE", "public path, skip hydration:", pathname);
      devLog("public path, skip hydration:", pathname);
      setIsHydrating(false);
      return;
    }

    /* Already authenticated (navigation between protected routes) */
    const { isAuthenticated, user } = useAuthStore.getState();
    if (isAuthenticated && user) {
      trace("HYDRATE", "already authenticated, skip. role =", user.role, "pathname =", pathname);
      devLog("already authenticated, skip hydration. role =", user.role);
      setIsHydrating(false);
      return;
    }

    trace("HYDRATE", "starting hydration for", pathname, "isAuthenticated =", isAuthenticated);
    /* Prevent duplicate concurrent hydrations (React strict mode) */
    if (hydratingRef.current) {
      trace("HYDRATE", "duplicate — already hydrating");
      devLog("hydration in progress, skip duplicate");
      return;
    }

    let cancelled = false;
    hydratingRef.current = true;

    /* Global timeout — if hydration hangs, show error instead of spinner forever */
    hydrationTimerRef.current = setTimeout(() => {
      if (cancelled) return;
      devLog("hydration timeout — forcing fallback");
      setHydrationError("Gagal memulihkan sesi: waktu tunggu habis. Periksa koneksi internet Anda.");
      setIsHydrating(false);
      hydratingRef.current = false;
    }, HYDRATION_TIMEOUT_MS);

    async function hydrate() {
      trace("HYDRATE_START", "pathname =", pathname);
      devLog("hydrate: start for", pathname);

      try {
        /* 1. Supabase session (with sub-timeout) */
        if (isSupabaseConnected()) {
          trace("HYDRATE", "supabase connected, checking session...");
          devLog("hydrate: checking supabase session");
          try {
            const initResult = await withTimeout(
              initFromSupabaseSession(),
              SESSION_CHECK_TIMEOUT_MS,
              "initFromSupabaseSession",
            );
            const authAfterInit = useAuthStore.getState().isAuthenticated;
            trace("HYDRATE", "initFromSupabaseSession result =", initResult, "isAuthenticated =", authAfterInit);
            if (!cancelled && authAfterInit) {
              devLog("hydrate: session restored, role =", useAuthStore.getState().user?.role);
              trace("HYDRATE", "session restored! clearing timeout and exiting hydration. role =", useAuthStore.getState().user?.role);
              clearTimeout(hydrationTimerRef.current!);
              setIsHydrating(false);
              hydratingRef.current = false;
              return;
            }
            trace("HYDRATE", "session NOT restored. initResult =", initResult, "cancelled =", cancelled);
          } catch (err) {
            trace("HYDRATE", "session check timed out or failed:", String(err));
            devLog("hydrate: session check timed out or failed", err);
            /* Continue — might be demo mode or redirect to login */
          }
        } else {
          trace("HYDRATE", "supabase NOT connected");
          devLog("hydrate: supabase not connected");
        }

        if (cancelled) {
          trace("HYDRATE", "cancelled after supabase check");
          return;
        }

        /* 2. Demo mode fallback */
        if (isDemoMode()) {
          trace("HYDRATE", "demo mode active");
          devLog("hydrate: demo mode active");
          try {
            const stored = localStorage.getItem("apotek-auth");
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.user && parsed.isAuthenticated) {
                trace("HYDRATE", "demo session restored from localStorage");
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
            trace("HYDRATE", "auto-login as tenant_owner");
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
          trace("HYDRATE", "NO SESSION — redirecting to /login. isDemoMode =", isDemoMode(), "isSupabaseConnected =", isSupabaseConnected());
          devLog("hydrate: no session, redirect /login");
          router.replace("/login");
          clearTimeout(hydrationTimerRef.current!);
          setIsHydrating(false);
          hydratingRef.current = false;
        }
      } catch (err) {
        trace("HYDRATE", "unexpected error:", String(err));
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

    trace("AUTH_LISTENER", "subscribing to onAuthStateChange");
    devLog("auth listener: subscribing to onAuthStateChange");

    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange(async (event) => {
      trace("AUTH_EVENT", "event =", event, "loginInProgress =", isLoginInProgress(), "pathname =", pathname);
      devLog("onAuthStateChange:", event);

      try {
        if (event === "SIGNED_OUT") {
          trace("AUTH_EVENT", "SIGNED_OUT — clearing all state and redirecting to /login");
          devLog("onAuthStateChange: SIGNED_OUT — clearing all state");
          clearAllDomainStores();
          clearAuthState();
          if (pathname !== "/login") {
            trace("AUTH_EVENT", "SIGNED_OUT — router.push(/login)");
            router.push("/login");
          }
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          /* If loginWithEmail is in progress, it handles the full profile chain.
           * Calling initFromSupabaseSession here would race on the same queries. */
          if (isLoginInProgress()) {
            trace("AUTH_EVENT", event, "— suppressed (login in progress)");
            devLog("onAuthStateChange:", event, "— suppressed (login in progress)");
            return;
          }
          trace("AUTH_EVENT", event, "— re-initializing session");
          devLog("onAuthStateChange:", event, "— re-initializing session");
          await initFromSupabaseSession();
        } else {
          trace("AUTH_EVENT", event, "— unhandled event type (no action)");
        }
        /* INITIAL_SESSION and USER_UPDATED are handled by the hydrate effect */
      } catch (err) {
        trace("AUTH_EVENT", "error in handler:", String(err));
        devLog("onAuthStateChange: error", err);
      }
    });

    return () => {
      devLog("auth listener: unsubscribing");
      subscription.unsubscribe();
    };
  }, [initFromSupabaseSession, router, pathname]);

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
                clearAllDomainStores();
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
