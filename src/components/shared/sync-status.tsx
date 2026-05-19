"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { useNetworkStore } from "@/store/network-store";

/* ------------------------------------------------------------------ */
/*  SyncStatus                                                         */
/*  Small inline indicator for sidebar footer or header area.          */
/* ------------------------------------------------------------------ */

export function SyncStatus() {
  const status = useNetworkStore((s) => s.status);
  const pendingSyncCount = useNetworkStore((s) => s.pendingSyncCount);
  const isSyncing = useNetworkStore((s) => s.isSyncing);

  // Nothing to report
  if (status === "online" && pendingSyncCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400"
      role="status"
      aria-live="polite"
    >
      {isSyncing ? (
        <>
          <RefreshCw className="h-3 w-3 animate-spin" aria-hidden />
          <span>Syncing...</span>
        </>
      ) : pendingSyncCount > 0 ? (
        <>
          <span
            className={cn(
              "inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none",
              "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
            )}
          >
            {pendingSyncCount}
          </span>
          <span>pending sync</span>
        </>
      ) : null}
    </div>
  );
}
