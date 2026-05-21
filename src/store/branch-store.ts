"use client";

import { create } from "zustand";
import { supabase, isSupabaseConnected } from "@/lib/supabase/client";
import { isDemoMode } from "@/config/env";
import type { Branch } from "@/lib/branch/branch-types";
import type { PharmacyRow } from "@/lib/supabase/database";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "activeBranchId";

/**
 * Maps a raw PharmacyRow from the database to the Branch application type.
 */
function mapPharmacyRowToBranch(row: PharmacyRow): Branch {
  return {
    id: row.id,
    tenantId: row.tenant_id ?? "",
    name: row.name,
    code: row.code,
    address: row.address,
    phone: row.phone,
    email: row.email,
    isActive: row.is_active,
    openingTime: row.opening_time,
    closingTime: row.closing_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ------------------------------------------------------------------ */
/*  Branch State                                                       */
/* ------------------------------------------------------------------ */

interface BranchState {
  branches: Branch[];
  activeBranch: Branch | null;
  isLoading: boolean;
  error: string | null;

  loadBranches: (tenantId: string) => Promise<void>;
  setActiveBranch: (branch: Branch) => void;
  restoreActiveBranch: () => void;
  clear: () => void;
}

export const useBranchStore = create<BranchState>()((set, get) => ({
  branches: [],
  activeBranch: null,
  isLoading: false,
  error: null,

  loadBranches: async (tenantId) => {
    if (!tenantId) {
      set({ error: "Tenant ID diperlukan untuk memuat cabang.", isLoading: false });
      return;
    }

    // Demo mode: skip Supabase query
    if (isDemoMode()) {
      set({ branches: [], isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      if (!isSupabaseConnected()) {
        set({
          branches: [],
          isLoading: false,
          error: "Layanan database tidak tersedia.",
        });
        return;
      }

      const { data, error } = await supabase!
        .from("pharmacies")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("name");

      if (error) {
        set({
          branches: [],
          isLoading: false,
          error: `Gagal memuat cabang: ${error.message}`,
        });
        return;
      }

      const branches = (data ?? []).map(mapPharmacyRowToBranch);
      set({ branches, isLoading: false });
    } catch (e) {
      set({
        branches: [],
        isLoading: false,
        error: "Gagal memuat cabang. Periksa koneksi internet Anda.",
      });
    }
  },

  setActiveBranch: (branch) => {
    // Persist to localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, branch.id);
      } catch {
        // Silently ignore storage errors
      }
    }
    set({ activeBranch: branch, error: null });
  },

  restoreActiveBranch: () => {
    if (typeof window === "undefined") return;

    const { branches, activeBranch } = get();

    // Already set — nothing to do
    if (activeBranch) return;

    try {
      const storedId = localStorage.getItem(STORAGE_KEY);
      if (storedId) {
        const match = branches.find((b) => b.id === storedId && b.isActive);
        if (match) {
          set({ activeBranch: match });
          return;
        }
      }
    } catch {
      // Corrupt storage — ignore
    }

    // Fallback: auto-select first active branch
    const firstActive = branches.find((b) => b.isActive);
    if (firstActive) {
      set({ activeBranch: firstActive });
    }
  },

  clear: () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Silently ignore storage errors
      }
    }
    set({
      branches: [],
      activeBranch: null,
      isLoading: false,
      error: null,
    });
  },
}));
