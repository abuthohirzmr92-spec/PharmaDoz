"use client";

import { create } from "zustand";
import type { AppRole, Permission, UserProfile } from "@/types";
import { hasPermission } from "@/lib/auth/permissions";
import { isSessionStale } from "@/lib/auth/roles";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { supabase, isSupabaseConnected } from "@/lib/supabase/client";
import { isDemoMode } from "@/config/env";
import {
  authRepo,
  productRepo,
  supplierRepo,
  inventoryRepo,
  transactionRepo,
} from "@/lib/repository-instances";
import { useCashierStore } from "@/store/cashier-store";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { useHoldCartStore } from "@/store/hold-cart-store";

/* ------------------------------------------------------------------ */
/*  Dev logging (stripped in production)                               */
/* ------------------------------------------------------------------ */

const DEV = process.env.NODE_ENV === "development";
function devLog(...args: unknown[]) {
  if (DEV) console.log("[auth]", ...args);
}


/**
 * Module-level flag to prevent the SIGNED_IN → initFromSupabaseSession
 * race when loginWithEmail is already handling the full profile chain.
 */
let loginInProgress = false;

export function isLoginInProgress(): boolean {
  return loginInProgress;
}

/**
 * Module-level hydration mutex. React StrictMode double-mount + fast
 * navigation can trigger parallel initFromSupabaseSession calls. Two
 * concurrent supabase.auth.getSession() calls deadlock the GoTrue
 * client's internal state machine, causing both to time out (8 s).
 *
 * By storing the Promise itself, subsequent callers await the same
 * single getSession() → profile hydration chain instead of starting
 * a duplicate that races on the same auth state.
 */
let hydrationPromise: Promise<boolean> | null = null;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function syncRepositoryContext(user: UserProfile | null) {
  if (user && user.tenantId && user.role) {
    const ctx = { tenantId: user.tenantId, role: user.role, userId: user.id };
    productRepo.setTenantContext(ctx);
    supplierRepo.setTenantContext(ctx);
    inventoryRepo.setTenantContext(ctx);
    transactionRepo.setTenantContext(ctx);
    authRepo.setTenantContext(ctx);
  } else if (user && user.pharmacyId) {
    const ctx = { tenantId: user.pharmacyId, role: user.role, userId: user.id };
    productRepo.setTenantContext(ctx);
    supplierRepo.setTenantContext(ctx);
    inventoryRepo.setTenantContext(ctx);
    transactionRepo.setTenantContext(ctx);
    authRepo.setTenantContext(ctx);
  } else {
    productRepo.setTenantContext(undefined);
    supplierRepo.setTenantContext(undefined);
    inventoryRepo.setTenantContext(undefined);
    transactionRepo.setTenantContext(undefined);
    authRepo.setTenantContext(undefined);
  }
}

