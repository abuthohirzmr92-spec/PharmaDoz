"use client";

import { useEffect, useMemo } from "react";
import { Package, TrendingUp } from "lucide-react";
import { useSuperAdminStore } from "@/store/super-admin-store";
import { getPackageLabel } from "@/lib/billing/package-limits";
import { cn } from "@/lib/cn";
import type { TenantPackage } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PackageStat {
  packageName: TenantPackage;
  count: number;
  percentage: number;
}

/* ------------------------------------------------------------------ */
/*  Package colours                                                    */
/* ------------------------------------------------------------------ */

const PACKAGE_STYLE: Record<TenantPackage, { bar: string; text: string; bg: string }> = {
  basic: {
    bar: "bg-neutral-400 dark:bg-neutral-500",
    text: "text-neutral-700 dark:text-neutral-300",
    bg: "bg-neutral-100 dark:bg-neutral-800",
  },
  professional: {
    bar: "bg-blue-500 dark:bg-blue-400",
    text: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  enterprise: {
    bar: "bg-purple-500 dark:bg-purple-400",
    text: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
};

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function SkeletonPackage() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-3 w-12 rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
      <div className="h-3 w-full rounded-full bg-neutral-200 dark:bg-neutral-700" />
      <div className="h-2.5 w-10 rounded bg-neutral-200 dark:bg-neutral-700" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <div className="h-4 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonPackage key={i} />
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
        Belum ada data langganan
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Package row                                                        */
/* ------------------------------------------------------------------ */

function PackageRow({ packageName, count, percentage }: PackageStat) {
  const style = PACKAGE_STYLE[packageName];
  const label = getPackageLabel(packageName);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className={cn("text-sm font-medium", style.text)}>
          {label}
        </span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {count.toLocaleString("id-ID")} tenant
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={cn("h-full rounded-full transition-all duration-300", style.bar)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <span className="mt-0.5 block text-[10px] text-neutral-400 dark:text-neutral-500">
        {percentage}%
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function SubscriptionOverview() {
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

  const packages = useMemo((): PackageStat[] => {
    if (tenants.length === 0) return [];

    const counts: Record<string, number> = {};
    for (const t of tenants) {
      const pkg = t.packageName;
      counts[pkg] = (counts[pkg] ?? 0) + 1;
    }

    const total = tenants.length;
    const allPackages: TenantPackage[] = ["basic", "professional", "enterprise"];

    return allPackages.map((pkg) => ({
      packageName: pkg,
      count: counts[pkg] ?? 0,
      percentage: total > 0 ? Math.round(((counts[pkg] ?? 0) / total) * 100) : 0,
    }));
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
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Distribusi Paket
          </h3>
        </div>
      </div>
      <div className="space-y-5 p-4">
        {packages.map((pkg) => (
          <PackageRow key={pkg.packageName} {...pkg} />
        ))}
      </div>
    </div>
  );
}
