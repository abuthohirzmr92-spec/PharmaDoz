"use client";

import { useState, useEffect } from "react";
import { Wrench, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMaintenanceTime } from "@/lib/maintenance";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface MaintenanceBannerProps {
  message: string;
  mode: "readonly" | "scheduled";
  scheduledEndAt?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Banner configuration                                               */
/* ------------------------------------------------------------------ */

interface BannerStyle {
  icon: typeof Wrench | typeof Clock;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

const BANNER_CONFIG: Record<"readonly" | "scheduled", BannerStyle> = {
  readonly: {
    icon: Wrench,
    bgClass: "bg-amber-50 dark:bg-amber-950/60",
    textClass: "text-amber-700 dark:text-amber-400",
    borderClass: "border-amber-200 dark:border-amber-800",
  },
  scheduled: {
    icon: Clock,
    bgClass: "bg-blue-50 dark:bg-blue-950/60",
    textClass: "text-blue-700 dark:text-blue-400",
    borderClass: "border-blue-200 dark:border-blue-800",
  },
};

/* ------------------------------------------------------------------ */
/*  MaintenanceBanner                                                  */
/* ------------------------------------------------------------------ */

export function MaintenanceBanner({
  message,
  mode,
  scheduledEndAt,
}: MaintenanceBannerProps) {
  // Only rendered for readonly or scheduled; full/none handled externally
  const config = BANNER_CONFIG[mode];
  const Icon = config.icon;

  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "scheduled" || !scheduledEndAt) {
      setRemaining(null);
      return;
    }

    const endAt = scheduledEndAt;

    function calc() {
      const end = new Date(endAt).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setRemaining("Berakhir");
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);

      if (hours > 0) {
        setRemaining(`Tersisa ${hours}j ${minutes}m`);
      } else {
        setRemaining(`Tersisa ${minutes} menit`);
      }
    }

    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [mode, scheduledEndAt]);

  const defaultMessage: Record<string, string> = {
    readonly:
      "Transaksi baru sementara ditutup. Transaksi aktif tetap dapat diselesaikan.",
    scheduled: message || "Pemeliharaan sistem akan segera dilakukan.",
  };

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
          "border-t-2",
          "animate-[bannerFadeIn_0.3s_ease-in-out]",
          config.bgClass,
          config.textClass,
          config.borderClass,
        )}
        role="alert"
        aria-live="assertive"
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          {mode === "readonly"
            ? defaultMessage.readonly
            : defaultMessage.scheduled}
        </span>
        {mode === "scheduled" && scheduledEndAt && (
          <span className="opacity-80">
            &mdash; Selesai: {formatMaintenanceTime(scheduledEndAt)}
          </span>
        )}
        {mode === "scheduled" && remaining && (
          <span className="opacity-70">&middot; {remaining}</span>
        )}
      </div>
    </>
  );
}