export function clearDomainStores() {
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

/** Promise-based timeout guard for hydration operations */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Hydration timeout: ${label}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/* ------------------------------------------------------------------ */
/*  Demo users (only used in demo mode)                                */
/* ------------------------------------------------------------------ */

const DEMO_USERS: Record<
  AppRole,
  { email: string; displayName: string; pharmacyId?: string; pharmacyName?: string }
> = {
  super_admin: { email: "super@apotek-manage.id", displayName: "Super Admin" },
  developer: { email: "dev@apotek-manage.id", displayName: "Developer" },
  support_ai: { email: "ai@apotek-manage.id", displayName: "Support AI" },
  tenant_owner: {
    email: "owner@apotek-sehat.id",
    displayName: "Budi Santoso",
    pharmacyId: "pharm-001",
    pharmacyName: "Apotek Sehat",
  },
  pharmacist: {
    email: "apoteker@apotek-sehat.id",
    displayName: "Joko Widodo",
    pharmacyId: "pharm-001",
    pharmacyName: "Apotek Sehat",
  },
  admin: {
    email: "admin@apotek-sehat.id",
    displayName: "Sari Dewi",
    pharmacyId: "pharm-001",
    pharmacyName: "Apotek Sehat",
  },
  cashier: {
    email: "kasir@apotek-sehat.id",
    displayName: "Ani Lestari",
    pharmacyId: "pharm-001",
    pharmacyName: "Apotek Sehat",
  },
  staff: {
    email: "staff@apotek-sehat.id",
    displayName: "Rina Wijaya",
    pharmacyId: "pharm-001",
    pharmacyName: "Apotek Sehat",
  },
};

function buildDemoUser(role: AppRole): UserProfile {
  const demo = DEMO_USERS[role];
  return {
    id: `demo-${role}`,
    email: demo.email,
    displayName: demo.displayName,
    role,
    isActive: true,
    pharmacyId: demo.pharmacyId,
    pharmacyName: demo.pharmacyName,
    tenantId: demo.pharmacyId,
    tenantName: demo.pharmacyName,
  };
}

/* ------------------------------------------------------------------ */
/*  Auth State                                                         */
/* ------------------------------------------------------------------ */

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastActiveAt: string;
  error: string | null;

  /* Demo actions (development / testing only) */
  loginAs: (role: AppRole) => void;
  switchRole: (role: AppRole) => void;

  /* Impersonation (super admin only) */
  impersonating: boolean;
  originalUser: UserProfile | null;
  impersonateUser: (targetProfile: UserProfile) => void;
  endImpersonation: () => void;

  /* Supabase actions */
  loginWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ success: boolean; error?: string; userId?: string }>;
  initFromSupabaseSession: () => Promise<boolean>;
  refreshUserProfile: () => Promise<boolean>;

  /* Shared actions */
  logout: () => Promise<void>;
  touchSession: () => void;
  clearError: () => void;

  /* Permission checks */
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  getRole: () => AppRole | null;
  isSystemUser: () => boolean;
  getPharmacyId: () => string | undefined;
  isStoreDemoMode: () => boolean;
  isSessionExpired: () => boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  lastActiveAt: new Date().toISOString(),
  error: null,
  impersonating: false,
  originalUser: null,

  /* ---- Demo: loginAs ---- */
  loginAs: (role) => {
    if (!isDemoMode()) {
      set({ error: "Demo login hanya tersedia di development mode." });
      return;
    }
    const user = buildDemoUser(role);
    syncRepositoryContext(user);
    set({
      user,
      isAuthenticated: true,
      isLoading: false,
      lastActiveAt: new Date().toISOString(),
      error: null,
    });
  },

  /* ---- Demo: switchRole ---- */
  switchRole: (role) => {
    if (!isDemoMode()) {
      set({ error: "Demo role switch hanya tersedia di development mode." });
      return;
    }
    const user = buildDemoUser(role);
    syncRepositoryContext(user);
    set({ user, error: null });
  },

  /* ---- Impersonation ---- */
  impersonateUser: (targetProfile) => {
    const current = get().user;
    if (!current || !isSuperAdmin(current.role)) {
      set({ error: "Hanya Super Admin yang dapat melakukan impersonasi." });
      return;
    }
    syncRepositoryContext(targetProfile);
    set({
      originalUser: current,
      user: targetProfile,
      impersonating: true,
      error: null,
    });
  },

  endImpersonation: () => {
    const original = get().originalUser;
    if (!original) return;
    syncRepositoryContext(original);
    set({
      user: original,
      originalUser: null,
      impersonating: false,
      error: null,
    });
  },

  /* ---- Supabase: loginWithEmail ---- */
  loginWithEmail: async (email, password) => {
    if (!isSupabaseConnected()) {
      return {
        success: false,
        error: "Layanan autentikasi tidak tersedia. Coba lagi nanti.",
      };
    }

    if (loginInProgress) {
      return { success: false, error: "Proses login sedang berjalan. Tunggu sebentar." };
    }

    loginInProgress = true;
    set({ isLoading: true, error: null });
    devLog("loginWithEmail: starting for", email);

    try {
      /* Step 1: Supabase auth (15s timeout) */
      const { data, error } = await withTimeout(
        supabase!.auth.signInWithPassword({ email, password }),
        15000,
        "signInWithPassword",
      );

      if (error) {
        set({ isLoading: false });
        devLog("loginWithEmail: auth error", error.message);
        const msg =
          error.message === "Invalid login credentials"
            ? "Email atau password salah."
            : error.message.includes("Email not confirmed")
              ? "Email belum diverifikasi. Cek inbox Anda."
              : error.message.includes("rate limit")
                ? "Terlalu banyak percobaan. Coba lagi nanti."
                : "Gagal masuk: " + error.message;
        return { success: false, error: msg };
      }

      if (!data.user) {
        set({ isLoading: false });
        return { success: false, error: "Gagal mendapatkan data pengguna." };
      }

      const supabaseUser = data.user;

      /* Step 2: Profile lookup (8s timeout — prevents RLS/network hang) */
      let profile: UserProfile | null = null;
      try {
        profile = await withTimeout(
          authRepo.getUserBySupabaseUid(supabaseUser.id),
          8000,
          "getUserBySupabaseUid",
        );
        console.log("[SIDEBAR-DIAG] loginWithEmail: profile lookup result", {
          found: !!profile,
          role: profile?.role ?? null,
          tenantId: profile?.tenantId ?? null,
          displayName: profile?.displayName ?? null,
        });
        devLog("loginWithEmail: profile lookup complete, found =", !!profile);
      } catch (profileErr) {
        set({ isLoading: false });
        return {
          success: false,
          error: "Gagal mengambil profil. Periksa koneksi internet Anda.",
        };
      }

      /* If profile has tenant_id but role is "unaffiliated", the tenant_users
       * lookup failed — repair via ensureProfile. */
      if (profile && (profile.role as string) === "unaffiliated" && profile.tenantId) {
        console.error(
          "[auth] loginWithEmail: profile has tenant_id but role is unaffiliated — attempting repair",
          { userId: profile.id, tenantId: profile.tenantId },
        );
        profile = null;
      }

      /* Step 3: Ensure profile exists (8s timeout — prevents RLS/network hang) */
      if (!profile) {
        devLog("loginWithEmail: profile missing, running ensureProfile");
        try {
          profile = await withTimeout(
            authRepo.ensureProfile({
              id: supabaseUser.id,
              email: supabaseUser.email ?? email,
              displayName: supabaseUser.user_metadata?.display_name ?? email,
            }),
            8000,
            "ensureProfile",
          );
        } catch (ensureErr) {
          set({ isLoading: false });
          return {
            success: false,
            error: "Gagal membuat profil. Hubungi Super Admin.",
          };
        }
      }

      if (!profile) {
        await supabase!.auth.signOut().catch(() => {});
        set({ isLoading: false });
        return {
          success: false,
          error: "Gagal membuat profil. Hubungi Super Admin.",
        };
      }

      if ((profile.role as string) === "unaffiliated" && profile.tenantId) {
        console.error(
          "[auth] loginWithEmail: CRITICAL — profile still unaffiliated after repair.",
          { userId: profile.id, tenantId: profile.tenantId },
        );
        /* Don't block login — the user can still access the dashboard.
         * The sidebar will show limited/empty navigation until the root
         * cause (tenant_users lookup failure) is resolved. */
      }

      syncRepositoryContext(profile);
      set({
        user: profile,
        isAuthenticated: true,
        isLoading: false,
        lastActiveAt: new Date().toISOString(),
        error: null,
      });

      devLog("loginWithEmail: success, role =", profile.role);
      return { success: true };
    } catch (err) {
      devLog("loginWithEmail: exception", err);
      set({ isLoading: false });
      return {
        success: false,
        error: "Jaringan bermasalah. Periksa koneksi internet Anda.",
      };
    } finally {
      loginInProgress = false;
    }
  },

  /* ---- Supabase: signUp ---- */
  signUp: async (email, password, displayName) => {
    if (!isSupabaseConnected()) {
      return { success: false, error: "Layanan pendaftaran tidak tersedia." };
    }

    set({ isLoading: true, error: null });
    devLog("signUp: starting for", email);

    try {
      const { data, error } = await supabase!.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });

      if (error) {
        set({ isLoading: false });
        const msg =
          error.message === "User already registered"
            ? "Email sudah terdaftar. Silakan masuk."
            : error.message.includes("rate limit")
              ? "Terlalu banyak percobaan. Coba lagi nanti."
              : "Gagal mendaftar: " + error.message;
        return { success: false, error: msg };
      }

      set({ isLoading: false });
      devLog("signUp: success, userId =", data.user?.id);
      return { success: true, userId: data.user?.id };
    } catch (err) {
      devLog("signUp: exception", err);
      set({ isLoading: false });
      return { success: false, error: "Jaringan bermasalah. Periksa koneksi internet Anda." };
    }
  },

  /* ---- Supabase: initFromSupabaseSession ---- */
  initFromSupabaseSession: async () => {
    console.log("[SIDEBAR-DIAG] initFromSupabaseSession: ENTERED", {
      isSupabaseConnected: isSupabaseConnected(),
      loginInProgress,
      alreadyAuth: get().isAuthenticated,
      existingHydrationPromise: !!hydrationPromise,
    });

    /* Module-level mutex: if hydration is already in flight, await the
     * existing promise instead of starting a parallel getSession() that
     * would deadlock the GoTrue client's internal state machine. */
    if (hydrationPromise) {
      console.log("[SIDEBAR-DIAG] initFromSupabaseSession: reusing in-flight hydration promise");
      return hydrationPromise;
    }

    if (!isSupabaseConnected()) {
      console.error("[SIDEBAR-DIAG] initFromSupabaseSession: supabase not connected — ABORT");
      return false;
    }

    /* If loginWithEmail is in progress, don't race — it handles everything */
    if (loginInProgress) {
      console.log("[SIDEBAR-DIAG] initFromSupabaseSession: login in progress — DEFER");
      return false;
    }

    /* Prevent duplicate concurrent initializations */
    const state = get();
    if (state.isAuthenticated && state.user) {
      console.log("[SIDEBAR-DIAG] initFromSupabaseSession: already authenticated — SKIP", { role: state.user.role });
      return true;
    }

    console.log("[SIDEBAR-DIAG] initFromSupabaseSession: calling getSession...");

    /* Wrap all async work in a single promise stored at module level.
     * Subsequent callers (StrictMode remount, auth listener, etc.) will
     * await this same promise instead of starting a duplicate chain. */
    hydrationPromise = (async (): Promise<boolean> => {
      try {
        const { data } = await withTimeout(
          supabase!.auth.getSession(),
          8000,
          "getSession",
        );

        const now = Date.now() / 1000;
        console.log("[SIDEBAR-DIAG] initFromSupabaseSession: getSession result", {
          hasSession: !!data.session,
          userId: data.session?.user?.id ?? null,
          email: data.session?.user?.email ?? null,
          expiresAt: data.session?.expires_at ?? null,
          expiresInSec: data.session?.expires_at ? (data.session.expires_at - now).toFixed(0) : null,
          isExpired: data.session?.expires_at ? data.session.expires_at < now : null,
          tokenLength: data.session?.access_token?.length ?? 0,
        });

        if (!data.session?.user) {
          devLog("initFromSupabaseSession: no session");
          return false;
        }

        const supabaseUser = data.session.user;

        /* Profile lookup (8s timeout) */
        let profile: UserProfile | null = null;
        try {
          profile = await withTimeout(
            authRepo.getUserBySupabaseUid(supabaseUser.id),
            8000,
            "getUserBySupabaseUid",
          );
          console.log("[SIDEBAR-DIAG] initFromSupabaseSession: profile lookup result", {
            found: !!profile,
            role: profile?.role ?? null,
            tenantId: profile?.tenantId ?? null,
            displayName: profile?.displayName ?? null,
            email: profile?.email ?? null,
            isActive: profile?.isActive ?? null,
          });
        } catch {
          devLog("initFromSupabaseSession: profile lookup timed out");
          set({ isLoading: false });
          return false;
        }

        /* If profile has tenant_id but role is "unaffiliated", the tenant_users
         * lookup failed — try ensureProfile to repair the profile state. */
        if (profile && (profile.role as string) === "unaffiliated" && profile.tenantId) {
          console.error(
            "[auth] profile has tenant_id but role is unaffiliated — attempting repair via ensureProfile",
            { userId: profile.id, tenantId: profile.tenantId },
          );
          profile = null;
        }

        /* Ensure profile (8s timeout) */
        if (!profile) {
          devLog("initFromSupabaseSession: profile missing, running ensureProfile");
          try {
            profile = await withTimeout(
              authRepo.ensureProfile({
                id: supabaseUser.id,
                email: supabaseUser.email ?? "",
                displayName: supabaseUser.user_metadata?.display_name ?? supabaseUser.email ?? "",
              }),
              8000,
              "ensureProfile",
            );
          } catch {
            devLog("initFromSupabaseSession: ensureProfile timed out");
            set({ isLoading: false });
            return false;
          }
        }

        if (!profile) {
          devLog("initFromSupabaseSession: profile creation failed");
          set({ isLoading: false });
          return false;
        }

        if ((profile.role as string) === "unaffiliated" && profile.tenantId) {
          console.error(
            "[auth] initFromSupabaseSession: CRITICAL — profile still unaffiliated after repair.",
            { userId: profile.id, tenantId: profile.tenantId },
          );
          console.log("[SIDEBAR-DIAG] initFromSupabaseSession: clearing corrupted session and redirecting to login");
          try {
            await supabase!.auth.signOut();
          } catch {
            /* non-fatal */
          }
          set({ isLoading: false });
          return false;
        }

        syncRepositoryContext(profile);
        set({
          user: profile,
          isAuthenticated: true,
          isLoading: false,
          lastActiveAt: new Date().toISOString(),
          error: null,
        });

        devLog("initFromSupabaseSession: success, role =", profile.role);
        return true;
      } catch (err) {
        console.error("[SIDEBAR-DIAG] initFromSupabaseSession: exception", err);
        set({ isLoading: false });
        return false;
      }
    })();

    try {
      return await hydrationPromise;
    } finally {
      hydrationPromise = null;
    }
  },

  /* ---- refreshUserProfile ---- */
  refreshUserProfile: async () => {
    if (!isSupabaseConnected()) return false;

    /* If a full hydration is already in flight, reuse its result —
     * it already does profile lookup which is a superset of refresh. */
    if (hydrationPromise) {
      console.log("[SIDEBAR-DIAG] refreshUserProfile: deferring to in-flight hydration promise");
      return hydrationPromise;
    }

    if (loginInProgress) {
      console.log("[SIDEBAR-DIAG] refreshUserProfile: login in progress — DEFER");
      return false;
    }

    try {
      const { data } = await withTimeout(
        supabase!.auth.getSession(),
        8000,
        "refreshUserProfile-getSession",
      );
      if (!data.session?.user) return false;

      const profile = await withTimeout(
        authRepo.getUserBySupabaseUid(data.session.user.id),
        8000,
        "refreshUserProfile",
      );
      if (!profile) return false;

      syncRepositoryContext(profile);
      set({
        user: profile,
        isAuthenticated: true,
        isLoading: false,
      });

      return true;
    } catch {
      return false;
    }
  },

  /* ---- logout (shared, async) ---- */
  logout: async () => {
    devLog("logout: signing out");

    try {
      if (isSupabaseConnected()) {
        await withTimeout(
          supabase!.auth.signOut(),
          10000,
          "signOut",
        );
      }
    } catch {
      // signOut timed out or failed — still clear local state
    }

    clearDomainStores();
    syncRepositoryContext(null);

    if (typeof window !== "undefined") {
      localStorage.removeItem("apotek-auth");
    }

    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      impersonating: false,
      originalUser: null,
    });

    devLog("logout: complete");
  },

  /* ---- Session actions ---- */
  touchSession: () => {
    set({ lastActiveAt: new Date().toISOString() });
  },

  clearError: () => set({ error: null }),

  /* ---- Permission checks ---- */
  can: (permission) => {
    const { user } = get();
    if (!user) return false;
    return hasPermission(user.role, permission);
  },

  canAny: (permissions) => {
    const { user } = get();
    if (!user) return false;
    return permissions.some((p) => hasPermission(user.role, p));
  },

  canAll: (permissions) => {
    const { user } = get();
    if (!user) return false;
    return permissions.every((p) => hasPermission(user.role, p));
  },

  getRole: () => get().user?.role ?? null,

  isSystemUser: () => {
    const { user } = get();
    if (!user) return false;
    return isPlatformUser(user.role);
  },

  getPharmacyId: () => get().user?.pharmacyId,

  /* Use the actual env check — NOT "supabase not connected" */
  isStoreDemoMode: () => isDemoMode(),

  isSessionExpired: () => {
    const { user, lastActiveAt } = get();
    if (!user) return false;
    return isSessionStale(lastActiveAt);
  },
}));

