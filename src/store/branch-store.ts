"use client";

import { create } from "zustand";
import { supabase, isSupabaseConnected } from "@/lib/supabase/client";
import { isDemoMode } from "@/config/env";
import { useAuthStore } from "@/store/auth-store";
import type { Branch } from "@/lib/branch/branch-types";
import type { BranchRow } from "@/lib/supabase/database";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "activeBranchId";

/**
 * Maps a raw BranchRow from the database to the Branch application type.
 */
function mapBranchRowToBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    code: row.code,
    address: row.address,
    phone: row.phone,
    email: row.email,
    isMain: row.is_main,
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
  clearActiveBranch: () => void;
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
        .from("branches")
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

      const branches = (data ?? []).map(mapBranchRowToBranch);
      console.log("[P0.2 LOAD BRANCHES]", {
        tenantId,
        branchesLoaded: branches.length,
        branchIds: branches.map(b => ({ id: b.id, name: b.name, isMain: b.isMain })),
      });
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
    // Enforce assigned branch for restricted roles (non-owner, non-admin)
    const user = useAuthStore.getState().user;
    if (user) {
      const isOwnerOrAdmin = user.role === "tenant_owner" || user.role === "admin";
      if (!isOwnerOrAdmin && user.assignedBranchId && branch.id !== user.assignedBranchId) {
        console.warn("[branch-store] Restricted role cannot switch branch. Assigned:", user.assignedBranchId);
        return;
      }
    }

    // Persist to localStorage
    if (typeof window !== "undefined") {
      try {
        console.log("[P0.2 LOCALSTORAGE WRITE]", { key: STORAGE_KEY, branchId: branch.id, branchName: branch.name });
        localStorage.setItem(STORAGE_KEY, branch.id);
      } catch {
        // Silently ignore storage errors
      }
    }
    set({ activeBranch: branch, error: null });
  },

  clearActiveBranch: () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Silently ignore storage errors
      }
    }
    set({ activeBranch: null });
  },

  restoreActiveBranch: () => {
    if (typeof window === "undefined") return;

    const { branches, activeBranch } = get();
    const storedId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    console.log("[P0.2 RESTORE ACTIVE BRANCH]", {
      activeBranchState: activeBranch ? { id: activeBranch.id, name: activeBranch.name, tenantId: activeBranch.tenantId } : null,
      localStorageBranchId: storedId,
      branches: branches.map(b => ({ id: b.id, name: b.name, tenantId: b.tenantId, isActive: b.isActive })),
    });

    // Already set — nothing to do
    if (activeBranch) return;

    try {
      if (storedId) {
        const match = branches.find((b) => b.id === storedId && b.isActive);
        if (match) {
          console.log("[P0.2 RESTORE ACTIVE BRANCH] ✅ restored from localStorage:", match.id);
          set({ activeBranch: match });
          return;
        }
        console.log("[P0.2 RESTORE ACTIVE BRANCH] ⚠️ storedId not found in branches:", storedId);
      }
    } catch {
      // Corrupt storage — ignore
    }

    // Fallback: auto-select first active branch
    const firstActive = branches.find((b) => b.isActive);
    if (firstActive) {
      console.log("[P0.2 RESTORE ACTIVE BRANCH] ✅ fallback to first active:", firstActive.id, firstActive.name);
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
