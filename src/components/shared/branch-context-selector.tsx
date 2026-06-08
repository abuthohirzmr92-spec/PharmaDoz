"use client";

import { useMemo } from "react";
import { Store, ChevronDown } from "lucide-react";
import { useBranchStore } from "@/store/branch-store";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  BranchContextSelector — Reusable branch dropdown                    */
/* ------------------------------------------------------------------ */
/*  Uses branch-store as single source of truth (shared with           */
/*  BranchProvider and sidebar BranchSwitcher).                        */
/*  Role-aware: owner/admin see "All Branches", staff see own branch.  */
/* ------------------------------------------------------------------ */

interface Props {
  value: string;       // "all" or branch UUID from branch-store.activeBranch
  onChange: (branchId: string) => void;
  showAll?: boolean;
  className?: string;
}

export function BranchContextSelector({ value, onChange, showAll = true, className }: Props) {
  const branches = useBranchStore((s) => s.branches);
  const loadBranches = useBranchStore((s) => s.loadBranches);
  const user = useAuthStore((s) => s.user);

  // Lazy load branches if not yet loaded
  if (branches.length === 0 && typeof window !== "undefined") {
    loadBranches("demo");
  }

  /* ---- Role-aware branch visibility ---- */
  const visibleBranches = useMemo(() => {
    const isOwnerOrAdmin = user?.role === "tenant_owner" || user?.role === "admin";
    if (isOwnerOrAdmin) return branches;
    const userBranchId = (user as any)?.branchId ?? (user as any)?.pharmacyId;
    if (userBranchId) return branches.filter((b) => b.id === userBranchId);
    return branches.filter((b) => b.isActive).slice(0, 1);
  }, [branches, user]);

  const selectedBranch = useMemo(
    () => visibleBranches.find((b) => b.id === value),
    [visibleBranches, value],
  );

  const displayLabel = value === "all" ? "Semua Cabang" : (selectedBranch?.name ?? "Cabang");

  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
