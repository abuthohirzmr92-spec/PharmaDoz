"use client";

import { create } from "zustand";

interface SidebarState {
  expanded: boolean;
  mobileOpen: boolean;
  toggle: () => void;
  setExpanded: (v: boolean) => void;
  setMobileOpen: (v: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  expanded: true,
  mobileOpen: false,
  toggle: () => set((s) => ({ expanded: !s.expanded })),
  setExpanded: (v) => set({ expanded: v }),
  setMobileOpen: (v) => set({ mobileOpen: v }),
}));
