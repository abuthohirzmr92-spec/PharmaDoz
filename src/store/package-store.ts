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
    maxUsers: 3,
    maxBranches: 1,
    maxProducts: 200,
    monthlyPrice: 0,
    isActive: true,
    isCustom: false,
    featureFlags: {
      financial_wallet: false,
      cashflow_dashboard: false,
      ai_diagnostics: false,
      advanced_reporting: false,
      stock_transfer: false,
      dashboard_analytics: false,
    },
    sortOrder: 1,
  },
  {
    id: "pkg-demo-professional",
    name: "professional",
    label: "Professional",
    maxUsers: 20,
    maxBranches: 5,
    maxProducts: 1000,
    monthlyPrice: 299000,
    isActive: true,
    isCustom: false,
    featureFlags: {
      financial_wallet: true,
      cashflow_dashboard: false,
      ai_diagnostics: false,
      advanced_reporting: true,
      stock_transfer: true,
      dashboard_analytics: true,
    },
    sortOrder: 2,
  },
  {
    id: "pkg-demo-enterprise",
    name: "enterprise",
    label: "Enterprise",
    maxUsers: 50,
    maxBranches: 10,
    maxProducts: 10000,
    monthlyPrice: 999000,
    isActive: true,
    isCustom: false,
    featureFlags: {
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
    sortOrder: 3,
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
        maxUsers: data.maxUsers ?? 5,
        maxBranches: data.maxBranches ?? 1,
        maxProducts: data.maxProducts ?? 200,
        monthlyPrice: data.monthlyPrice ?? 0,
        isActive: data.isActive ?? true,
        isCustom: true,
        featureFlags: data.featureFlags ?? {},
        sortOrder: data.sortOrder ?? 99,
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
      // Surface FULL Supabase error to UI
      const msg = err instanceof Error ? err.message : String(err);
      const supabaseCode = (err as any)?.supabaseCode ?? null;
      const supabaseDetails = (err as any)?.supabaseDetails ?? null;
      const fullError = [
        msg,
        supabaseCode ? `Supabase code: ${supabaseCode}` : null,
        supabaseDetails ? `Details: ${supabaseDetails}` : null,
      ].filter(Boolean).join("\n");

      console.error("[PackageStore.createPackage] ERROR:", { msg, supabaseCode, supabaseDetails, err });

      set({
        error: fullError,
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
          p.id === id ? { ...p, ...data, featureFlags: data.featureFlags ?? p.featureFlags } : p,
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
