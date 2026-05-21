"use client";

/* ------------------------------------------------------------------ */
/*  Branch Comparison Table                                           */
/*  Sortable table comparing all branches side-by-side                 */
/* ------------------------------------------------------------------ */

import { useEffect, useState, useMemo } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
} from "lucide-react";
import { useAnalyticsStore } from "@/store/analytics-store";
import { useTransactionStore } from "@/store/transaction-store";
import { cn } from "@/lib/cn";
import { formatCurrencyID } from "@/lib/date-utils";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { EmptyState } from "@/components/shared/empty-state";

/* ------------------------------------------------------------------ */
/*  Sort Helpers                                                       */
/* ------------------------------------------------------------------ */

type SortKey = "branchName" | "sales" | "transactions" | "avgTransaction" | "stockValue" | "lowStockAlerts";
type SortDir = "asc" | "desc";

interface SortState {
  key: SortKey;
  dir: SortDir;
}

/* ------------------------------------------------------------------ */
/*  Column Definition                                                  */
/* ------------------------------------------------------------------ */

interface Column {
  key: SortKey;
  label: string;
  sortable: boolean;
  align?: "left" | "right";
  format?: (value: number) => string;
}

const columns: Column[] = [
  { key: "branchName", label: "Cabang", sortable: true },
  { key: "sales", label: "Penjualan", sortable: true, align: "right", format: formatCurrencyID },
  { key: "transactions", label: "Transaksi", sortable: true, align: "right" },
  { key: "avgTransaction", label: "Rata-rata", sortable: true, align: "right", format: formatCurrencyID },
  { key: "stockValue", label: "Nilai Stok", sortable: true, align: "right", format: formatCurrencyID },
  { key: "lowStockAlerts", label: "Peringatan Stok", sortable: true, align: "right" },
];

/* ------------------------------------------------------------------ */
/*  Sort Icon                                                          */
/* ------------------------------------------------------------------ */

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="ml-1 h-3 w-3 shrink-0 text-neutral-400" />;
  return dir === "asc" ? (
    <ArrowUp className="ml-1 h-3 w-3 shrink-0 text-brand-500" />
  ) : (
    <ArrowDown className="ml-1 h-3 w-3 shrink-0 text-brand-500" />
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function BranchComparisonTable() {
  const comparison = useAnalyticsStore((s) => s.comparison);
  const computeComparison = useAnalyticsStore((s) => s.computeComparison);
  const computeMetrics = useAnalyticsStore((s) => s.computeBranchMetrics);
  const isLoading = useAnalyticsStore((s) => s.isLoading);

  const txnsLoaded = useTransactionStore((s) => s.isLoaded);
  const loadTxns = useTransactionStore((s) => s.loadDemoTransactions);

  const [sort, setSort] = useState<SortState>({ key: "sales", dir: "desc" });

  /* ---- Load transactions & compute on mount ---- */
  useEffect(() => {
    if (!txnsLoaded) loadTxns();
  }, [txnsLoaded, loadTxns]);

  useEffect(() => {
    if (txnsLoaded) {
      computeMetrics();
      computeComparison();
    }
  }, [txnsLoaded, computeMetrics, computeComparison]);

  /* ---- Sort data ---- */
  const sorted = useMemo(() => {
    const data = [...comparison];
    data.sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];

      // String comparison for branch name
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sort.dir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Numeric comparison
      const aNum = aVal as number;
      const bNum = bVal as number;
      return sort.dir === "asc" ? aNum - bNum : bNum - aNum;
    });
    return data;
  }, [comparison, sort]);

  /* ---- Toggle sort ---- */
  function handleSort(key: SortKey) {
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc",
    }));
  }

  /* ---- Loading state ---- */
  if (isLoading || !txnsLoaded) {
    return <TableSkeleton rows={5} />;
  }

  /* ---- Empty state ---- */
  if (comparison.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-6 w-6" />}
        title="Data tidak tersedia"
        description="Belum terdapat data cabang untuk ditampilkan."
      />
    );
  }

  /* ---- Data state ---- */
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          {/* Header */}
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500",
                    col.sortable && "cursor-pointer select-none hover:text-neutral-700 dark:hover:text-neutral-300",
                    col.align === "right" && "text-right",
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {col.sortable && (
                      <SortIcon
                        active={sort.key === col.key}
                        dir={sort.key === col.key ? sort.dir : "desc"}
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {sorted.map((row, idx) => (
              <tr
                key={row.branchId}
                className={cn(
                  "transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                  idx === 0 && "bg-brand-50/30 dark:bg-brand-950/20",
                )}
              >
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-50">
                  <span className="inline-flex items-center gap-2">
                    {row.branchName}
                    {idx === 0 && (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                        Teratas
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                  {formatCurrencyID(row.sales)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                  {row.transactions}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                  {formatCurrencyID(row.avgTransaction)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                  {formatCurrencyID(row.stockValue)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      row.lowStockAlerts > 0
                        ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                        : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
                    )}
                  >
                    {row.lowStockAlerts}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
