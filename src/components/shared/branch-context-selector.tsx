"use client";

import { useEffect, useMemo, useCallback } from "react";
import { Store, ChevronDown } from "lucide-react";
import { useBranchStore } from "@/store/branch-store";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  BranchContextSelector — Reusable branch dropdown                    */
/* ------------------------------------------------------------------ */
/*  Single source of truth: branch-store.activeBranch                  */
/*  Changes here propagate globally via setActiveBranch()              */
/*  "all" value means no specific branch selected (show all data)     */
/* ------------------------------------------------------------------ */

interface Props {
  value?: string;       // optional — defaults to branch-store.activeBranch
  onChange?: (branchId: string) => void;  // optional — fires on change
  showAll?: boolean;
  className?: string;
}

export function BranchContextSelector({ value, onChange, showAll = true, className }: Props) {
  const branches = useBranchStore((s) => s.branches);
  const activeBranch = useBranchStore((s) => s.activeBranch);
  const setActiveBranch = useBranchStore((s) => s.setActiveBranch);
  const clearActiveBranch = useBranchStore((s) => s.clearActiveBranch);
  const loadBranches = useBranchStore((s) => s.loadBranches);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (branches.length === 0) loadBranches("demo");
  }, [branches.length, loadBranches]);

  // Derive current value: explicit prop > active branch > "all"
  const currentValue = value ?? (activeBranch?.id ?? "all");

  /* ---- Role-aware branch visibility ---- */
  const isOwnerOrAdmin = user?.role === "tenant_owner" || user?.role === "admin";

  const visibleBranches = useMemo(() => {
    if (isOwnerOrAdmin) return branches;
    const userBranchId = user?.assignedBranchId;
    if (userBranchId) return branches.filter((b) => b.id === userBranchId);
    return branches.filter((b) => b.isActive).slice(0, 1);
  }, [branches, user, isOwnerOrAdmin]);

  const handleChange = useCallback(
    (newValue: string) => {
      if (newValue === "all") {
        clearActiveBranch();
      } else {
        const branch = branches.find((b) => b.id === newValue);
        if (branch) setActiveBranch(branch);
      }
      onChange?.(newValue);
    },
    [branches, setActiveBranch, clearActiveBranch, onChange],
  );

  // Restricted roles: show read-only branch badge (no selector)
  if (!isOwnerOrAdmin) {
    const branchName = visibleBranches[0]?.name ?? "Cabang";
    return (
      <div className={cn("flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900", className)}>
        <Store className="h-3.5 w-3.5 text-brand-500 shrink-0" />
        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{branchName}</span>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <select
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        className="appearance-none rounded-lg border border-neutral-200 bg-white pl-8 pr-8 py-2 text-xs font-medium text-neutral-700 cursor-pointer hover:border-neutral-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600"
      >
        {showAll && <option value="all">Semua Cabang</option>}
        {visibleBranches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <Store className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400 pointer-events-none" />
    </div>
  );
}
