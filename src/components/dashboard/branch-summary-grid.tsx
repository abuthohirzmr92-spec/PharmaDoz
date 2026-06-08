"use client";

import { useMemo } from "react";
import { useBranchStore } from "@/store/branch-store";
import { useAuthStore } from "@/store/auth-store";
import { BranchSummaryCard } from "./branch-summary-card";
import { Store } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  BranchSummaryGrid — Responsive grid of branch cards                */
/* ------------------------------------------------------------------ */
/*  Desktop: 3 cols | Tablet: 2 cols | Mobile: 1 col                  */
/*  Role-aware: owner/admin sees all branches, staff sees own branch   */
/* ------------------------------------------------------------------ */

interface Props {
  onSelectBranch: (branchId: string) => void;
}

export function BranchSummaryGrid({ onSelectBranch }: Props) {
  const branches = useBranchStore((s) => s.branches);
  const user = useAuthStore((s) => s.user);
  const isLoading = useBranchStore((s) => s.isLoading);

  /* ---- Role-based branch visibility ---- */
  const visibleBranches = useMemo(() => {
    const isOwnerOrAdmin =
      user?.role === "tenant_owner" || user?.role === "admin";

    if (isOwnerOrAdmin) return branches;

    // Staff/cashier: see only their own branch
    // In demo mode, user may not have branchId — fall back to first branch
    const userBranchId = (user as any)?.branchId ?? (user as any)?.pharmacyId;
    if (userBranchId) {
      return branches.filter((b) => b.id === userBranchId);
    }

    // Fallback: return first active branch
    return branches.filter((b) => b.isActive).slice(0, 1);
  }, [branches, user]);

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 animate-pulse"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800" />
              <div className="h-4 w-24 rounded bg-neutral-100 dark:bg-neutral-800" />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j}>
                  <div className="h-3 w-12 rounded bg-neutral-100 dark:bg-neutral-800 mb-1" />
                  <div className="h-4 w-16 rounded bg-neutral-100 dark:bg-neutral-800" />
                </div>
              ))}
            </div>
            <div className="h-8 w-full rounded-lg bg-neutral-100 dark:bg-neutral-800" />
          </div>
        ))}
      </div>
    );
  }

  /* ---- Empty ---- */
  if (visibleBranches.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <Store className="mx-auto mb-2 h-6 w-6 text-neutral-300" />
        <p className="text-sm text-neutral-400">Belum ada cabang terdaftar</p>
      </div>
    );
  }

  /* ---- Grid ---- */
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleBranches.map((branch) => (
        <BranchSummaryCard
          key={branch.id}
          branch={branch}
          onDetail={onSelectBranch}
        />
      ))}
    </div>
  );
}
