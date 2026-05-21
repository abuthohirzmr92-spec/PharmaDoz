"use client";

import { useEffect } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Bell,
} from "lucide-react";
import { useAiStore } from "@/store/ai-store";
import { cn } from "@/lib/cn";
import type { AiAlert } from "@/store/ai-store";

/* ------------------------------------------------------------------ */
/*  Severity config                                                    */
/* ------------------------------------------------------------------ */

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    label: "Kritis",
    dot: "bg-red-500",
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-300",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  warn: {
    icon: AlertTriangle,
    label: "Peringatan",
    dot: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  info: {
    icon: Info,
    label: "Informasi",
    dot: "bg-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-300",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function SkeletonAlert() {
  return (
    <div className="flex animate-pulse items-start gap-3 rounded-lg border border-neutral-100 p-3 dark:border-neutral-800">
      <div className="mt-0.5 h-4 w-4 rounded bg-neutral-200 dark:bg-neutral-700" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-3 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-2.5 w-20 rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
      <div className="space-y-2 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonAlert key={i} />
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
      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400 dark:text-emerald-500" />
      <p className="mt-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Tidak ada alert aktif
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Semua sistem berjalan normal
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Alert item                                                         */
/* ------------------------------------------------------------------ */

function AlertItem({ alert }: { alert: AiAlert }) {
  const config = SEVERITY_CONFIG[alert.level];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        config.bg,
        config.border,
      )}
    >
      <config.icon
        className={cn("mt-0.5 h-4 w-4 shrink-0", config.text)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold",
              config.badge,
            )}
          >
            {config.label}
          </span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
            {formatTimestamp(alert.timestamp)}
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2">
          {alert.message}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function AlertCenter() {
  const alerts = useAiStore((s) => s.activeAlerts);
  const isLoading = useAiStore((s) => s.isLoading);
  const error = useAiStore((s) => s.error);
  const loadDiagnostics = useAiStore((s) => s.loadDiagnostics);

  useEffect(() => {
    if (!isLoading && !error) {
      loadDiagnostics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Loading ──────────────────────────────────────────────────── */
  if (isLoading) {
    return <SkeletonCard />;
  }

  /* ── Error ────────────────────────────────────────────────────── */
  if (error) {
    return <ErrorCard message={error} onRetry={loadDiagnostics} />;
  }

  /* ── Empty ────────────────────────────────────────────────────── */
  if (!isLoading && alerts.length === 0) {
    return <EmptyCard />;
  }

  /* ── Data ─────────────────────────────────────────────────────── */
  const unacknowledged = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Alert Center
          </h3>
        </div>
        {unacknowledged > 0 && (
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
            {unacknowledged}
          </span>
        )}
      </div>
      <div className="max-h-[320px] space-y-2 overflow-y-auto p-4">
        {alerts.slice(0, 20).map((alert) => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
}
