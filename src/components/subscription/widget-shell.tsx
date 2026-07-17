"use client";

import type { ReactNode } from "react";
import { AppCard } from "@/components/ui/app-card";
import { AlertTriangle } from "lucide-react";

// Standardized widget wrapper implementing the Empty / Loading / Error policies.
// A failed widget shows an inline error and does NOT break the dashboard.
export function WidgetShell({
  title,
  loading,
  error,
  isEmpty,
  emptyText = "Belum ada data.",
  children,
}: {
  title?: string;
  loading: boolean;
  error: string | null;
  isEmpty?: boolean;
  emptyText?: string;
  children: ReactNode;
}) {
  return (
    <AppCard>
      {title && <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">{title}</h3>}

      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Memuat">
          <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Gagal memuat bagian ini. Bagian lain tetap tersedia.</span>
        </div>
      ) : isEmpty ? (
        <p className="text-sm text-neutral-500">{emptyText}</p>
      ) : (
        children
      )}
    </AppCard>
  );
}
