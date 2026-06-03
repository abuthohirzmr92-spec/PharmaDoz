"use client";

import { useEffect, useMemo, useState } from "react";
import { useWalletStore } from "@/store/wallet-store";
import { cn } from "@/lib/cn";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n);
}

type Period = "today" | "week" | "month";

export function CashflowSummary() {
  const { transactions, loadTransactions } = useWalletStore();
  const [period, setPeriod] = useState<Period>("today");

  useEffect(() => {
    loadTransactions(undefined, { limit: 500 });
  }, []);

  const data = useMemo(() => {
    const now = new Date();
    const cutoffs: Record<Period, Date> = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getFullYear(), now.getMonth(), 1),
    };
    const cutoff = cutoffs[period];

    let inflow = 0, outflow = 0;
    for (const tx of transactions) {
      if (new Date(tx.transactionDate) < cutoff) continue;
      if (tx.type === "credit") inflow += tx.amount;
      else outflow += tx.amount;
    }
    return { inflow, outflow, net: inflow - outflow };
  }, [transactions, period]);

  const periods: { key: Period; label: string }[] = [
    { key: "today", label: "Hari Ini" },
    { key: "week", label: "Minggu Ini" },
    { key: "month", label: "Bulan Ini" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Ringkasan Arus Kas</h2>
        <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-900">
          {periods.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors",
                period === p.key ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-50" : "text-neutral-500 hover:text-neutral-700")}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700">Kas Masuk</span>
          </div>
          <p className="mt-2 text-lg font-bold text-green-800 dark:text-green-200">{formatRupiah(data.inflow)}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <span className="text-xs font-medium text-red-700">Kas Keluar</span>
          </div>
          <p className="mt-2 text-lg font-bold text-red-800 dark:text-red-200">{formatRupiah(data.outflow)}</p>
        </div>
        <div className={cn("rounded-xl border p-4",
          data.net >= 0
            ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
            : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950")}>
          <div className="flex items-center gap-2">
            <DollarSign className={cn("h-4 w-4", data.net >= 0 ? "text-blue-600" : "text-amber-600")} />
            <span className={cn("text-xs font-medium", data.net >= 0 ? "text-blue-700" : "text-amber-700")}>Net</span>
          </div>
          <p className={cn("mt-2 text-lg font-bold", data.net >= 0 ? "text-blue-800 dark:text-blue-200" : "text-amber-800 dark:text-amber-200")}>
            {data.net >= 0 ? "+" : ""}{formatRupiah(data.net)}
          </p>
        </div>
      </div>
    </div>
  );
}
