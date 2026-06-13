"use client";

import { useBranchStore } from "@/store/branch-store";
import { useAuthStore } from "@/store/auth-store";
import { Store } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Global Branch Selector — sidebar operational context               */
/* ------------------------------------------------------------------ */
/*  Single source of truth: branch-store.activeBranch                  */
/*  Owner/Admin: full dropdown with "Semua Cabang" option              */
/*  Cashier/Staff: read-only branch name badge                         */
/* ------------------------------------------------------------------ */

export function SidebarBranchSelector() {
  const activeBranch = useBranchStore((s) => s.activeBranch);
  const setActiveBranch = useBranchStore((s) => s.setActiveBranch);
  const clearActiveBranch = useBranchStore((s) => s.clearActiveBranch);
  const branches = useBranchStore((s) => s.branches);
  const user = useAuthStore((s) => s.user);
  const isOwnerOrAdmin = user?.role === "tenant_owner" || user?.role === "admin";

  // Hide entirely if no branches loaded
  if (branches.length === 0) return null;

  // Cashier/staff: read-only assigned branch display
  if (!isOwnerOrAdmin) {
    const branchName = activeBranch?.name ?? "—";
    return (
      <div className="border-t border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          Cabang
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-2 py-1.5 dark:bg-neutral-900">
          <Store className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate">
            {branchName}
          </span>
        </div>
      </div>
    );
  }

  // Owner/admin: full dropdown with "Semua Cabang"
  return (
    <div className="border-t border-neutral-200 px-3 py-2 dark:border-neutral-800">
      <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        Cabang Aktif
      </p>
      <select
        value={activeBranch?.id ?? "all"}
        onChange={(e) => {
          const id = e.target.value;
          if (id === "all") { clearActiveBranch(); return; }
          const branch = branches.find((b) => b.id === id);
          if (branch) setActiveBranch(branch);
        }}
        className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
      >
        <option value="all">Semua Cabang</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </div>
  );
}
