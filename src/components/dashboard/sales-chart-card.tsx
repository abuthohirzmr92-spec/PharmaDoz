"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTransactionStore } from "@/store/transaction-store";
import { computeSalesTrend } from "@/lib/report-aggregate";
import { resolveDateRange } from "@/lib/date-utils";

export function SalesChartCard() {
  const [mounted, setMounted] = useState(false);
  const loadTxns = useTransactionStore((s) => s.loadDemoTransactions);
  const isLoaded = useTransactionStore((s) => s.isLoaded);
  const isLoading = useTransactionStore((s) => s.isLoading);
  const transactions = useTransactionStore((s) => s.transactions);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) loadTxns();
  }, [isLoaded, loadTxns]);

  const range = useMemo(() => resolveDateRange("last7"), []);
  const trend = useMemo(() => computeSalesTrend(transactions, range), [transactions, range]);
  const hasData = useMemo(() => trend.some((d) => d.total > 0), [trend]);

  if (!mounted || isLoading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Tren Penjualan 7 Hari Terakhir
        </h3>
      </div>
      <div className="px-2 py-3">
        {!hasData ? (
          <p className="py-8 text-center text-xs text-neutral-400">
            Belum ada data penjualan
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}rb`}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                }}
                formatter={(value) => [
                  `Rp ${Number(value).toLocaleString("id-ID")}`,
                  "Penjualan",
                ]}
              />
              <Bar
                dataKey="total"
                fill="var(--color-brand-500, #3b82f6)"
                radius={[3, 3, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
