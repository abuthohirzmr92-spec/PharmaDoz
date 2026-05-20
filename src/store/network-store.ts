"use client";

import { create } from "zustand";
import type { NetworkStatus } from "@/types";
import { syncEngine } from "@/lib/offline/sync-engine";
import { localPersistence } from "@/lib/local-persistence";

/* ------------------------------------------------------------------ */
/*  Network State                                                       */
/* ------------------------------------------------------------------ */

interface NetworkState {
  status: NetworkStatus;
  lastOnlineAt: string | null; // ISO timestamp
  lastOfflineAt: string | null;
  pendingSyncCount: number;
  isSyncing: boolean;
  queueBacklog: number; // number of pending operations in queue
  lastSyncAttempt: string | null; // ISO timestamp of last sync attempt
  lastSyncSuccess: string | null; // ISO timestamp of last successful sync

  setStatus: (status: NetworkStatus) => void;
  setPendingSyncCount: (count: number) => void;
  setIsSyncing: (v: boolean) => void;
  setQueueBacklog: (count: number) => void;
  recordSyncAttempt: () => void;
  recordSyncSuccess: () => void;
  getQueueHealth: () => {
    status: "clear" | "backlog" | "stalled";
    depth: number;
    oldestEntry: string | null;
  };
  getSyncSummary: () => {
    lastAttempt: string | null;
    lastSuccess: string | null;
    pendingCount: number;
    isHealthy: boolean;
  };
  startSync: () => Promise<void>;
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
  queueBacklog: 0,
  lastSyncAttempt: null as string | null,
  lastSyncSuccess: null as string | null,
};

export const useNetworkStore = create<NetworkState>()((set, get) => ({
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

  setQueueBacklog: (count) => set({ queueBacklog: count }),

  recordSyncAttempt: () => set({ lastSyncAttempt: new Date().toISOString() }),

  recordSyncSuccess: () =>
    set({
      lastSyncSuccess: new Date().toISOString(),
      queueBacklog: 0,
    }),

  getQueueHealth: () => {
    const state = get();
    if (state.queueBacklog === 0) {
      return { status: "clear", depth: 0, oldestEntry: null };
    }
    // Stalled if no sync success within the last hour while backlog exists
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const hasRecentSuccess =
      state.lastSyncSuccess !== null &&
      new Date(state.lastSyncSuccess).getTime() > oneHourAgo;
    if (!hasRecentSuccess) {
      return {
        status: "stalled",
        depth: state.queueBacklog,
        oldestEntry: state.lastSyncAttempt,
      };
    }
    return {
      status: "backlog",
      depth: state.queueBacklog,
      oldestEntry: state.lastSyncAttempt,
    };
  },

  getSyncSummary: () => {
    const state = get();
    return {
      lastAttempt: state.lastSyncAttempt,
      lastSuccess: state.lastSyncSuccess,
      pendingCount: state.queueBacklog,
      isHealthy:
        state.queueBacklog === 0 && state.status === "online" && !state.isSyncing,
    };
  },

  startSync: async () => {
    const { isSyncing } = get();
    if (isSyncing) return;

    set({ isSyncing: true });
    try {
      const pendingCount = await localPersistence.getPendingCount();
      set({ pendingSyncCount: pendingCount, queueBacklog: pendingCount });

      if (pendingCount > 0) {
        set({ status: "syncing" });
        get().recordSyncAttempt();

        const result = await syncEngine.startSync();

        if (result.succeeded > 0) {
          get().recordSyncSuccess();
        }
        set({
          pendingSyncCount: result.failed,
          queueBacklog: result.failed,
          status: result.failed === 0 ? "online" : "degraded",
        });
      }
    } catch {
      set({ status: "degraded" });
    } finally {
      set({ isSyncing: false });
    }
  },

  reset: () => set({ ...INITIAL_STATE }),
}));
