"use client";

import { Brain, Clock, Shield, Activity } from "lucide-react";
import { cn } from "@/lib/cn";
import type { MaintenanceMode } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DiagnosticsSummaryProps {
  summary: string;
  lastBackup: string | null;
  maintenanceStatus: MaintenanceMode;
  recoveryActionCount: number;
  showSoonBadge: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatBackupTime(iso: string | null): string {
  if (!iso) return "Belum pernah";
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffHours < 1) return "Kurang dari 1 jam yang lalu";
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    const days = Math.floor(diffHours / 24);
    return `${days} hari yang lalu`;
  } catch {
    return "—";
  }
}

function formatMaintenance(mode: MaintenanceMode): string {
  switch (mode) {
    case "none":
      return "Tidak ada";
    case "readonly":
      return "Read-only";
    case "scheduled":
      return "Terjadwal";
    case "full":
      return "Penuh";
    default:
      return mode;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DiagnosticsSummary({
  summary,
  lastBackup,
  maintenanceStatus,
  recoveryActionCount,
  showSoonBadge,
}: DiagnosticsSummaryProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/30">
            <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Ringkasan AI
          </span>
        </div>

        {showSoonBadge && (
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[10px] font-medium text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400">
            <Activity className="h-3 w-3" />
            Segera Hadir
          </span>
        )}
      </div>

      {/* Summary text */}
      <div className="mt-4 rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800/50">
        <p className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
          {summary || "Belum ada data diagnostik. Muat halaman untuk melihat ringkasan."}
        </p>
      </div>

      {/* Metadata stats */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Last backup */}
        <div className="flex items-center gap-2.5 rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-800/30">
          <Clock className="h-4 w-4 shrink-0 text-neutral-400" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Backup Terakhir
            </p>
            <p className="mt-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {formatBackupTime(lastBackup)}
            </p>
          </div>
        </div>

        {/* Maintenance status */}
        <div className="flex items-center gap-2.5 rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-800/30">
          <Shield className="h-4 w-4 shrink-0 text-neutral-400" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Maintenance
            </p>
            <p className="mt-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {formatMaintenance(maintenanceStatus)}
            </p>
          </div>
        </div>

        {/* Recovery actions */}
        <div className="flex items-center gap-2.5 rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-800/30">
          <Activity className="h-4 w-4 shrink-0 text-neutral-400" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Aksi Pemulihan
            </p>
            <p className="mt-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {recoveryActionCount} aksi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
