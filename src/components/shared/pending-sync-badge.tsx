"use client";

import { CloudUpload } from "lucide-react";
import { cn } from "@/lib/cn";
import { useNetworkStore } from "@/store/network-store";

/* ------------------------------------------------------------------ */
/*  PendingSyncBadge                                                   */
/*  Tiny badge for cashier / transaction areas.                        */
/*  Shows pending count and queue backlog, colour-coded by severity.   */
/*  Pulses subtly when syncing.                                        */
/* ------------------------------------------------------------------ */

export function PendingSyncBadge() {
  const status = useNetworkStore((s) => s.status);
  const pendingSyncCount = useNetworkStore((s) => s.pendingSyncCount);
  const isSyncing = useNetworkStore((s) => s.isSyncing);
  const queueBacklog = useNetworkStore((s) => s.queueBacklog);

  // No pending items and online — nothing to show
  if (status === "online" && pendingSyncCount === 0 && queueBacklog === 0 && !isSyncing) {
    return null;
  }

  const isOffline = status === "offline";
  const showSyncing = isSyncing || status === "syncing";

  // Total pending items for colour-coding
  const totalPending = Math.max(pendingSyncCount, queueBacklog);

  // Determine badge colour
  // Priority: syncing > offline > count-based
  let bgClass: string;
  if (showSyncing) {
    bgClass =
      "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400";
  } else if (isOffline) {
    bgClass =
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400";
  } else if (totalPending > 20) {
    bgClass =
      "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400";
  } else if (totalPending >= 5) {
    bgClass =
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400";
  } else {
    bgClass =
      "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-tight",
        bgClass,
        showSyncing && "animate-pulse",
      )}
      role="status"
      aria-live="polite"
      aria-label={`${pendingSyncCount} pending transactions`}
    >
      <CloudUpload className="h-3 w-3 shrink-0" aria-hidden />
      <span className="tabular-nums">
        {queueBacklog > 0 ? queueBacklog : pendingSyncCount}
      </span>
      {queueBacklog > 0 && queueBacklog !== pendingSyncCount && (
        <span className="text-[10px] opacity-70">(+{pendingSyncCount})</span>
      )}
    </span>
  );
}
