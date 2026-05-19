import { create } from "zustand";
import type { MaintenanceConfig, MaintenanceMode, MaintenanceScope } from "@/types";

/* ------------------------------------------------------------------ */
/*  Maintenance State                                                   */
/* ------------------------------------------------------------------ */

interface MaintenanceState {
  config: MaintenanceConfig;
  isActive: boolean;   // derived: mode !== "none"
  isReadonly: boolean; // derived: mode === "readonly"

  // Actions
  enableReadonly: (message?: string, scope?: MaintenanceScope, tenantIds?: string[]) => void;
  enableFull: (message?: string, scope?: MaintenanceScope, tenantIds?: string[]) => void;
  schedule: (startAt: string, endAt: string, message?: string) => void;
  disable: () => void;
  setConfig: (config: Partial<MaintenanceConfig>) => void;
  reset: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function deriveFlags(mode: MaintenanceMode) {
  return {
    isActive: mode !== "none",
    isReadonly: mode === "readonly",
  };
}

function generateTimestamp() {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/*  Initial state                                                      */
/* ------------------------------------------------------------------ */

const INITIAL_CONFIG: MaintenanceConfig = {
  mode: "none",
  scope: "global",
  message: "",
  startedAt: null,
  scheduledEndAt: null,
  tenantIds: [],
};

const INITIAL_STATE = {
  config: INITIAL_CONFIG,
  ...deriveFlags(INITIAL_CONFIG.mode),
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useMaintenanceStore = create<MaintenanceState>()((set) => ({
  ...INITIAL_STATE,

  enableReadonly: (message?: string, scope?: MaintenanceScope, tenantIds?: string[]) =>
    set(() => {
      const config: MaintenanceConfig = {
        mode: "readonly",
        scope: scope ?? "global",
        message: message ?? "",
        startedAt: generateTimestamp(),
        scheduledEndAt: null,
        tenantIds: tenantIds ?? [],
      };
      return { config, ...deriveFlags(config.mode) };
    }),

  enableFull: (message?: string, scope?: MaintenanceScope, tenantIds?: string[]) =>
    set(() => {
      const config: MaintenanceConfig = {
        mode: "full",
        scope: scope ?? "global",
        message: message ?? "",
        startedAt: generateTimestamp(),
        scheduledEndAt: null,
        tenantIds: tenantIds ?? [],
      };
      return { config, ...deriveFlags(config.mode) };
    }),

  schedule: (startAt: string, endAt: string, message?: string) =>
    set(() => {
      const config: MaintenanceConfig = {
        mode: "scheduled",
        scope: "global",
        message: message ?? "",
        startedAt: startAt,
        scheduledEndAt: endAt,
        tenantIds: [],
      };
      return { config, ...deriveFlags(config.mode) };
    }),

  disable: () =>
    set(() => {
      const config: MaintenanceConfig = { ...INITIAL_CONFIG };
      return { config, ...deriveFlags(config.mode) };
    }),

  setConfig: (partial) =>
    set((s) => {
      const config: MaintenanceConfig = { ...s.config, ...partial };
      return { config, ...deriveFlags(config.mode) };
    }),

  reset: () => set({ ...INITIAL_STATE }),
}));
