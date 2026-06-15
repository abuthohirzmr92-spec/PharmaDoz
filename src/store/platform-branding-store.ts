"use client";

import { create } from "zustand";
import type { PlatformSettings } from "@/lib/repositories/platform-settings";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { isDemoMode as checkDemoMode } from "@/config/env";

/* ------------------------------------------------------------------ */
/*  Defaults                                                            */
/* ------------------------------------------------------------------ */

const DEFAULTS = {
  appName: "Medisync",
  tagline: "Modern Pharmacy Management System",
} as const;

/* ------------------------------------------------------------------ */
/*  State                                                               */
/* ------------------------------------------------------------------ */

interface PlatformBrandingState {
  settings: PlatformSettings | null;
  isLoading: boolean;
  loaded: boolean;

  loadSettings: () => Promise<void>;
  getAppName: () => string;
  getTagline: () => string;
  getLogoUrl: () => string | null;
  getSidebarLogoUrl: () => string | null;
  getFaviconUrl: () => string | null;
}

async function fetchSettings(): Promise<PlatformSettings | null> {
  if (!isSupabaseConnected()) return null;

  try {
    const { supabase } = await import("@/lib/supabase/client");
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("platform_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === "42P01") return null; // table not yet created
      console.warn("[PlatformBranding] Failed to load settings:", error.message);
      return null;
    }

    if (!data) return null;

    // Manual camelCase mapping (avoid repo dependency in store)
    const row = data as Record<string, unknown>;
    return {
      id: row.id as string,
      appName: (row.app_name as string) ?? null,
      tagline: (row.tagline as string) ?? null,
      logoUrl: (row.logo_url as string) ?? null,
      sidebarLogoUrl: (row.sidebar_logo_url as string) ?? null,
      faviconUrl: (row.favicon_url as string) ?? null,
      extras: (row.extras as Record<string, unknown>) ?? {},
      updatedBy: (row.updated_by as string) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  } catch {
    return null;
  }
}

export const usePlatformBrandingStore = create<PlatformBrandingState>((set, get) => ({
  settings: null,
  isLoading: false,
  loaded: false,

  loadSettings: async () => {
    if (get().loaded || checkDemoMode()) {
      if (!get().loaded) set({ loaded: true });
      return;
    }

    set({ isLoading: true });
    const settings = await fetchSettings();
    set({ settings, isLoading: false, loaded: true });
  },

  getAppName: () => get().settings?.appName || DEFAULTS.appName,
  getTagline: () => get().settings?.tagline || DEFAULTS.tagline,
  getLogoUrl: () => get().settings?.logoUrl ?? null,
  getSidebarLogoUrl: () => get().settings?.sidebarLogoUrl ?? null,
  getFaviconUrl: () => get().settings?.faviconUrl ?? null,
}));
