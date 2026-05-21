"use client";

import { useEffect, useMemo } from "react";
import { Store, Package } from "lucide-react";
import { useSuperAdminStore } from "@/store/super-admin-store";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PackageBreakdown {
  label: string;
  count: number;
  color: string;
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
      <div className="p-4">
        <div className="mb-4">
          <div className="mx-auto h-12 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700"
            />
          ))}
        </div>
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
      <Store className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-600" />
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Belum ada data cabang
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function BranchStatsCard() {
  const tenants = useSuperAdminStore((s) => s.tenants);
  const isLoading = useSuperAdminStore((s) => s.isLoading);
  const error = useSuperAdminStore((s) => s.error);
  const loadTenants = useSuperAdminStore((s) => s.loadTenants);

  /* Auto-load on mount */
  useEffect(() => {
    if (tenants.length === 0 && !isLoading && !error) {
      loadTenants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { totalBranches, breakdown } = useMemo(() => {
    const totalBranches = tenants.reduce((sum, t) => sum + t.branchCount, 0);

    const byPackage: Record<string, number> = {};
    for (const t of tenants) {
      const pkg = t.packageName;
      byPackage[pkg] = (byPackage[pkg] ?? 0) + t.branchCount;
    }

    const breakdown: PackageBreakdown[] = [
      {
        label: "Basic",
        count: byPackage["basic"] ?? 0,
        color: "text-neutral-700 dark:text-neutral-300",
      },
      {
        label: "Professional",
        count: byPackage["professional"] ?? 0,
        color: "text-blue-700 dark:text-blue-300",
      },
      {
        label: "Enterprise",
        count: byPackage["enterprise"] ?? 0,
        color: "text-purple-700 dark:text-purple-300",
      },
    ];

    return { totalBranches, breakdown };
  }, [tenants]);

  /* ── Loading ──────────────────────────────────────────────────── */
  if (isLoading && tenants.length === 0) {
    return <SkeletonCard />;
  }

  /* ── Error ────────────────────────────────────────────────────── */
  if (error && tenants.length === 0) {
    return <ErrorCard message={error} onRetry={loadTenants} />;
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
          Statistik Cabang
        </h3>
      </div>
      <div className="p-4">
        {/* Hero number */}
        <div className="mb-4 text-center">
          <Store className="mx-auto h-5 w-5 text-neutral-400 dark:text-neutral-500" />
          <p className="mt-1 text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            {totalBranches.toLocaleString("id-ID")}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Total Cabang
          </p>
        </div>

        {/* Per-package breakdown */}
        <div className="space-y-2">
          {breakdown.map((pkg) => (
            <div
              key={pkg.label}
              className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800/50"
            >
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-neutral-400" />
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  {pkg.label}
                </span>
              </div>
              <span
                className={cn("text-sm font-semibold tabular-nums", pkg.color)}
              >
                {pkg.count.toLocaleString("id-ID")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
