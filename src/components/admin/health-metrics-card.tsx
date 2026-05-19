"use client";

import { useMemo } from "react";
import {
  Activity,
  Clock,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { useMetricsStore } from "@/store/metrics-store";
import { useEventLogStore } from "@/store/event-log-store";
import { cn } from "@/lib/cn";

interface KpiConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  metricName:
    | "transaction.latency_ms"
    | "auth.success_rate"
    | "sync.pending_count"
    | "queue.backlog_depth";
  unit: string;
  /** Higher values indicate better health */
  higherIsBetter: boolean;
  /** Thresholds for [green, amber, red] boundary */
  thresholds: { green: number; amber: number };
}

const KPI_CARDS: KpiConfig[] = [
  {
    key: "latency",
    label: "Latensi Transaksi",
    icon: Clock,
    metricName: "transaction.latency_ms",
    unit: "ms",
    higherIsBetter: false,
    thresholds: { green: 100, amber: 200 },
  },
  {
    key: "auth",
    label: "Tingkat Keberhasilan Auth",
    icon: ShieldCheck,
    metricName: "auth.success_rate",
    unit: "%",
    higherIsBetter: true,
    thresholds: { green: 95, amber: 85 },
  },
  {
    key: "sync",
    label: "Sync Tertunda",
    icon: RefreshCw,
    metricName: "sync.pending_count",
    unit: "",
    higherIsBetter: false,
    thresholds: { green: 1, amber: 10 },
  },
  {
    key: "backlog",
    label: "Antrian Backlog",
    icon: Layers,
    metricName: "queue.backlog_depth",
    unit: "",
    higherIsBetter: false,
    thresholds: { green: 5, amber: 20 },
  },
];

type HealthLevel = "green" | "amber" | "red";

const HEALTH_COLORS: Record<HealthLevel, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

const TEXT_COLORS: Record<HealthLevel, string> = {
  green: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
};

const ICON_COLORS: Record<HealthLevel, string> = {
  green: "text-emerald-500",
  amber: "text-amber-500",
  red: "text-red-500",
};

function getHealthLevel(value: number, config: KpiConfig): HealthLevel {
  if (config.higherIsBetter) {
    if (value >= config.thresholds.green) return "green";
    if (value >= config.thresholds.amber) return "amber";
    return "red";
  }
  if (value <= config.thresholds.green) return "green";
  if (value <= config.thresholds.amber) return "amber";
  return "red";
}

function getHealthBarPercent(value: number, config: KpiConfig): number {
  const max = config.higherIsBetter ? 100 : config.thresholds.amber * 2;
  const pct = config.higherIsBetter
    ? (value / max) * 100
    : 100 - (value / max) * 100;
  return Math.round(Math.max(5, Math.min(100, pct)));
}

export function HealthMetricsCard() {
  const metrics = useMetricsStore((s) => s.metrics);
  const events = useEventLogStore((s) => s.events);

  const kpis = useMemo(() => {
    return KPI_CARDS.map((config) => {
      const relevant = metrics.filter((m) => m.name === config.metricName);
      const avg =
        relevant.length > 0
          ? relevant.reduce((sum, m) => sum + m.value, 0) / relevant.length
          : 0;
      const value = Math.round(avg * 100) / 100;
      const health = getHealthLevel(value, config);
      const barPercent = getHealthBarPercent(value, config);
      return { ...config, value, health, barPercent };
    });
  }, [metrics]);

  const errorCount = useMemo(() => {
    return events.filter(
      (e) => e.level === "error" || e.level === "critical",
    ).length;
  }, [events]);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Health Metrics
        </h3>
      </div>

      {/* 2x2 KPI Grid */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.key}
            className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50"
          >
            <div className="flex items-center gap-2">
              <kpi.icon
                className={cn("h-3.5 w-3.5 shrink-0", ICON_COLORS[kpi.health])}
              />
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {kpi.label}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span
                className={cn(
                  "text-lg font-bold tabular-nums",
                  TEXT_COLORS[kpi.health],
                )}
              >
                {kpi.value}
              </span>
              {kpi.unit && (
                <span className="text-[11px] text-neutral-400">{kpi.unit}</span>
              )}
            </div>
            {/* Mini health bar */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  HEALTH_COLORS[kpi.health],
                )}
                style={{ width: `${kpi.barPercent}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Error count from event log */}
      <div className="mt-3 flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800/50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            Event Errors
          </span>
        </div>
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            errorCount > 0
              ? "text-red-600 dark:text-red-400"
              : "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {errorCount}
        </span>
      </div>
    </div>
  );
}
