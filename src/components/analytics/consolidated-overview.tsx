"use client";

/* ------------------------------------------------------------------ */
/*  Consolidated Overview                                             */
/*  Hero stats row + branch comparison table for tenant owners         */
/* ------------------------------------------------------------------ */

import { useEffect, useMemo } from "react";
import {
  DollarSign,
  Receipt,
  TrendingUp,
  Store,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { useAnalyticsStore } from "@/store/analytics-store";
import { useTransactionStore } from "@/store/transaction-store";
import { useBranchStore } from "@/store/branch-store";
import { formatCurrencyID } from "@/lib/date-utils";
import { CardSkeleton } from "@/components/shared/card-skeleton";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { BranchComparisonTable } from "./branch-comparison-table";

/* ------------------------------------------------------------------ */
/*  Hero Stat Card                                                     */
/* ------------------------------------------------------------------ */

interface HeroStat {
  label: string;
  icon: typeof DollarSign;
  value: string | number;
  subtext?: string;
}

function HeroStatCard({ stat }: { stat: HeroStat }) {
  const Icon = stat.icon;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950">
          <Icon className="h-5 w-5 text-brand-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            {stat.label}
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-neutral-900 dark:text-neutral-50">
            {stat.value}
          </p>
          {stat.subtext && (
            <p className="mt-0.5 text-[11px] text-neutral-400">{stat.subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero Stats Loading Skeletons                                       */
/* ------------------------------------------------------------------ */

function HeroStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ConsolidatedOverview() {
  const consolidated = useAnalyticsStore((s) => s.consolidated);
  const computeAll = useAnalyticsStore((s) => s.computeAll);
  const isLoading = useAnalyticsStore((s) => s.isLoading);

  const txnsLoaded = useTransactionStore((s) => s.isLoaded);
  const loadTxns = useTransactionStore((s) => s.loadDemoTransactions);

  const branches = useBranchStore((s) => s.branches);
  const branchError = useBranchStore((s) => s.error);

  /* ---- Load dependencies on mount ---- */
  useEffect(() => {
    if (!txnsLoaded) loadTxns();
  }, [txnsLoaded, loadTxns]);

  /* ---- Compute consolidated once transactions are ready ---- */
  useEffect(() => {
    if (txnsLoaded) {
      computeAll();
    }
  }, [txnsLoaded, computeAll]);

  /* ---- Derived data (MUST be before all early returns — Rules of Hooks) ---- */
  const heroStats: HeroStat[] = useMemo(
    () => {
      if (!consolidated) return [];
      return [
        {
          label: "Total Penjualan",
          icon: DollarSign,
          value: formatCurrencyID(consolidated.totalSales),
          subtext: `${consolidated.branchCount} cabang`,
        },
        {
          label: "Total Transaksi",
          icon: Receipt,
          value: consolidated.totalTransactions,
          subtext: consolidated.topSellingProduct
            ? `Produk teratas: ${consolidated.topSellingProduct}`
            : undefined,
        },
        {
          label: "Rata-rata Harian",
          icon: TrendingUp,
          value: formatCurrencyID(consolidated.averageDailySales),
          subtext: "Perkiraan berdasarkan rentang data",
        },
        {
          label: "Cabang Aktif",
          icon: Store,
          value: `${consolidated.activeBranchCount} / ${consolidated.branchCount}`,
          subtext:
            consolidated.activeBranchCount < consolidated.branchCount
              ? `${consolidated.branchCount - consolidated.activeBranchCount} cabang tidak aktif`
              : "Semua cabang aktif",
        },
      ];
    },
    [consolidated],
  );

  /* ---- Error state ---- */
  if (branchError) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-6 w-6" />}
        title="Gagal memuat data"
        description={branchError}
        action={
          <button
            onClick={() => computeAll()}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </button>
        }
      />
    );
  }

  /* ---- Loading state ---- */
  if (isLoading || !txnsLoaded) {
    return (
      <div className="space-y-6">
        <HeroStatsSkeleton />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  /* ---- Empty state ---- */
  if (!consolidated || consolidated.totalTransactions === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-6 w-6" />}
        title="Data tidak tersedia"
        description="Belum terdapat data transaksi untuk ditampilkan."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {heroStats.map((stat) => (
          <HeroStatCard key={stat.label} stat={stat} />
        ))}
      </div>

      {/* Section: Nilai Stok Overview */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-50 dark:bg-neutral-800">
            <Store className="h-5 w-5 text-neutral-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Total Nilai Stok
            </p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-neutral-900 dark:text-neutral-50">
              {formatCurrencyID(consolidated.totalStockValue)}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-400">
              {consolidated.branches.reduce((s, b) => s + b.lowStockCount, 0)} peringatan stok menipis di seluruh cabang
            </p>
          </div>
        </div>
      </div>

      {/* Branch Comparison */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Perbandingan Cabang
        </h3>
        <BranchComparisonTable />
      </div>
    </div>
  );
}
