"use client";

import { Store, ChevronDown, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/providers/branch-provider";
import { useAuthStore } from "@/store/auth-store";
import { isPlatformUser } from "@/lib/auth/role-resolver";

interface BranchIndicatorProps {
  className?: string;
}

/**
 * Shows the currently active branch in the app header.
 * Hidden for platform users and single-branch tenants.
 */
export function BranchIndicator({ className }: BranchIndicatorProps) {
  const user = useAuthStore((s) => s.user);
  const { branches, activeBranch } = useBranchContext();

  if (isPlatformUser(user?.role)) return null;
  if (branches.length <= 1) return null;
  if (!activeBranch) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 dark:border-neutral-700 dark:bg-neutral-800",
        className,
      )}
    >
      <MapPin className="h-3.5 w-3.5 text-brand-500" />
      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
        {activeBranch.name}
      </span>
    </div>
  );
}

/**
 * Dropdown-style branch indicator for the sidebar header area.
 */
export function SidebarBranchIndicator() {
  const user = useAuthStore((s) => s.user);
  const { branches, activeBranch } = useBranchContext();

  if (isPlatformUser(user?.role)) return null;
  if (branches.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
        <Store className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-neutral-800 dark:text-neutral-200">
          {activeBranch?.name ?? "Pilih Cabang"}
        </p>
        <p className="text-[10px] text-neutral-400">
          {activeBranch?.code ?? ""}
        </p>
      </div>
    </div>
  );
}
