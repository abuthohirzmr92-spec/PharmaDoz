"use client";

import { CloudUpload } from "lucide-react";
import { cn } from "@/lib/cn";
import { useNetworkStore } from "@/store/network-store";

/* ------------------------------------------------------------------ */
/*  PendingSyncBadge                                                   */
/*  Tiny badge for cashier / transaction areas.                        */
/* ------------------------------------------------------------------ */

export function PendingSyncBadge() {
  const status = useNetworkStore((s) => s.status);
  const pendingSyncCount = useNetworkStore((s) => s.pendingSyncCount);
  const isSyncing = useNetworkStore((s) => s.isSyncing);

  // No pending items and online — nothing to show
  if (status === "online" && pendingSyncCount === 0 && !isSyncing) {
    return null;
  }

  const isOffline = status === "offline";
  const showSyncing = isSyncing || status === "syncing";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-tight",
        isOffline &&
          "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
        showSyncing &&
          "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
        !isOffline &&
          !showSyncing &&
          "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
      )}
      role="status"
      aria-live="polite"
      aria-label={`${pendingSyncCount} pending transactions`}
    >
      <CloudUpload className="h-3 w-3 shrink-0" aria-hidden />
      <span className="tabular-nums">{pendingSyncCount}</span>
    </span>
  );
}
