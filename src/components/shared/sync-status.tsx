"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { useNetworkStore } from "@/store/network-store";

/* ------------------------------------------------------------------ */
/*  SyncStatus                                                         */
/*  Small inline indicator for sidebar footer or header area.          */
/*  Shows a colour-coded dot and optional pending/syncing label.       */
/*  Hover to view a detailed sync summary popover.                     */
/* ------------------------------------------------------------------ */

function formatTime(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function SyncStatus() {
  const status = useNetworkStore((s) => s.status);
  const pendingSyncCount = useNetworkStore((s) => s.pendingSyncCount);
  const isSyncing = useNetworkStore((s) => s.isSyncing);
  const queueBacklog = useNetworkStore((s) => s.queueBacklog);
  const lastSyncAttempt = useNetworkStore((s) => s.lastSyncAttempt);
  const lastSyncSuccess = useNetworkStore((s) => s.lastSyncSuccess);
  const getSyncSummary = useNetworkStore((s) => s.getSyncSummary);
  const getQueueHealth = useNetworkStore((s) => s.getQueueHealth);

  const [showDetails, setShowDetails] = useState(false);

  const summary = getSyncSummary();
  const health = getQueueHealth();

  const isHealthy = status === "online" && pendingSyncCount === 0 && queueBacklog === 0 && !isSyncing;

  const isStalled = (() => {
    if (pendingSyncCount === 0 && queueBacklog === 0) return false;
    if (!lastSyncSuccess) return true;
    const elapsed = Date.now() - new Date(lastSyncSuccess).getTime();
    return elapsed > 60 * 60 * 1000;
  })();

  // Always visible dot colour
  const dotColor = isHealthy
    ? "bg-green-500"
    : isStalled
      ? "bg-red-500"
      : "bg-amber-500";

  return (
    <div
      className="relative inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400"
      role="status"
      aria-live="polite"
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
      onFocus={() => setShowDetails(true)}
      onBlur={() => setShowDetails(false)}
    >
      {/* Colour-coded status dot — always visible */}
      <span
        className={cn("inline-block h-2 w-2 rounded-full shrink-0", dotColor)}
        aria-hidden
      />

      {/* Existing syncing / pending indicator */}
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

      {/* Hover popover with sync summary details */}
      {showDetails && (
        <div
          className={cn(
            "absolute bottom-full left-0 mb-2 z-50",
            "min-w-[11rem] rounded-md border px-3 py-2 shadow-md",
            "bg-white dark:bg-neutral-900",
            "border-neutral-200 dark:border-neutral-700",
            "text-[11px] leading-relaxed",
          )}
        >
          <div className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-200 mb-1">
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                summary.isHealthy
                  ? "bg-green-500"
                  : health.status === "stalled"
                    ? "bg-red-500"
                    : "bg-amber-500",
              )}
            />
            <span>
              {summary.isHealthy
                ? "Sehat"
                : health.status === "stalled"
                  ? "Macet"
                  : "Antrean"}
            </span>
          </div>
          <div className="space-y-0.5 text-neutral-500 dark:text-neutral-400">
            <div className="flex justify-between gap-3">
              <span>Sync terakhir</span>
              <span className="tabular-nums text-neutral-700 dark:text-neutral-200">
                {formatTime(lastSyncAttempt)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Berhasil</span>
              <span className="tabular-nums text-neutral-700 dark:text-neutral-200">
                {formatTime(lastSyncSuccess)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Antrean</span>
              <span
                className={cn(
                  "tabular-nums font-medium",
                  queueBacklog > 20
                    ? "text-red-600 dark:text-red-400"
                    : queueBacklog > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-neutral-700 dark:text-neutral-200",
                )}
              >
                {queueBacklog}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
