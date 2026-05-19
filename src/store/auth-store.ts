import { create } from "zustand";
import type { AppRole, Permission, UserProfile } from "@/types";
import { hasPermission } from "@/lib/auth/permissions";
import { isSessionStale } from "@/lib/auth/roles";
import { supabase, isSupabaseConnected } from "@/lib/supabase/client";
import { authRepo, productRepo, supplierRepo, inventoryRepo, transactionRepo } from "@/lib/repository-instances";
import { useCashierStore } from "@/store/cashier-store";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { useHoldCartStore } from "@/store/hold-cart-store";

const AUTH_STORAGE_KEY = "apotek-auth";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function syncRepositoryContext(user: UserProfile | null) {
  const pharmacyId = user?.pharmacyId;
  productRepo.setPharmacyContext(pharmacyId);
  supplierRepo.setPharmacyContext(pharmacyId);
  inventoryRepo.setPharmacyContext(pharmacyId);
  transactionRepo.setPharmacyContext(pharmacyId);
  authRepo.setPharmacyContext(pharmacyId);
}

/* ------------------------------------------------------------------ */
/*  Auth State                                                          */
/* ------------------------------------------------------------------ */

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authMode: "demo" | "supabase";
  lastActiveAt: string;

  // Demo actions
  loginAs: (role: AppRole) => void;
  switchRole: (role: AppRole) => void;

  // Supabase actions
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  initFromSupabaseSession: () => Promise<boolean>;
  refreshUserProfile: () => Promise<boolean>;

  // Shared actions
  logout: () => Promise<void>;

  // Session actions
  touchSession: () => void;

  // Permission checks
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  getRole: () => AppRole | null;
  isSystemUser: () => boolean;
  getPharmacyId: () => string | undefined;
  isDemoMode: () => boolean;
  isSessionExpired: () => boolean;
}

const DEMO_USERS: Record<
  AppRole,
  { email: string; displayName: string; pharmacyId?: string; pharmacyName?: string }
