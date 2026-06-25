// ---------------------------------------------------------------------------
// RC1 P0 — Stock Opname Session Store (Zustand)
// ---------------------------------------------------------------------------
// In-memory only. No persistence. No localStorage. No database.
// Future-ready for location-based counting and resume.
// ---------------------------------------------------------------------------

"use client";

import { create } from "zustand";
import type { StockOpnameSession, StockOpnameSessionItem, SessionStatus, SessionProgress } from "@/types/opname-session";
import { createSession } from "@/types/opname-session";
import { calculateProgress, getCompletionDetail } from "@/lib/opname/session-progress";
import { buildBatchSessionSnapshot, type BatchInput } from "@/lib/opname/session-snapshot";

interface OpnameSessionState {
  /** Currently active session (null = no session) */
  activeSession: StockOpnameSession | null;
  /** Items in the active session */
  items: StockOpnameSessionItem[];

  /* Actions */
  startSession: (title: string, conductedBy: string, selectedLocationIds?: string[], batches?: BatchInput[]) => string;
  pauseSession: () => void;
  resumeSession: () => void;
  completeSession: () => void;
  postSession: () => void;
  archiveSession: () => void;
  clearSession: () => void;
  setItems: (items: StockOpnameSessionItem[]) => void;
  updateItem: (key: string, updates: Partial<StockOpnameSessionItem>) => void;
  getProgress: () => SessionProgress;
  isActive: () => boolean;
  setSelectedLocations: (ids: string[]) => void;
  getSelectedLocations: () => string[];
  clearSelectedLocations: () => void;
  /** RC1 P0F.1 — Mark a single batch item as counted */
  markItemCounted: (key: string, physicalQty?: number) => void;
  /** RC1 P0F.1 — Batch mark items from opname */
  markItemsFromOpname: (items: Array<{ productId: string; batchId: string; physicalQty: number }>) => void;
}

