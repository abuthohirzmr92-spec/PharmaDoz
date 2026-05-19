"use client";

import { Wifi, WifiOff, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { useNetworkStore } from "@/store/network-store";

/* ------------------------------------------------------------------ */
/*  Status icon + colour config                                         */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG = {
  online: {
    icon: Wifi,
    dotClass: "bg-emerald-500",
    label: "",
  },
  offline: {
    icon: WifiOff,
    dotClass: "bg-red-500",
    label: "Offline",
  },
  degraded: {
    icon: AlertTriangle,
    dotClass: "bg-amber-500",
    label: "Slow Connection",
  },
  syncing: {
    icon: RefreshCw,
    dotClass: "bg-blue-500",
    label: "Syncing...",
  },
};

/* ------------------------------------------------------------------ */
/*  OfflineIndicator                                                    */
/* ------------------------------------------------------------------ */

export function OfflineIndicator() {
  const status = useNetworkStore((s) => s.status);
  const pendingSyncCount = useNetworkStore((s) => s.pendingSyncCount);

  // Hide entirely when online
  if (status === "online") return null;

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.offline;
  const Icon = cfg.icon;

  const isSyncing = status === "syncing";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
        "bg-neutral-100 dark:bg-neutral-800",
        "border border-neutral-200 dark:border-neutral-700",
        status === "offline" &&
          "text-red-700 dark:text-red-400",
        status === "degraded" &&
          "text-amber-700 dark:text-amber-400",
        status === "syncing" &&
          "text-blue-700 dark:text-blue-400",
      )}
      role="status"
      aria-live="polite"
    >
      {/* Coloured dot */}
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          cfg.dotClass,
          isSyncing && "animate-pulse",
        )}
      />

      {/* Label */}
      <span className="truncate">{cfg.label}</span>

      {/* Pending count badge (only when there are pending items) */}
      {pendingSyncCount > 0 && (
        <span
          className={cn(
            "ml-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none",
            "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300",
          )}
        >
          {pendingSyncCount}
        </span>
      )}

      {/* Icon */}
      <Icon
        className={cn(
          "h-3 w-3 shrink-0",
          isSyncing && "animate-spin",
        )}
      />
    </div>
  );
}
