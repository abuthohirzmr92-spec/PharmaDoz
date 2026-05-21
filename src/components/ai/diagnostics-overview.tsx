"use client";

import { Activity, AlertTriangle, CheckCircle, WifiOff } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SystemHealth } from "@/store/ai-store";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DiagnosticsOverviewProps {
  systemHealth: SystemHealth;
  activeAlerts: number;
  syncBacklog: number;
  failedTransactions24h: number;
  offlineBranches: number;
}

/* ------------------------------------------------------------------ */
/*  Health indicator config                                            */
/* ------------------------------------------------------------------ */

const HEALTH_CONFIG: Record<
  SystemHealth,
  {
    label: string;
    icon: typeof CheckCircle;
    dotColor: string;
    pulseColor: string;
    bgColor: string;
  }
> = {
  healthy: {
    label: "Sehat",
    icon: CheckCircle,
    dotColor: "bg-green-500",
    pulseColor: "shadow-green-500/50",
    bgColor: "bg-green-50 dark:bg-green-950/30",
  },
  degraded: {
    label: "Degradasi",
    icon: AlertTriangle,
    dotColor: "bg-amber-500",
    pulseColor: "shadow-amber-500/50",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
  },
  down: {
    label: "Kritis",
    icon: Activity,
    dotColor: "bg-red-500",
    pulseColor: "shadow-red-500/50",
    bgColor: "bg-red-50 dark:bg-red-950/30",
  },
};

/* ------------------------------------------------------------------ */
/*  Metric card config                                                 */
/* ------------------------------------------------------------------ */

interface MetricCardDef {
  key: string;
  label: string;
  icon: typeof Activity;
  value: number;
  color: "red" | "amber" | "blue" | "neutral";
}

const METRIC_STYLES: Record<
  MetricCardDef["color"],
  { icon: string; bg: string; value: string; border: string }
> = {
  red: {
    icon: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
    value: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-900",
  },
  amber: {
    icon: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    value: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-900",
  },
  blue: {
    icon: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    value: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-900",
  },
  neutral: {
    icon: "text-neutral-500",
    bg: "bg-neutral-50 dark:bg-neutral-800",
    value: "text-neutral-700 dark:text-neutral-300",
    border: "border-neutral-200 dark:border-neutral-700",
  },
};

const METRIC_COLOR: Record<
  string,
  MetricCardDef["color"]
> = {
  activeAlerts: "red",
  syncBacklog: "amber",
  failedTransactions24h: "red",
  offlineBranches: "amber",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DiagnosticsOverview({
  systemHealth,
  activeAlerts,
  syncBacklog,
  failedTransactions24h,
  offlineBranches,
}: DiagnosticsOverviewProps) {
  const hc = HEALTH_CONFIG[systemHealth];
  const HealthIcon = hc.icon;

  const metricCards: MetricCardDef[] = [
    {
      key: "activeAlerts",
      label: "Peringatan Aktif",
      icon: AlertTriangle,
      value: activeAlerts,
      color: METRIC_COLOR["activeAlerts"]!,
    },
    {
      key: "syncBacklog",
      label: "Antrean Sinkronisasi",
      icon: Activity,
      value: syncBacklog,
      color: METRIC_COLOR["syncBacklog"]!,
    },
    {
      key: "failedTransactions24h",
      label: "Gagal Transaksi 24j",
      icon: WifiOff,
      value: failedTransactions24h,
      color: METRIC_COLOR["failedTransactions24h"]!,
    },
    {
      key: "offlineBranches",
      label: "Cabang Offline",
      icon: WifiOff,
      value: offlineBranches,
      color: METRIC_COLOR["offlineBranches"]!,
    },
  ];

  return (
    <div className="space-y-4">
      {/* System health indicator */}
      <div
        className={cn(
          "flex items-center gap-4 rounded-xl border p-5",
          hc.bgColor,
          hc.pulseColor,
        )}
      >
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div
            className={cn(
              "absolute inset-0 animate-pulse rounded-full opacity-30",
              hc.dotColor,
            )}
          />
          <div
            className={cn(
              "relative flex h-12 w-12 items-center justify-center rounded-full",
              hc.bgColor,
              "border-2",
              hc.dotColor.replace("bg-", "border-"),
            )}
          >
            <HealthIcon
              className={cn(
                "h-6 w-6",
                hc.dotColor.replace("bg-", "text-"),
              )}
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Status Sistem
          </p>
          <p
            className={cn(
              "mt-0.5 text-lg font-bold",
              hc.dotColor.replace("bg-", "text-"),
            )}
          >
            {hc.label}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {systemHealth === "healthy"
              ? "Seluruh komponen sistem berjalan normal"
              : systemHealth === "degraded"
                ? "Beberapa komponen mengalami gangguan"
                : "Sistem mengalami gangguan kritis"}
          </p>
        </div>
      </div>

      {/* Metric cards grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          const cs = METRIC_STYLES[card.color];

          return (
            <div
              key={card.key}
              className={cn(
                "rounded-xl border bg-white p-4 dark:bg-neutral-900",
                cs.border,
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    cs.bg,
                  )}
                >
                  <Icon className={cn("h-4 w-4", cs.icon)} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  {card.label}
                </span>
              </div>
              <p
                className={cn(
                  "mt-2 text-lg font-bold tabular-nums",
                  cs.value,
                )}
              >
                {card.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