export const useOpnameSessionStore = create<OpnameSessionState>()((set, get) => ({
  activeSession: null,
  items: [],

  startSession: (title, conductedBy, selectedLocationIds = [], batches?: BatchInput[]) => {
    const { activeSession } = get();
    // RC1 P0E.3 — Block if session already active
    if (activeSession && activeSession.status !== "completed") {
      console.warn("[SessionStore] Cannot start new session — existing session is", activeSession.status);
      return "";
    }
    const trimmed = title.trim();
    if (!trimmed) {
      console.warn("[SessionStore] Cannot start session — title is empty");
      return "";
    }

    // RC1 P0F.1 — Build batch-based snapshot at session start
    const snapshotItems = batches
      ? buildBatchSessionSnapshot(batches, selectedLocationIds)
      : [];
    const progress = calculateProgress(snapshotItems);

    const id = `SES-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const session = createSession(id, trimmed, conductedBy, selectedLocationIds);
    session.totalItems = progress.totalItems;
    session.completedItems = progress.completedItems;
    session.progressPercent = progress.progressPercent;
    session.status = snapshotItems.length > 0 ? "in_progress" : session.status;

    // Map lightweight snapshot → full session items with defaults
    const sessionItems: StockOpnameSessionItem[] = snapshotItems.map((si) => ({
      key: si.key,
      productId: si.productId,
      batchId: si.batchId,
      productName: "",
      batchNumber: "",
      systemQty: 0,
      physicalQty: 0,
      status: si.status,
      note: "",
    }));

    set({ activeSession: session, items: sessionItems });
    return id;
  },

  /**
   * RC1 P0F.1 — Mark a batch item as counted (idempotent).
   * Safe to call multiple times — second call for same key is no-op.
   */
  markItemCounted: (key: string, physicalQty?: number) => {
    const { activeSession, items } = get();
    if (!activeSession) return;

    const updatedItems = items.map((i) =>
      i.key === key ? { ...i, status: "counted" as const, physicalQty: physicalQty ?? i.physicalQty } : i,
    );

    const progress = calculateProgress(updatedItems);
    const isDone = progress.totalItems > 0 && progress.completedItems >= progress.totalItems;
    const now = new Date().toISOString();
    set({
      items: updatedItems,
      activeSession: {
        ...activeSession,
        status: isDone ? "completed" : activeSession.status,
        completedItems: progress.completedItems,
        progressPercent: progress.progressPercent,
        updatedAt: now,
        activeProductKey: isDone ? null : key,
        ...(isDone ? { completedAt: now } : {}),
      },
    });
    // Events emitted by SessionLifecycleService (P0H.3A)
  },

  /**
   * RC1 P0F.1 — Batch mark multiple items (after opname complete).
   */
  markItemsFromOpname: (opnameItems: Array<{ productId: string; batchId: string; physicalQty: number }>) => {
    const { items, activeSession } = get();
    if (!activeSession || !items || items.length === 0) return;

    const keysToMark = new Set(opnameItems.map(i => `${i.productId}:${i.batchId}`));
    const updatedItems = items.map((i) =>
      keysToMark.has(i.key) ? { ...i, status: "counted" as const, physicalQty: opnameItems.find(o => `${o.productId}:${o.batchId}` === i.key)?.physicalQty ?? i.physicalQty } : i,
    );

    const progress = calculateProgress(updatedItems);

    // RC1 P0F.3 — Auto-completion: transition to completed when all items done
    const isDone = progress.totalItems > 0 && progress.completedItems >= progress.totalItems;
    const now = new Date().toISOString();
    set({
      items: updatedItems,
      activeSession: {
        ...activeSession,
        status: isDone ? "completed" : activeSession.status,
        completedItems: progress.completedItems,
        progressPercent: progress.progressPercent,
        updatedAt: now,
        ...(isDone ? { completedAt: now } : {}),
      },
    });
    if (opnameItems.length > 0) {
      // Events emitted by SessionLifecycleService (P0H.3A)
    }
    if (isDone) { /* auto-completion — events emitted by SessionLifecycleService (P0H.3A) */ }
  },

  setSelectedLocations: (ids) => {
    const { activeSession } = get();
    if (!activeSession) return;
    set({ activeSession: { ...activeSession, selectedLocationIds: ids } });
  },

  getSelectedLocations: () => get().activeSession?.selectedLocationIds ?? [],

  clearSelectedLocations: () => {
    const { activeSession } = get();
    if (!activeSession) return;
    set({ activeSession: { ...activeSession, selectedLocationIds: [] } });
  },

  pauseSession: () => {
    const { activeSession } = get();
    if (!activeSession) return;
    set({
      activeSession: {
        ...activeSession,
        status: "paused",
        updatedAt: new Date().toISOString(),
      },
    });
  },

  resumeSession: () => {
    const { activeSession } = get();
    if (!activeSession || activeSession.status !== "paused") return;
    set({
      activeSession: {
        ...activeSession,
        status: "in_progress",
        updatedAt: new Date().toISOString(),
      },
    });
  },

  completeSession: () => {
    const { activeSession, items } = get();
    if (!activeSession) return;
    const progress = calculateProgress(items);
    const now = new Date().toISOString();
    set({
      activeSession: {
        ...activeSession,
        status: "completed",
        completedAt: now,
        updatedAt: now,
        totalItems: progress.totalItems,
        completedItems: progress.completedItems,
        progressPercent: progress.progressPercent,
      },
    });
    // Events emitted by SessionLifecycleService (P0H.3A)
  },

  postSession: () => {
    const { activeSession } = get();
    if (!activeSession || activeSession.status !== "completed") return;
    const now = new Date().toISOString();
    set({
      activeSession: {
        ...activeSession,
        status: "posted",
        postedAt: now,
        updatedAt: now,
      },
    });
    // Events emitted by SessionLifecycleService (P0H.3A)
  },

  archiveSession: () => {
    const { activeSession } = get();
    if (!activeSession || (activeSession.status !== "completed" && activeSession.status !== "posted")) return;
    const now = new Date().toISOString();
    set({
      activeSession: {
        ...activeSession,
        status: "archived",
        archivedAt: now,
        updatedAt: now,
      },
    });
    // Events emitted by SessionLifecycleService (P0H.3A)
  },

  clearSession: () => set({ activeSession: null, items: [] }),

  setItems: (items) => {
    const { activeSession } = get();
    if (!activeSession) return;
    const progress = calculateProgress(items);
    set({
      items,
      activeSession: {
        ...activeSession,
        totalItems: progress.totalItems,
        completedItems: progress.completedItems,
        progressPercent: progress.progressPercent,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  updateItem: (key, updates) => {
    const { activeSession } = get();
    if (!activeSession) return;
    const items = get().items.map((i) =>
      i.key === key ? { ...i, ...updates } : i,
    );
    const progress = calculateProgress(items);
    set({
      items,
      activeSession: {
        ...activeSession,
        totalItems: progress.totalItems,
        completedItems: progress.completedItems,
        progressPercent: progress.progressPercent,
        updatedAt: new Date().toISOString(),
        activeProductKey: updates.status === "counted" ? key : activeSession.activeProductKey,
      },
    });
  },

  getProgress: () => {
    const { items } = get();
    return calculateProgress(items);
  },

  isActive: () => {
    const { activeSession } = get();
    return activeSession !== null && activeSession.status !== "completed";
  },
}));
