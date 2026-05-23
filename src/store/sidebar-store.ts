"use client";

import { create } from "zustand";

export type SidebarMode = "expanded" | "icon" | "sliding";

interface SidebarState {
  mode: SidebarMode;
  mobileOpen: boolean;
  slidingOpen: boolean;
  toggle: () => void;
  setMode: (v: SidebarMode) => void;
  setMobileOpen: (v: boolean) => void;
  setSlidingOpen: (v: boolean) => void;
}

const MODE_CYCLE: Record<SidebarMode, SidebarMode> = {
  expanded: "icon",
  icon: "sliding",
  sliding: "expanded",
};

function loadMode(): SidebarMode {
  if (typeof window === "undefined") return "expanded";
  const stored = localStorage.getItem("sidebar-mode");
  if (stored === "expanded" || stored === "icon" || stored === "sliding") return stored;
  return "expanded";
}

function saveMode(mode: SidebarMode) {
  if (typeof window !== "undefined") {
    localStorage.setItem("sidebar-mode", mode);
  }
}

export const useSidebarStore = create<SidebarState>((set) => ({
  mode: loadMode(),
  mobileOpen: false,
  slidingOpen: false,
  toggle: () =>
    set((s) => {
      const next = MODE_CYCLE[s.mode];
      saveMode(next);
      return { mode: next };
    }),
  setMode: (mode) => {
    saveMode(mode);
    set({ mode });
  },
  setMobileOpen: (v) => set({ mobileOpen: v }),
  setSlidingOpen: (v) => set({ slidingOpen: v }),
}));
