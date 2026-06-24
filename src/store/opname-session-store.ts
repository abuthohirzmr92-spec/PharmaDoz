// ---------------------------------------------------------------------------
// RC1 P0 — Stock Opname Session Store (Zustand)
// ---------------------------------------------------------------------------
// In-memory only. No persistence. No localStorage. No database.
// Future-ready for location-based counting and resume.
// ---------------------------------------------------------------------------

"use client";

import { create } from "zustand";
import type { StockOpnameSession, StockOpnameSessionItem, SessionStatus, SessionProgress } from "@/types/opname-session";
import { createSession, calculateProgress } from "@/types/opname-session";

interface OpnameSessionState {
  /** Currently active session (null = no session) */
  activeSession: StockOpnameSession | null;
  /** Items in the active session */
  items: StockOpnameSessionItem[];

  /* Actions */
  startSession: (title: string, conductedBy: string, selectedLocationIds?: string[]) => string;
  pauseSession: () => void;
  resumeSession: () => void;
  completeSession: () => void;
  clearSession: () => void;
  setItems: (items: StockOpnameSessionItem[]) => void;
  updateItem: (key: string, updates: Partial<StockOpnameSessionItem>) => void;
  getProgress: () => SessionProgress;
  isActive: () => boolean;
  setSelectedLocations: (ids: string[]) => void;
  getSelectedLocations: () => string[];
  clearSelectedLocations: () => void;
}

export const useOpnameSessionStore = create<OpnameSessionState>()((set, get) => ({
  activeSession: null,
  items: [],

  startSession: (title, conductedBy, selectedLocationIds = []) => {
    const id = `SES-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const session = createSession(id, title, conductedBy, selectedLocationIds);
    set({ activeSession: session, items: [] });
    return id;
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
