"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Store, Check, ChevronDown } from "lucide-react";
import { useBranchContext } from "@/providers/branch-provider";

export function BranchSwitcher() {
  const [open, setOpen] = useState(false);
  const { branches, activeBranch, setActiveBranch } = useBranchContext();

  // Render nothing if only 0 or 1 branch exists
  if (branches.length <= 1) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
          "hover:bg-neutral-100 dark:hover:bg-neutral-800",
          "text-neutral-700 dark:text-neutral-300",
        )}
      >
        <Store className="h-4 w-4 shrink-0 text-brand-500" />
        <span className="flex-1 truncate text-left font-medium">
          {activeBranch?.name ?? "Pilih Cabang"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-neutral-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          {/* Overlay to close */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div
            className={cn(
              "absolute left-0 right-0 z-50 mt-1 rounded-xl border shadow-lg",
              "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800",
            )}
          >
            <div className="p-1.5">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Pilih Cabang
              </p>

              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => {
                    setActiveBranch(branch);
                    setOpen(false);
                  }}
                  disabled={!branch.isActive}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    branch.isActive
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-50",
                    activeBranch?.id === branch.id
                      ? "bg-brand-50 text-brand-700 font-medium dark:bg-brand-950 dark:text-brand-300"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700",
                  )}
                >
                  {/* Active indicator dot */}
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      branch.isActive
                        ? activeBranch?.id === branch.id
                          ? "bg-brand-500"
                          : "bg-green-400"
                        : "bg-neutral-300",
                    )}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="truncate">{branch.name}</p>
                    {branch.code && (
                      <p className="truncate text-[11px] text-neutral-400 dark:text-neutral-500">
                        {branch.code}
                      </p>
                    )}
                  </div>

                  {activeBranch?.id === branch.id && (
                    <Check className="h-4 w-4 shrink-0 text-brand-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
