"use client";

import { create } from "zustand";
import type { RecoveryAction, RecoveryState } from "@/types";
import {
  createRecoveryAction,
  attemptRecovery,
  completeRecovery,
  failRecovery,
  canRetryRecovery,
  getRecoveryState,
  generateDemoRecoveryActions,
} from "@/lib/recovery/recovery-manager";
import { isDemoMode as checkDemoMode } from "@/config/env";

/* ------------------------------------------------------------------ */
/*  Store interface                                                    */
/* ------------------------------------------------------------------ */

interface RecoveryState2 {
  actions: RecoveryAction[];
  isLoading: boolean;

  /** Queue a new recovery action */
  queueAction(type: string, maxAttempts?: number): string;
  /** Attempt recovery on a pending action */
  retryAction(id: string): void;
  /** Mark recovery as completed */
  finishAction(id: string, result?: Record<string, unknown>): void;
  /** Mark recovery as failed */
  failAction(id: string, error: string): void;
  /** Get current recovery state */
  getState(): RecoveryState;
  /** Get pending actions that can be retried */
  getPendingRetryable(): RecoveryAction[];
  /** Get failed actions */
  getFailed(): RecoveryAction[];
  /** Seed demo data */
  seedDemo(): void;
  /** Clear all */
  clear(): void;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useRecoveryStore = create<RecoveryState2>((set, get) => ({
  actions: checkDemoMode() ? generateDemoRecoveryActions() : [],
  isLoading: false,

  queueAction(type, maxAttempts) {
    const action = createRecoveryAction({ type, maxAttempts });
    set((s) => ({ actions: [...s.actions, action] }));
    return action.id;
  },

  retryAction(id) {
    set((s) => ({
      actions: s.actions.map((a) =>
        a.id === id && canRetryRecovery(a) ? attemptRecovery(a) : a,
      ),
    }));
  },

  finishAction(id, result) {
    set((s) => ({
      actions: s.actions.map((a) =>
        a.id === id ? completeRecovery(a, result) : a,
      ),
    }));
  },

  failAction(id, error) {
    set((s) => ({
      actions: s.actions.map((a) =>
        a.id === id ? failRecovery(a, error) : a,
      ),
    }));
  },

  getState() {
    return getRecoveryState(get().actions);
  },

  getPendingRetryable() {
    return get().actions.filter((a) => canRetryRecovery(a));
  },

  getFailed() {
    return get().actions.filter((a) => a.status === "failed");
  },

  seedDemo() {
    set({ actions: generateDemoRecoveryActions(), isLoading: false });
  },

  clear() {
    set({ actions: [], isLoading: false });
  },
}));
