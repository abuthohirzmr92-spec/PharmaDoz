import { create } from "zustand";
import type { NetworkStatus } from "@/types";

/* ------------------------------------------------------------------ */
/*  Network State                                                       */
/* ------------------------------------------------------------------ */

interface NetworkState {
  status: NetworkStatus;
  lastOnlineAt: string | null; // ISO timestamp
  lastOfflineAt: string | null;
  pendingSyncCount: number;
  isSyncing: boolean;

  setStatus: (status: NetworkStatus) => void;
  setPendingSyncCount: (count: number) => void;
  setIsSyncing: (v: boolean) => void;
  reset: () => void;
}

function getInitialStatus(): NetworkStatus {
  if (typeof window === "undefined") return "online";
  return navigator.onLine ? "online" : "offline";
}

const INITIAL_STATE = {
  status: getInitialStatus() as NetworkStatus,
  lastOnlineAt: null as string | null,
  lastOfflineAt: null as string | null,
  pendingSyncCount: 0,
  isSyncing: false,
};

export const useNetworkStore = create<NetworkState>()((set) => ({
  ...INITIAL_STATE,

  setStatus: (status) =>
    set((s) => {
      const now = new Date().toISOString();
      return {
        status,
        lastOnlineAt: status === "online" ? now : s.lastOnlineAt,
        lastOfflineAt: status === "offline" ? now : s.lastOfflineAt,
      };
    }),

  setPendingSyncCount: (count) => set({ pendingSyncCount: count }),

  setIsSyncing: (v) => set({ isSyncing: v }),

  reset: () => set({ ...INITIAL_STATE }),
}));
