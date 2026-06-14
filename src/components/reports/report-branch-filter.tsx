"use client";

import { useEffect, useMemo } from "react";
import { Store } from "lucide-react";
import { useBranchStore } from "@/store/branch-store";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  ReportBranchFilter — Reusable branch selector for all reports      */
/* ------------------------------------------------------------------ */
/*  Shows: "Semua Cabang" + list of branches from branch-store.        */
/*  Controlled component — selection owned by parent page.             */
/* ------------------------------------------------------------------ */

interface Props {
  selectedBranchId: string; // "all" or branch UUID
  onChange: (branchId: string) => void;
}

export function ReportBranchFilter({ selectedBranchId, onChange }: Props) {
  const branches = useBranchStore((s) => s.branches);
  const loadBranches = useBranchStore((s) => s.loadBranches);
  const isLoading = useBranchStore((s) => s.isLoading);

  // Branches are loaded by BranchProvider on auth — no lazy load needed

  const options = useMemo(
    () => [{ id: "all", name: "Semua Cabang" }, ...branches.map((b) => ({ id: b.id, name: b.name }))],
    [branches],
  );

  return (
    <div className="flex items-center gap-3">
      <Store className="h-4 w-4 text-neutral-400 shrink-0" />
      <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-900 overflow-x-auto">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-colors",
              selectedBranchId === opt.id
                ? "bg-white shadow-sm text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
            )}
          >
            {opt.name}
          </button>
        ))}
      </div>
      {isLoading && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      )}
    </div>
  );
}
