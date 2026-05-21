"use client";

import { createContext, useContext, useEffect, useCallback, type ReactNode } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useBranchStore } from "@/store/branch-store";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import type { Branch, BranchContextValue } from "@/lib/branch/branch-types";

/* ------------------------------------------------------------------ */
/*  Context                                                             */
/* ------------------------------------------------------------------ */

const BranchCtx = createContext<BranchContextValue>({
  branches: [],
  activeBranch: null,
  setActiveBranch: () => {},
  isLoading: false,
  error: null,
});

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

export function useBranchContext(): BranchContextValue {
  return useContext(BranchCtx);
}

/* ------------------------------------------------------------------ */
/*  Provider                                                            */
/* ------------------------------------------------------------------ */

export function BranchProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const branches = useBranchStore((s) => s.branches);
  const activeBranch = useBranchStore((s) => s.activeBranch);
  const isLoading = useBranchStore((s) => s.isLoading);
  const error = useBranchStore((s) => s.error);
  const loadBranches = useBranchStore((s) => s.loadBranches);
  const setActiveBranchAction = useBranchStore((s) => s.setActiveBranch);
  const restoreActiveBranch = useBranchStore((s) => s.restoreActiveBranch);

  const setActiveBranch = useCallback(
    (branch: Branch) => {
      setActiveBranchAction(branch);
    },
    [setActiveBranchAction],
  );

  useEffect(() => {
    // Skip entirely for super_admin — no branch context needed
    if (!isAuthenticated || !user || isSuperAdmin(user.role)) {
      return;
    }

    const tenantId = user.tenantId ?? user.pharmacyId;
    if (!tenantId) return;

    // Non-null assertion is safe: we already returned on falsy above
    const resolvedTenantId: string = tenantId;

    let cancelled = false;

    async function init() {
      await loadBranches(resolvedTenantId);

      if (cancelled) return;

      const { branches: currentBranches } = useBranchStore.getState();

      // Only restore / auto-select if no active branch is already set
      if (!useBranchStore.getState().activeBranch) {
        if (currentBranches.length === 1) {
          // Auto-select the only branch
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know length === 1
          useBranchStore.getState().setActiveBranch(currentBranches[0]!);
        } else if (currentBranches.length > 1) {
          // Try restoring from localStorage, falls back to first active
          useBranchStore.getState().restoreActiveBranch();
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, loadBranches]);

  return (
    <BranchCtx.Provider
      value={{ branches, activeBranch, setActiveBranch, isLoading, error }}
    >
      {children}
    </BranchCtx.Provider>
  );
}
