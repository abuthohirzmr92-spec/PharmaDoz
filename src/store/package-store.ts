"use client";

import { create } from "zustand";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { isDemoMode as checkDemoMode } from "@/config/env";
import { packageRepo } from "@/lib/repository-instances";
import type { PackageRow, CreatePackageInput, UpdatePackageInput } from "@/lib/repositories/package";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface PackageState {
  packages: PackageRow[];
  isLoading: boolean;
  error: string | null;

  loadPackages(): Promise<void>;
  createPackage(data: CreatePackageInput): Promise<PackageRow | null>;
  updatePackage(id: string, data: UpdatePackageInput): Promise<void>;
  deletePackage(id: string): Promise<boolean>;
  clear(): void;
}

/* ------------------------------------------------------------------ */
/*  Demo seed data                                                     */
/* ------------------------------------------------------------------ */

const DEMO_PACKAGES: PackageRow[] = [
  {
    id: "pkg-demo-basic",
    name: "basic",
    label: "Basic",
    max_users: 3,
    max_branches: 1,
    max_products: 200,
    monthly_price: 0,
    is_active: true,
    is_custom: false,
    feature_flags: {
      financial_wallet: false,
      cashflow_dashboard: false,
      ai_diagnostics: false,
      advanced_reporting: false,
      stock_transfer: false,
      dashboard_analytics: false,
    },
    sort_order: 1,
  },
  {
    id: "pkg-demo-professional",
    name: "professional",
    label: "Professional",
    max_users: 20,
    max_branches: 5,
    max_products: 1000,
    monthly_price: 299000,
    is_active: true,
    is_custom: false,
    feature_flags: {
      financial_wallet: true,
      cashflow_dashboard: false,
      ai_diagnostics: false,
      advanced_reporting: true,
      stock_transfer: true,
      dashboard_analytics: true,
    },
    sort_order: 2,
  },
  {
    id: "pkg-demo-enterprise",
    name: "enterprise",
    label: "Enterprise",
    max_users: 50,
    max_branches: 10,
    max_products: 10000,
    monthly_price: 999000,
    is_active: true,
    is_custom: false,
    feature_flags: {
      financial_wallet: true,
      cashflow_dashboard: true,
      ai_diagnostics: true,
      maintenance_automation: true,
      advanced_reporting: true,
      stock_transfer: true,
      dashboard_analytics: true,
      white_label: true,
      api_access: true,
      priority_support: true,
    },
    sort_order: 3,
  },
];

/* ------------------------------------------------------------------ */
/*  Store                                                               */
/* ------------------------------------------------------------------ */

export const usePackageStore = create<PackageState>((set, get) => ({
  packages: [],
  isLoading: false,
  error: null,

  loadPackages: async () => {
    set({ isLoading: true, error: null });

    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      set({ packages: DEMO_PACKAGES, isLoading: false });
      return;
    }

    try {
      const packages = await packageRepo.getAllPackages();
      set({ packages, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Gagal memuat paket",
        isLoading: false,
      });
    }
  },

  createPackage: async (data) => {
    set({ isLoading: true, error: null });

    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      const newPkg: PackageRow = {
        id: `pkg-demo-${Date.now()}`,
        name: data.name,
        label: data.label,
        max_users: data.maxUsers ?? 5,
        max_branches: data.maxBranches ?? 1,
        max_products: data.maxProducts ?? 200,
        monthly_price: data.monthlyPrice ?? 0,
        is_active: data.isActive ?? true,
        is_custom: true,
        feature_flags: data.featureFlags ?? {},
        sort_order: data.sortOrder ?? 99,
      };
      set((s) => ({ packages: [...s.packages, newPkg], isLoading: false }));
      return newPkg;
    }

    try {
      const pkg = await packageRepo.createPackage(data);
      await get().loadPackages();
      set({ isLoading: false });
      return pkg;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Gagal membuat paket",
        isLoading: false,
      });
      return null;
    }
  },

  updatePackage: async (id, data) => {
    set({ isLoading: true, error: null });

    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      set((s) => ({
        packages: s.packages.map((p) =>
          p.id === id ? { ...p, ...data, feature_flags: data.featureFlags ?? p.feature_flags } : p,
        ),
        isLoading: false,
      }));
      return;
    }

    try {
      await packageRepo.updatePackage(id, data);
      await get().loadPackages();
      set({ isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Gagal update paket",
        isLoading: false,
      });
    }
  },

  deletePackage: async (id) => {
    set({ isLoading: true, error: null });

    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      set((s) => ({
        packages: s.packages.filter((p) => p.id !== id),
        isLoading: false,
      }));
      return true;
    }

    try {
      await packageRepo.deletePackage(id);
      await get().loadPackages();
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Gagal menghapus paket",
        isLoading: false,
      });
      return false;
    }
  },

  clear: () => set({ packages: [], isLoading: false, error: null }),
}));
