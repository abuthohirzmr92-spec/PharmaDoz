"use client";

import { create } from "zustand";
import { useSuperAdminStore } from "@/store/super-admin-store";
import { useAiStore } from "@/store/ai-store";
import { useBillingStore } from "@/store/billing-store";
import { useMaintenanceStore } from "@/store/maintenance-store";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PlatformStoreState {
  /** ISO timestamp of the last successful refresh */
  lastRefreshed: string | null;
  /** Whether a refresh is in progress */
  isRefreshing: boolean;

  /** Refresh all platform data from every store */
  refreshAll: () => Promise<void>;
  /** Reset the coordination state (does NOT clear other stores) */
  clear: () => void;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const usePlatformStore = create<PlatformStoreState>((set) => ({
  lastRefreshed: null,
  isRefreshing: false,

  refreshAll: async () => {
    set({ isRefreshing: true, lastRefreshed: null });

    try {
      await Promise.all([
        useSuperAdminStore.getState().loadAll(),
        useBillingStore.getState().loadSubscriptions(),
        useMaintenanceStore.getState().disable(),
      ]);
      // AIS store reads other stores synchronously, run after loads complete
      useAiStore.getState().loadDiagnostics();

      set({ isRefreshing: false, lastRefreshed: new Date().toISOString() });
    } catch {
      // Individual stores manage their own error state
      set({ isRefreshing: false });
    }
  },

  clear: () => {
    set({ lastRefreshed: null, isRefreshing: false });
  },
}));
