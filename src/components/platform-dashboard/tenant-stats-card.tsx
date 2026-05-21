"use client";

import { useEffect, useMemo } from "react";
import { Building2, CheckCircle2, PauseCircle, Timer } from "lucide-react";
import { useSuperAdminStore } from "@/store/super-admin-store";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  Stat item configuration                                            */
/* ------------------------------------------------------------------ */

interface StatItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function SkeletonStat() {
  return (
    <div className="flex flex-col items-center gap-2 sm:items-start">
      <div className="h-10 w-10 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700" />
      <div className="space-y-1.5 text-center sm:text-left">
        <div className="h-3 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-6 w-12 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700">
      <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <div className="h-4 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
      <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStat key={i} />
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
    <div className="rounded-xl border border-neutral-200 p-8 text-center dark:border-neutral-700">
      <Building2 className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-600" />
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Belum ada tenant</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function TenantStatsCard() {
  const tenants = useSuperAdminStore((s) => s.tenants);
  const health = useSuperAdminStore((s) => s.health);
  const isLoading = useSuperAdminStore((s) => s.isLoading);
  const error = useSuperAdminStore((s) => s.error);
  const loadAll = useSuperAdminStore((s) => s.loadAll);

  /* Auto-load on mount when no data is present */
  useEffect(() => {
    if (tenants.length === 0 && !isLoading && !error) {
      loadAll();
    }
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = health?.totalTenants ?? tenants.length;
    const active = health?.activeTenants ?? tenants.filter((t) => t.isActive).length;
    const suspended = total - active;
    const trial = Math.max(0, total - active);

    return { total, active, suspended, trial };
  }, [tenants, health]);

  const items: StatItem[] = [
    {
      key: "total",
      label: "Total Tenant",
      icon: Building2,
      value: stats.total,
    },
    {
      key: "active",
      label: "Aktif",
      icon: CheckCircle2,
      value: stats.active,
    },
    {
      key: "suspended",
      label: "Ditangguhkan",
      icon: PauseCircle,
      value: stats.suspended,
    },
    {
      key: "trial",
      label: "Masa Percobaan",
      icon: Timer,
      value: stats.trial,
    },
  ];

  /* ── Loading ──────────────────────────────────────────────────── */
  if (isLoading && tenants.length === 0) {
    return <SkeletonCard />;
  }

  /* ── Error ────────────────────────────────────────────────────── */
  if (error && tenants.length === 0) {
    return <ErrorCard message={error} onRetry={loadAll} />;
  }

  /* ── Empty ────────────────────────────────────────────────────── */
  if (!isLoading && tenants.length === 0) {
    return <EmptyCard />;
  }

  /* ── Data ─────────────────────────────────────────────────────── */
  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Ringkasan Tenant
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex flex-col items-center gap-2 sm:flex-row sm:items-start"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <item.icon className="h-5 w-5" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {item.label}
              </p>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
                {item.value.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
