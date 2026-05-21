"use client";

import {
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { AiAlert } from "@/store/ai-store";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AlertListProps {
  alerts: AiAlert[];
  onAcknowledge: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Level config                                                       */
/* ------------------------------------------------------------------ */

const LEVEL_CONFIG = {
  critical: {
    icon: XCircle,
    iconColor: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    badgeColor: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    borderColor: "border-l-red-500",
    label: "Kritis",
  },
  warn: {
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    badgeColor:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    borderColor: "border-l-amber-400",
    label: "Peringatan",
  },
  info: {
    icon: Info,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    badgeColor:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    borderColor: "border-l-blue-400",
    label: "Informasi",
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;

    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatCategory(category: string): string {
  const map: Record<string, string> = {
    transaction: "Transaksi",
    auth: "Auth",
    sync: "Sinkronisasi",
    maintenance: "Maintenance",
    network: "Jaringan",
    permission: "Izin",
    recovery: "Pemulihan",
    backup: "Backup",
  };
  return map[category] ?? category;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AlertList({
  alerts,
  onAcknowledge,
}: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/30">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Tidak ada peringatan aktif
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">
              Sistem dalam kondisi normal
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
      {alerts.map((alert) => {
        const lc = LEVEL_CONFIG[alert.level];
        const LevelIcon = lc.icon;

        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-start gap-3 border-l-4 px-4 py-3.5 transition-colors",
              lc.borderColor,
              alert.acknowledged ? "opacity-60" : "",
            )}
          >
            {/* Level icon */}
            <div className="mt-0.5 flex shrink-0">
              <LevelIcon className={cn("h-4 w-4", lc.iconColor)} />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* Category badge */}
                <span
                  className={cn(
                    "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    lc.badgeColor,
                  )}
                >
                  {formatCategory(alert.category)}
                </span>

                {/* Level label */}
                <span className="text-[10px] font-medium text-neutral-400">
                  {lc.label}
                </span>
              </div>

              <p className="mt-1 text-xs font-medium text-neutral-800 dark:text-neutral-200">
                {alert.message}
              </p>

              <p className="mt-0.5 text-[10px] text-neutral-400">
                {formatTimestamp(alert.timestamp)}
              </p>
            </div>

            {/* Acknowledge button */}
            {!alert.acknowledged && (
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
              >
                <Bell className="h-3 w-3" />
                Akui
              </button>
            )}

            {alert.acknowledged && (
              <span className="flex shrink-0 items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1.5 text-[10px] font-medium text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
                <CheckCircle className="h-3 w-3" />
                Diketahui
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