/* ------------------------------------------------------------------ */
/*  Demo-only: localStorage hydration (does NOT run in production)      */
/* ------------------------------------------------------------------ */

if (typeof window !== "undefined" && isDemoMode()) {
  const stored = localStorage.getItem("apotek-auth");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.user && parsed.isAuthenticated) {
        useAuthStore.setState({
          user: parsed.user,
          isAuthenticated: true,
          isLoading: false,
          lastActiveAt: parsed.lastActiveAt ?? new Date().toISOString(),
        });
        syncRepositoryContext(parsed.user);
      }
    } catch {
      /* ignore corrupt storage */
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Demo-only: localStorage persistence (does NOT run in production)    */
/* ------------------------------------------------------------------ */

if (typeof window !== "undefined" && isDemoMode()) {
  useAuthStore.subscribe((state) => {
    if (state.user && state.isAuthenticated) {
      localStorage.setItem(
        "apotek-auth",
        JSON.stringify({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          lastActiveAt: state.lastActiveAt,
        }),
      );
    } else {
      localStorage.removeItem("apotek-auth");
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Session staleness hook                                             */
/* ------------------------------------------------------------------ */

export function useSessionStaleness(): {
  isStale: boolean;
  lastActiveAt: string | null;
  refreshSession: () => void;
} {
  const lastActiveAt = useAuthStore((s) => s.lastActiveAt);
  const user = useAuthStore((s) => s.user);
  const touchSession = useAuthStore((s) => s.touchSession);

  return {
    isStale: user && lastActiveAt ? isSessionStale(lastActiveAt) : false,
    lastActiveAt: user ? lastActiveAt : null,
    refreshSession: touchSession,
  };
}
