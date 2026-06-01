"use client";

import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useWalletStore } from "@/store/wallet-store";
import { cn } from "@/lib/cn";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

type Period = "7d" | "30d";

export function CashflowChart() {
  const [period, setPeriod] = useState<Period>("7d");
  const { transactions } = useWalletStore();

  const chartData = useMemo(() => {
    const days = period === "7d" ? 7 : 30;
    const dailyMap: Record<string, { date: string; masuk: number; keluar: number }> = {};

    // Initialize all days
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = {
        date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(d),
        masuk: 0,
        keluar: 0,
      };
    }

    // Aggregate transactions
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);

    for (const tx of transactions) {
      const txDate = new Date(tx.transactionDate);
      if (txDate < cutoff) continue;
      const key = txDate.toISOString().slice(0, 10);
      if (!dailyMap[key]) continue;

      if (tx.type === "credit") {
        dailyMap[key].masuk += tx.amount;
      } else {
        dailyMap[key].keluar += tx.amount;
      }
    }

    return Object.values(dailyMap);
  }, [transactions, period]);

  const totals = useMemo(() => {
    const masuk = chartData.reduce((s, d) => s + d.masuk, 0);
    const keluar = chartData.reduce((s, d) => s + d.keluar, 0);
    return { masuk, keluar };
  }, [chartData]);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Arus Kas
          </h3>
          <div className="flex gap-4 mt-1">
            <span className="text-xs text-green-600">
              Masuk: {formatRupiah(totals.masuk)}
            </span>
            <span className="text-xs text-red-600">
              Keluar: {formatRupiah(totals.keluar)}
            </span>
          </div>
        </div>
        <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-900">
          <button
            onClick={() => setPeriod("7d")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              period === "7d"
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-50"
                : "text-neutral-500 hover:text-neutral-700",
            )}
          >
            7 Hari
          </button>
          <button
            onClick={() => setPeriod("30d")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              period === "30d"
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-50"
                : "text-neutral-500 hover:text-neutral-700",
            )}
          >
            30 Hari
          </button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[240px] text-sm text-neutral-400">
          Belum ada data arus kas
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                return String(v);
              }}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [
                formatRupiah(Number(value) || 0),
                name === "masuk" ? "Masuk" : "Keluar",
              ]}
              contentStyle={{
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                fontSize: "0.75rem",
              }}
            />
            <Legend
              formatter={(value: string) => (value === "masuk" ? "Kas Masuk" : "Kas Keluar")}
              wrapperStyle={{ fontSize: "0.75rem" }}
            />
            <Bar dataKey="masuk" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="keluar" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
