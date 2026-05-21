"use client";

import { useEffect, useMemo } from "react";
import { Users, Store, Package } from "lucide-react";
import { useSuperAdminStore } from "@/store/super-admin-store";
import { PACKAGE_DEFAULTS } from "@/lib/billing/package-limits";
import { cn } from "@/lib/cn";
import type { TenantPackage } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface QuotaItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  current: number;
  max: number;
}

/* ------------------------------------------------------------------ */
/*  Colour helpers                                                     */
/* ------------------------------------------------------------------ */

function getBarColor(percent: number): string {
  if (percent > 0.85) return "bg-red-500";
  if (percent >= 0.6) return "bg-amber-500";
  return "bg-emerald-500";
}

function getTextColor(percent: number): string {
  if (percent > 0.85) return "text-red-600 dark:text-red-400";
  if (percent >= 0.6) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function SkeletonQuotaItem() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-3 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
      <div className="h-2 w-full animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonQuotaItem key={i} />
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
      <Package className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-600" />
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Belum ada data kuota
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quota progress bar                                                 */
/* ------------------------------------------------------------------ */

function QuotaBar({ label, current, max, icon: Icon }: QuotaItem) {
  const percent = max > 0 ? current / max : 0;
  const displayPercent = Math.round(percent * 100);

  return (
    <div>
      {/* Label row */}
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-neutral-400" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400">
            {label}
          </span>
        </div>
        <span className={cn("text-xs font-medium tabular-nums", getTextColor(percent))}>
          {current.toLocaleString("id-ID")} / {max.toLocaleString("id-ID")}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            getBarColor(percent),
          )}
          style={{ width: `${Math.min(displayPercent, 100)}%` }}
        />
      </div>

      <span className="mt-0.5 block text-[10px] text-neutral-400 dark:text-neutral-500">
        {displayPercent}% terpakai
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function QuotaOverview() {
  const tenants = useSuperAdminStore((s) => s.tenants);
  const isLoading = useSuperAdminStore((s) => s.isLoading);
  const error = useSuperAdminStore((s) => s.error);
  const loadTenants = useSuperAdminStore((s) => s.loadTenants);

  useEffect(() => {
    if (tenants.length === 0 && !isLoading && !error) {
      loadTenants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quotaItems = useMemo((): QuotaItem[] => {
    if (tenants.length === 0) return [];

    let totalUsers = 0;
    let totalBranches = 0;
    let maxUsers = 0;
    let maxBranches = 0;
    let maxProducts = 0;

    for (const t of tenants) {
      const pkg = t.packageName as TenantPackage;
      const limits = PACKAGE_DEFAULTS[pkg] ?? PACKAGE_DEFAULTS.basic;

      totalUsers += t.userCount;
      totalBranches += t.branchCount;
      maxUsers += limits.maxUsers;
      maxBranches += limits.maxBranches;
      maxProducts += limits.maxProducts;
    }

    return [
      {
        key: "users",
        label: "Pengguna",
        icon: Users,
        current: totalUsers,
        max: maxUsers,
      },
      {
        key: "branches",
        label: "Cabang",
        icon: Store,
        current: totalBranches,
        max: maxBranches,
      },
      {
        key: "products",
        label: "Produk",
        icon: Package,
        current: 0,
        max: maxProducts,
      },
    ];
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
          Penggunaan Kuota
        </h3>
      </div>
      <div className="space-y-5 p-4">
        {quotaItems.map(({ key, ...item }) => (
          <QuotaBar key={key} {...item} />
        ))}
      </div>
    </div>
  );
}
