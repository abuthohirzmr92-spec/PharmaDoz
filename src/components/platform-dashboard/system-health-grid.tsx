"use client";

import { useEffect, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { useAiStore } from "@/store/ai-store";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type HealthLevel = "green" | "amber" | "red";

interface HealthKpi {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  level: HealthLevel;
}

/* ------------------------------------------------------------------ */
/*  Colour maps                                                        */
/* ------------------------------------------------------------------ */

const DOT_COLORS: Record<HealthLevel, string> = {
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

const BG_COLORS: Record<HealthLevel, string> = {
  green: "bg-emerald-50 dark:bg-emerald-950/20",
  amber: "bg-amber-50 dark:bg-amber-950/20",
  red: "bg-red-50 dark:bg-red-950/20",
};

/* ------------------------------------------------------------------ */
/*  Threshold helpers                                                  */
/* ------------------------------------------------------------------ */

function getLevel(
  value: number,
  invert: boolean,
  greenThreshold: number,
  amberThreshold: number,
): HealthLevel {
  if (invert) {
    // lower is better
    if (value <= greenThreshold) return "green";
    if (value <= amberThreshold) return "amber";
    return "red";
  }
  // higher is better
  if (value >= greenThreshold) return "green";
  if (value >= amberThreshold) return "amber";
  return "red";
}

function healthLabel(level: string): string {
  if (level === "healthy") return "Sehat";
  if (level === "degraded") return "Terganggu";
  if (level === "down") return "Down";
  return level;
}

function systemHealthLevel(systemHealth: string): HealthLevel {
  if (systemHealth === "healthy") return "green";
  if (systemHealth === "degraded") return "amber";
  return "red";
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function SkeletonKpi() {
  return (
    <div className="animate-pulse rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-3.5 w-3.5 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
      <div className="h-6 w-16 rounded bg-neutral-200 dark:bg-neutral-700" />
      <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700" />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <div className="h-4 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonKpi key={i} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Error state                                                        */
/* ------------------------------------------------------------------ */

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
      <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
      >
        Muat Ulang
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyCard() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
      <Activity className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-600" />
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Belum ada data kesehatan sistem
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI tile                                                           */
/* ------------------------------------------------------------------ */

function KpiTile({ label, icon: Icon, value, level }: HealthKpi) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        BG_COLORS[level],
        level === "green"
          ? "border-emerald-200 dark:border-emerald-800"
          : level === "amber"
            ? "border-amber-200 dark:border-amber-800"
            : "border-red-200 dark:border-red-800",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", ICON_COLORS[level])} />
        <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
          {label}
        </span>
      </div>
      <div className="mt-1">
        <span className={cn("text-lg font-bold tabular-nums", TEXT_COLORS[level])}>
          {value}
        </span>
      </div>
      {/* Mini health bar */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div
          className={cn("h-full rounded-full transition-all", DOT_COLORS[level])}
          style={{
            width: level === "green" ? "25%" : level === "amber" ? "60%" : "90%",
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function SystemHealthGrid() {
  const systemHealth = useAiStore((s) => s.systemHealth);
  const failedTransactions24h = useAiStore((s) => s.failedTransactions24h);
  const syncBacklog = useAiStore((s) => s.syncBacklog);
  const offlineBranches = useAiStore((s) => s.offlineBranches);
  const isLoading = useAiStore((s) => s.isLoading);
  const error = useAiStore((s) => s.error);
  const loadDiagnostics = useAiStore((s) => s.loadDiagnostics);

  useEffect(() => {
    if (!isLoading && !error) {
      loadDiagnostics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis: HealthKpi[] = useMemo(() => [
    {
      key: "system",
      label: "Status Sistem",
      icon: Activity,
      value: healthLabel(systemHealth),
      level: systemHealthLevel(systemHealth),
    },
    {
      key: "transactions",
      label: "Transaksi Gagal (24j)",
      icon: AlertTriangle,
      value: failedTransactions24h.toLocaleString("id-ID"),
      level: getLevel(failedTransactions24h, true, 0, 5),
    },
    {
      key: "sync",
      label: "Antrian Sinkronisasi",
      icon: RefreshCw,
      value: syncBacklog.toLocaleString("id-ID"),
      level: getLevel(syncBacklog, true, 0, 20),
    },
    {
      key: "offline",
      label: "Cabang Offline",
      icon: WifiOff,
      value: offlineBranches.toLocaleString("id-ID"),
      level: getLevel(offlineBranches, true, 0, 3),
    },
  ], [systemHealth, failedTransactions24h, syncBacklog, offlineBranches]);

  /* ── Loading ──────────────────────────────────────────────────── */
  if (isLoading) {
    return <SkeletonGrid />;
  }

  /* ── Error ────────────────────────────────────────────────────── */
  if (error) {
    return <ErrorCard message={error} onRetry={loadDiagnostics} />;
  }

  /* ── Normal ───────────────────────────────────────────────────── */
  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Kesehatan Sistem
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        {kpis.map(({ key, ...kpi }) => (
          <KpiTile key={key} {...kpi} />
        ))}
      </div>
    </div>
  );
}
