"use client";

import { useState, useEffect } from "react";
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
  const lastOfflineAt = useNetworkStore((s) => s.lastOfflineAt);

  const [duration, setDuration] = useState("");

  useEffect(() => {
    if (status !== "offline" || !lastOfflineAt) {
      setDuration("");
      return;
    }

    const offlineAt = lastOfflineAt;

    function calc() {
      const offline = new Date(offlineAt).getTime();
      const now = Date.now();
      const diff = now - offline;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);

      if (hours > 0) return `${hours}j ${minutes}m offline`;
      if (minutes > 0) return `${minutes} menit offline`;
      return "Baru saja offline";
    }

    setDuration(calc());
    const interval = setInterval(() => setDuration(calc()), 30000);
    return () => clearInterval(interval);
  }, [status, lastOfflineAt]);

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
        {duration && (
          <span className="opacity-80">&mdash; {duration}</span>
        )}
        {status === "offline" && (
          <button
            onClick={() => window.location.reload()}
            className="ml-1 rounded-md border border-current px-2 py-0.5 text-[11px] font-medium hover:bg-white/10"
          >
            Sambungkan Ulang
          </button>
        )}
      </div>
    </>
  );
}
