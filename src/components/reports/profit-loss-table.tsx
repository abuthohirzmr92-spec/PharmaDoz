"use client";

import { useState, useMemo, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { computePAndL } from "@/lib/report-aggregate";
import { resolveDateRange, formatCurrencyID } from "@/lib/date-utils";
import { ReportDateFilter } from "./report-date-filter";
import type { DateRange } from "@/types/report";
import { cn } from "@/lib/cn";

type GroupBy = "day" | "month";

export function ProfitLossTable() {
  const loadTxns = useTransactionStore((s) => s.loadDemoTransactions);
  const isLoaded = useTransactionStore((s) => s.isLoaded);
  const isLoading = useTransactionStore((s) => s.isLoading);
  const transactions = useTransactionStore((s) => s.transactions);

  const loadInv = useInventoryStore((s) => s.loadDemoData);
  const batches = useInventoryStore((s) => s.batches);

  useEffect(() => {
    if (!isLoaded) loadTxns();
  }, [isLoaded, loadTxns]);

  useEffect(() => {
    if (batches.length === 0) loadInv();
  }, [batches.length, loadInv]);

  const [dateRange, setDateRange] = useState<DateRange>(() => resolveDateRange("thisMonth"));
  const [groupBy, setGroupBy] = useState<GroupBy>("day");

  // Filter transactions by date range
  const filteredTxns = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.createdAt);
      return d >= dateRange.from && d <= dateRange.to;
    });
  }, [transactions, dateRange]);

  const rows = useMemo(
    () => computePAndL(filteredTxns, batches, groupBy),
    [filteredTxns, batches, groupBy],
  );

  const totals = useMemo(() => {
    return rows.reduce(
      (s, r) => ({
        revenue: s.revenue + r.revenue,
        cogs: s.cogs + r.cogs,
        grossProfit: s.grossProfit + r.grossProfit,
      }),
      { revenue: 0, cogs: 0, grossProfit: 0 },
    );
  }, [rows]);

  const overallMargin = totals.revenue > 0
    ? Math.round((totals.grossProfit / totals.revenue) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          { label: "Pendapatan", value: formatCurrencyID(totals.revenue), cls: "text-green-700" },
          { label: "HPP", value: formatCurrencyID(totals.cogs), cls: "text-red-700" },
          { label: "Laba Kotor", value: formatCurrencyID(totals.grossProfit), cls: totals.grossProfit >= 0 ? "text-green-700" : "text-red-700" },
          { label: "Margin", value: `${overallMargin}%`, cls: overallMargin >= 30 ? "text-green-700" : overallMargin >= 15 ? "text-amber-700" : "text-red-700" },
        ]).map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
            <span className="text-[10px] text-neutral-500">{s.label}</span>
            <p className={cn("mt-0.5 text-sm font-bold tabular-nums", s.cls)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ReportDateFilter range={dateRange} onChange={setDateRange} />
        <div className="flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
          {([
            { label: "Harian", value: "day" as const },
            { label: "Bulanan", value: "month" as const },
          ]).map((v) => (
            <button
              key={v.value}
              onClick={() => setGroupBy(v.value)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                groupBy === v.value
                  ? "bg-brand-600 text-white"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="w-[22%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Periode</th>
              <th className="w-[20%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Pendapatan</th>
              <th className="w-[20%] hidden sm:table-cell px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">HPP</th>
              <th className="w-[20%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Laba Kotor</th>
              <th className="w-[18%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-neutral-400">
                  <TrendingUp className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Tidak ada data untuk periode ini
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.period} className="group">
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-medium text-neutral-900 dark:text-neutral-50">
                      {groupBy === "month"
                        ? new Date(row.period + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })
                        : new Date(row.period).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs tabular-nums text-green-600">
                      {formatCurrencyID(row.revenue)}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-3 py-2.5 text-right">
                    <span className="text-xs tabular-nums text-red-500">
                      {formatCurrencyID(row.cogs)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={cn("text-xs font-semibold tabular-nums", row.grossProfit >= 0 ? "text-green-600" : "text-red-600")}>
                      {row.grossProfit >= 0 ? "+" : ""}{formatCurrencyID(row.grossProfit)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={cn("text-xs font-medium tabular-nums", row.marginPercent >= 30 ? "text-green-600" : row.marginPercent >= 10 ? "text-amber-600" : "text-red-600")}>
                      {row.marginPercent}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[10px] text-neutral-400">
        * HPP dihitung dari rata-rata harga beli batch per produk (data demo)
      </p>
    </div>
  );
}
