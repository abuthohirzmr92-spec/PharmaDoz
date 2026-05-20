"use client";

import { create } from "zustand";
import type { AppRole, Permission, UserProfile } from "@/types";
import { hasPermission } from "@/lib/auth/permissions";
import { isSessionStale } from "@/lib/auth/roles";
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
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function syncRepositoryContext(user: UserProfile | null) {
  if (user && user.tenantId && user.role) {
    const ctx = { tenantId: user.tenantId, role: user.role, userId: user.id };
    productRepo.setTenantContext(ctx);
    supplierRepo.setTenantContext(ctx);
    inventoryRepo.setTenantContext(ctx);
    transactionRepo.setTenantContext(ctx);
    authRepo.setTenantContext(ctx);
  } else if (user && user.pharmacyId) {
    // Legacy fallback: use pharmacyId as tenantId
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

function clearDomainStores() {
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

/* ------------------------------------------------------------------ */
/*  Demo users (only used in demo mode)                                */
/* ------------------------------------------------------------------ */

const DEMO_USERS: Record<
  AppRole,
  { email: string; displayName: string; pharmacyId?: string; pharmacyName?: string }
> = {
  super_admin: { email: "super@apotek-manage.id", displayName: "Super Admin" },
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
  isDemoMode: () => boolean;
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
    if (!current || !["super_admin"].includes(current.role)) {
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
        error: "Supabase tidak tersedia. Gunakan NEXT_PUBLIC_DEMO_MODE=true untuk development.",
      };
    }

    set({ isLoading: true, error: null });

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

    // Resolve user profile — create on first login if missing
    const supabaseUser = data.user;
    let profile = await authRepo.getUserBySupabaseUid(supabaseUser.id);

    if (!profile) {
      // First login — auto-create profile from Supabase auth user
      profile = await authRepo.ensureProfile({
        id: supabaseUser.id,
        email: supabaseUser.email ?? email,
        displayName: supabaseUser.user_metadata?.display_name ?? email,
      });
    }

    if (!profile) {
      await supabase!.auth.signOut();
      set({ isLoading: false });
      return {
        success: false,
        error: "Gagal membuat profil pengguna. Hubungi Super Admin.",
      };
    }

    syncRepositoryContext(profile);
    set({
      user: profile,
      isAuthenticated: true,
      isLoading: false,
      lastActiveAt: new Date().toISOString(),
      error: null,
    });

    return { success: true };
  },

  /* ---- Supabase: signUp ---- */
  signUp: async (email, password, displayName) => {
    if (!isSupabaseConnected()) {
      return { success: false, error: "Supabase tidak tersedia." };
    }

    set({ isLoading: true, error: null });

    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });

    if (error) {
      set({ isLoading: false });
      const msg =
        error.message === "User already registered"
          ? "Email sudah terdaftar. Silakan masuk."
          : error.message;
      return { success: false, error: msg };
    }

    set({ isLoading: false });
    return { success: true, userId: data.user?.id };
  },

  /* ---- Supabase: initFromSupabaseSession ---- */
  initFromSupabaseSession: async () => {
    if (!isSupabaseConnected()) return false;

    const { data } = await supabase!.auth.getSession();
    if (!data.session?.user) return false;

    const supabaseUser = data.session.user;
    let profile = await authRepo.getUserBySupabaseUid(supabaseUser.id);

    if (!profile) {
      profile = await authRepo.ensureProfile({
        id: supabaseUser.id,
        email: supabaseUser.email ?? "",
        displayName: supabaseUser.user_metadata?.display_name ?? supabaseUser.email ?? "",
      });
    }

    if (!profile) return false;

    syncRepositoryContext(profile);
    set({
      user: profile,
      isAuthenticated: true,
      isLoading: false,
      lastActiveAt: new Date().toISOString(),
      error: null,
    });

    return true;
  },

  /* ---- refreshUserProfile ---- */
  refreshUserProfile: async () => {
    if (!isSupabaseConnected()) return false;

    const { data } = await supabase!.auth.getSession();
    if (!data.session?.user) return false;

    const profile = await authRepo.getUserBySupabaseUid(data.session.user.id);
    if (!profile) return false;

    syncRepositoryContext(profile);
    set({
      user: profile,
      isAuthenticated: true,
      isLoading: false,
    });

    return true;
  },

  /* ---- logout (shared, async) ---- */
  logout: async () => {
    if (isSupabaseConnected()) {
      await supabase!.auth.signOut();
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
    return ["super_admin"].includes(user.role);
  },

  getPharmacyId: () => get().user?.pharmacyId,

  isDemoMode: () => !isSupabaseConnected(),

  isSessionExpired: () => {
    const { user, lastActiveAt } = get();
    if (!user) return false;
    return isSessionStale(lastActiveAt);
  },
}));

/* ---- Demo mode localStorage hydration ---- */
if (typeof window !== "undefined") {
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

/* ---- localStorage persistence ---- */
useAuthStore.subscribe((state) => {
  if (typeof window !== "undefined") {
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
  }
});

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
