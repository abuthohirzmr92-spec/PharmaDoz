"use client";

import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { useRecoveryStore } from "@/store/recovery-store";
import type { RecoveryState } from "@/types";

/* ------------------------------------------------------------------ */
/*  Banner configuration                                               */
/* ------------------------------------------------------------------ */

interface BannerStyle {
  icon: typeof Loader2 | typeof AlertTriangle | typeof RefreshCw;
  bgClass: string;
  textClass: string;
  spinIcon: boolean;
  message: string;
  countLabel?: string;
}

type DisplayState = Extract<RecoveryState, "retrying" | "recovering" | "degraded">;

const BANNER_CONFIG: Record<DisplayState, BannerStyle> = {
  retrying: {
    icon: Loader2,
    bgClass: "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800",
    textClass: "text-amber-700 dark:text-amber-400",
    spinIcon: true,
    message: "Memulihkan sistem...",
    countLabel: "proses",
  },
  recovering: {
    icon: RefreshCw,
    bgClass: "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800",
    textClass: "text-blue-700 dark:text-blue-400",
    spinIcon: false,
    message: "Pemulihan sedang berlangsung",
  },
  degraded: {
    icon: AlertTriangle,
    bgClass: "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800",
    textClass: "text-amber-700 dark:text-amber-400",
    spinIcon: false,
    message: "Beberapa layanan terdegradasi",
    countLabel: "gagal",
  },
};

/* ------------------------------------------------------------------ */
/*  Selectors                                                          */
/* ------------------------------------------------------------------ */

function useBannerData() {
  const actions = useRecoveryStore((s) => s.actions);
  const state = useRecoveryStore((s) => s.getState());

  if (state === "idle" || state === "restored") {
    return { visible: false as const, state };
  }

  const config = BANNER_CONFIG[state as DisplayState];
  if (!config) {
    return { visible: false as const, state };
  }

  const retryingCount = actions.filter((a) => a.status === "retrying").length;
  const failedCount = actions.filter((a) => a.status === "failed").length;

  return {
    visible: true as const,
    state,
    config,
    retryingCount,
    failedCount,
  };
}

/* ------------------------------------------------------------------ */
/*  RecoveryBanner                                                     */
/* ------------------------------------------------------------------ */

export function RecoveryBanner() {
  const data = useBannerData();

  if (!data.visible) return null;

  const { config, state, retryingCount, failedCount } = data;
  const Icon = config.icon;

  const count =
    state === "retrying"
      ? retryingCount
      : state === "degraded"
        ? failedCount
        : null;

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
          "sticky top-0 z-30 flex h-8 items-center justify-center gap-2 border-b px-4 text-xs font-medium",
          "animate-[bannerFadeIn_0.3s_ease-in-out]",
          config.bgClass,
          config.textClass,
        )}
        role="alert"
        aria-live="polite"
      >
        <Icon
          className={cn("h-3.5 w-3.5 shrink-0", config.spinIcon && "animate-spin")}
          aria-hidden
        />
        <span>{config.message}</span>
        {count !== null && count > 0 && (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden>&mdash;</span>
            <span>
              {count}{" "}
              {state === "retrying" ? "operasi" : state === "degraded" ? "layanan" : ""}
            </span>
          </span>
        )}
      </div>
    </>
  );
}
