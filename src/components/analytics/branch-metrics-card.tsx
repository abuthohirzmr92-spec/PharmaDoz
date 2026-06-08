"use client";

/* ------------------------------------------------------------------ */
/*  Branch Metrics Card                                               */
/*  Displays key performance indicators for a single branch            */
/* ------------------------------------------------------------------ */

import { useEffect, useMemo } from "react";
import { DollarSign, Receipt, TrendingUp, Store, ArrowRight } from "lucide-react";
import { useAnalyticsStore } from "@/store/analytics-store";
import { useBranchStore } from "@/store/branch-store";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { cn } from "@/lib/cn";
import { formatCurrencyID } from "@/lib/date-utils";
import { CardSkeleton } from "@/components/shared/card-skeleton";
import { EmptyState } from "@/components/shared/empty-state";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface BranchMetricsCardProps {
  branchId: string;
  onDetail?: (branchId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Metric Row Helper                                                  */
/* ------------------------------------------------------------------ */

interface MetricItem {
  label: string;
  icon: typeof DollarSign;
  value: string | number;
}

function MetricRow({ item }: { item: MetricItem }) {
  const Icon = item.icon;
  return (
    <div className="flex items-start gap-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-neutral-800">
        <Icon className="h-4 w-4 text-brand-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          {item.label}
        </p>
        <p className="mt-0.5 text-base font-bold tabular-nums text-neutral-900 dark:text-neutral-50">
          {item.value}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function BranchMetricsCard({ branchId, onDetail }: BranchMetricsCardProps) {
  const branchMetrics = useAnalyticsStore((s) => s.branchMetrics);
  const computeBranchMetrics = useAnalyticsStore((s) => s.computeBranchMetrics);
  const isLoading = useAnalyticsStore((s) => s.isLoading);

  const txnsLoaded = useTransactionStore((s) => s.isLoaded);
  const loadTxns = useTransactionStore((s) => s.loadDemoTransactions);
  const transactions = useTransactionStore((s) => s.transactions);
  const saleAllocations = useInventoryStore((s) => s.saleAllocations);

  const branches = useBranchStore((s) => s.branches);

  const branchName = useMemo(
    () => branches.find((b) => b.id === branchId)?.name ?? "Cabang",
    [branches, branchId],
  );

  /* ---- Load transactions on mount if not yet loaded ---- */
  useEffect(() => {
    if (!txnsLoaded) loadTxns();
  }, [txnsLoaded, loadTxns]);

  /* ---- Compute metrics once transactions are available ---- */
  useEffect(() => {
    if (txnsLoaded) {
      computeBranchMetrics();
    }
  }, [txnsLoaded, computeBranchMetrics]);

  /* ---- Derive the metric for this specific branch ---- */
  const metric = useMemo(
    () => branchMetrics.find((m) => m.branchId === branchId),
    [branchMetrics, branchId],
  );

  /* ---- Per-branch profit from allocations ---- */
  const profit = useMemo(() => {
    const branchTxns = transactions.filter((t) => t.pharmacyId === branchId);
    const branchTxnIds = new Set(branchTxns.map((t) => t.id));
    const allocMap = new Map<string, number>();
    for (const a of saleAllocations) {
      if (branchTxnIds.has(a.transactionId)) {
        allocMap.set(
          a.transactionId,
          (allocMap.get(a.transactionId) ?? 0) + a.quantity * a.costPrice,
        );
      }
    }
    const totalHpp = Array.from(allocMap.values()).reduce((s, v) => s + v, 0);
    const revenue = branchTxns.reduce((s, t) => s + t.total, 0);
    return revenue - totalHpp;
  }, [transactions, saleAllocations, branchId]);

  /* ---- Loading state ---- */
  if (isLoading || !txnsLoaded) {
    return (
      <div className="space-y-3">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  /* ---- Empty state ---- */
  if (!metric || metric.transactionCount === 0) {
    return (
      <EmptyState
        icon={<Store className="h-6 w-6" />}
        title="Tidak ada data untuk cabang ini"
        description="Belum terdapat transaksi atau stok yang tercatat."
        className="min-h-[200px]"
      />
    );
  }

  /* ---- Data state ---- */
  const items: MetricItem[] = [
    {
      label: "Total Penjualan",
      icon: DollarSign,
      value: formatCurrencyID(metric.totalSales),
    },
    {
      label: "Profit",
      icon: TrendingUp,
      value: profit > 0 || metric.totalSales > 0 ? formatCurrencyID(profit) : "—",
    },
    {
      label: "Jumlah Transaksi",
      icon: Receipt,
      value: metric.transactionCount,
    },
    {
      label: "Nilai Stok",
      icon: Store,
      value: formatCurrencyID(metric.stockValue),
    },
  ];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          {branchName}
        </h3>
      </div>

      {/* 2x2 Metric Grid */}
      <div className="grid grid-cols-2 gap-3 p-4">
        {items.map((item) => (
          <MetricRow key={item.label} item={item} />
        ))}
      </div>

      {/* Detail button (optional) */}
      {onDetail && (
        <div className="border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
          <button
            onClick={() => onDetail(branchId)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 py-2 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
          >
            Detail
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