> = {
  super_admin: { email: "super@apotek-manage.id", displayName: "Super Admin" },
  developer: { email: "dev@apotek-manage.id", displayName: "Developer Demo" },
  support: { email: "support@apotek-manage.id", displayName: "Support Demo" },
  owner: {
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
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  authMode: "demo",
  lastActiveAt: new Date().toISOString(),

  /* ---- Demo: loginAs ---- */
  loginAs: (role) => {
    const demo = DEMO_USERS[role];
    const user: UserProfile = {
      id: `demo-${role}`,
      email: demo.email,
      displayName: demo.displayName,
      role,
      isActive: true,
      pharmacyId: demo.pharmacyId,
      pharmacyName: demo.pharmacyName,
    };
    syncRepositoryContext(user);
    set({ user, isAuthenticated: true, isLoading: false, authMode: "demo", lastActiveAt: new Date().toISOString() });
  },

  /* ---- Demo: switchRole ---- */
  switchRole: (role) => {
    const demo = DEMO_USERS[role];
    const user: UserProfile = {
      id: `demo-${role}`,
      email: demo.email,
      displayName: demo.displayName,
      role,
      isActive: true,
      pharmacyId: demo.pharmacyId,
      pharmacyName: demo.pharmacyName,
    };
    syncRepositoryContext(user);
    set({ user });
  },

  /* ---- Supabase: loginWithEmail ---- */
  loginWithEmail: async (email, password) => {
    if (!isSupabaseConnected()) {
      return { success: false, error: "Demo mode — Supabase tidak tersedia." };
    }

    set({ isLoading: true });

    const { data, error } = await supabase!.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      set({ isLoading: false });
      return {
        success: false,
        error:
          error.message === "Invalid login credentials"
            ? "Email atau password salah."
            : error.message,
      };
    }

    if (!data.user) {
      set({ isLoading: false });
      return { success: false, error: "Gagal mendapatkan data pengguna." };
    }

    // Resolve user profile from database
    const profile = await authRepo.getUserBySupabaseUid(data.user.id);

    if (!profile) {
      // User exists in Supabase Auth but not in our users table
      // Sign them out of Supabase since they're not registered in the app
      await supabase!.auth.signOut();
      set({ isLoading: false });
      return {
        success: false,
        error: "Akun belum terdaftar di sistem. Hubungi Super Admin.",
      };
    }

    syncRepositoryContext(profile);
    set({
      user: profile,
      isAuthenticated: true,
      isLoading: false,
      authMode: "supabase",
    });

    // TODO: Optionally update `last_login_at` on the users table here.
    // Skipped because the anon key typically lacks write access.

    return { success: true };
  },

  /* ---- Supabase: initFromSupabaseSession ---- */
  initFromSupabaseSession: async () => {
    if (!isSupabaseConnected()) return false;

    const { data } = await supabase!.auth.getSession();

    if (!data.session?.user) return false;

    const profile = await authRepo.getUserBySupabaseUid(
      data.session.user.id,
    );

    if (!profile) return false;

    syncRepositoryContext(profile);
    set({
      user: profile,
      isAuthenticated: true,
      isLoading: false,
      authMode: "supabase",
      lastActiveAt: new Date().toISOString(),
    });

    return true;
  },

  /* ---- logout (shared, async) ---- */
  logout: async () => {
    const { authMode } = get();

    if (authMode === "supabase" && isSupabaseConnected()) {
      await supabase!.auth.signOut();
    }

    // Clear domain stores to prevent tenant/session leakage
    useCashierStore.getState().resetCashier();
    useTransactionStore.setState({
      transactions: [],
      isLoaded: false,
      isLoading: false,
      isDemoMode: true,
    });
    useInventoryStore.setState({
      batches: [],
      suppliers: [],
      purchaseInvoices: [],
      stockMovements: [],
      stockOpnames: [],
      dataSource: "demo",
      isDemoMode: true,
      isLoading: false,
      isSubmitting: false,
    });
    useHoldCartStore.setState({ heldCarts: [], isHoldListOpen: false });

    syncRepositoryContext(null);

    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    set({ user: null, isAuthenticated: false, isLoading: false, authMode: "demo" });
  },

  /* ---- refreshUserProfile ---- */
  refreshUserProfile: async () => {
    if (!isSupabaseConnected()) return false;

    const { data } = await supabase!.auth.getSession();
    if (!data.session?.user) return false;

    const profile = await authRepo.getUserBySupabaseUid(
      data.session.user.id,
    );

    if (!profile) return false;

    syncRepositoryContext(profile);
    set({
      user: profile,
      isAuthenticated: true,
      isLoading: false,
      authMode: "supabase",
    });

    return true;
  },

  /* ---- Session actions ---- */
  touchSession: () => {
    set({ lastActiveAt: new Date().toISOString() });
  },

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
    return ["super_admin", "developer", "support"].includes(user.role);
  },

  getPharmacyId: () => get().user?.pharmacyId,

  isDemoMode: () => get().authMode === "demo",

  isSessionExpired: () => {
    const { user, lastActiveAt } = get();
    if (!user) return false;
    return isSessionStale(lastActiveAt);
  },
}));

/* ---- localStorage hydration ---- */
const stored =
  typeof window !== "undefined"
    ? localStorage.getItem(AUTH_STORAGE_KEY)
    : null;
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    if (parsed.user && parsed.isAuthenticated) {
      useAuthStore.setState({
        user: parsed.user,
        isAuthenticated: true,
        isLoading: false,
        authMode: parsed.authMode ?? "demo",
        lastActiveAt: parsed.lastActiveAt ?? new Date().toISOString(),
      });
      syncRepositoryContext(parsed.user);
    }
  } catch {
    /* ignore corrupt storage */
  }
}

/* ------------------------------------------------------------------ */
/*  Session staleness hook                                              */
/* ------------------------------------------------------------------ */

/**
 * Hook that returns session staleness information and a refresh action.
 * Returns isStale (boolean), lastActiveAt (ISO string or null when logged out),
 * and refreshSession (calls touchSession to reset the staleness timer).
 */
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

/* ---- localStorage persistence ---- */
useAuthStore.subscribe((state) => {
  if (typeof window !== "undefined") {
    if (state.user && state.isAuthenticated) {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          authMode: state.authMode,
          lastActiveAt: state.lastActiveAt,
        }),
      );
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }
});
