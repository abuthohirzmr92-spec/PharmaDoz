"use client";

import { WifiOff, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { useNetworkStore } from "@/store/network-store";
import type { NetworkStatus } from "@/types";

/* ------------------------------------------------------------------ */
/*  Status configuration                                               */
/* ------------------------------------------------------------------ */

interface BannerStyle {
  icon: typeof WifiOff;
  bgClass: string;
  textClass: string;
  message: string;
}

const BANNER_CONFIG: Record<Exclude<NetworkStatus, "online">, BannerStyle> = {
  offline: {
    icon: WifiOff,
    bgClass:
      "bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800",
    textClass: "text-red-700 dark:text-red-400",
    message:
      "You are offline. Transactions are saved locally and will sync when connection is restored.",
  },
  degraded: {
    icon: AlertTriangle,
    bgClass:
      "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800",
    textClass: "text-amber-700 dark:text-amber-400",
    message: "Slow connection detected. Some features may be delayed.",
  },
  syncing: {
    icon: RefreshCw,
    bgClass:
      "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800",
    textClass: "text-blue-700 dark:text-blue-400",
    message: "Syncing today's operational data...",
  },
};

/* ------------------------------------------------------------------ */
/*  OfflineBanner                                                      */
/* ------------------------------------------------------------------ */

export function OfflineBanner() {
  const status = useNetworkStore((s) => s.status);

  if (status === "online") return null;

  const config = BANNER_CONFIG[status]!;
  const Icon = config.icon;
  const isSyncing = status === "syncing";

  return (
    <>
      <style>{`
        @keyframes bannerFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        className={cn(
          "sticky top-0 z-30 flex h-10 items-center justify-center gap-2 border-b px-4 text-xs font-medium",
          "animate-[bannerFadeIn_0.3s_ease-in-out]",
          config.bgClass,
          config.textClass,
        )}
        role="alert"
        aria-live="assertive"
      >
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            isSyncing && "animate-spin",
          )}
          aria-hidden
        />
        <span>{config.message}</span>
      </div>
    </>
  );
}
