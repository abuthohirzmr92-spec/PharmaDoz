"use client";

import { useEffect, useMemo, useState } from "react";
import { useTransactionStore } from "@/store/transaction-store";
import { useWalletStore } from "@/store/wallet-store";
import { useInventoryStore } from "@/store/inventory-store";
import { computeHppFromAllocations } from "@/lib/finance/hpp-engine";
import { cn } from "@/lib/cn";
import { DollarSign, TrendingUp, TrendingDown, Receipt, AlertTriangle } from "lucide-react";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export function NetProfitCards() {
  const { transactions } = useTransactionStore();
  const { transactions: walletTxns, loadTransactions: loadWalletTxns } = useWalletStore();
  const allocations = useInventoryStore((s) => s.saleAllocations);
  const isDemo = useInventoryStore((s) => s.isDemoMode);
  const loadInv = useInventoryStore((s) => s.loadDemoData);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadWalletTxns(undefined, { limit: 500 });
    if (allocations.length === 0) loadInv();
    setIsLoaded(true);
  }, []);

  // Build allocation map from store data
  const allocationMap = useMemo(() => {
    const map = new Map<string, Array<{ quantity: number; costPrice: number }>>();
    for (const a of allocations) {
      const arr = map.get(a.transactionId) ?? [];
      arr.push({ quantity: a.quantity, costPrice: a.costPrice });
      map.set(a.transactionId, arr);
    }
    return map;
  }, [allocations]);

  const data = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayTxns = transactions.filter((t) => new Date(t.createdAt) >= today);
    const monthTxns = transactions.filter((t) => new Date(t.createdAt) >= monthStart);

    const todayWallet = walletTxns.filter((t) =>
      new Date(t.transactionDate) >= today && t.type === "debit" && t.sourceType === "expense",
    );
    const monthWallet = walletTxns.filter((t) =>
      new Date(t.transactionDate) >= monthStart && t.type === "debit" && t.sourceType === "expense",
    );

    // REAL HPP from FEFO allocations
    const todayHpp = todayTxns.reduce((s, t) => {
      const allocs = allocationMap.get(t.id);
      return s + (allocs ? computeHppFromAllocations(allocs) : 0);
    }, 0);
    const monthHpp = monthTxns.reduce((s, t) => {
      const allocs = allocationMap.get(t.id);
      return s + (allocs ? computeHppFromAllocations(allocs) : 0);
    }, 0);

    const todayRevenue = todayTxns.reduce((s, t) => s + t.total, 0);
    const monthRevenue = monthTxns.reduce((s, t) => s + t.total, 0);
    const todayExpense = todayWallet.reduce((s, t) => s + t.amount, 0);
    const monthExpense = monthWallet.reduce((s, t) => s + t.amount, 0);
    const todayGp = todayRevenue - todayHpp;
    const monthGp = monthRevenue - monthHpp;
    const todayNp = todayGp - todayExpense;
    const monthNp = monthGp - monthExpense;

    return { todayRevenue, todayHpp, todayGp, todayExpense, todayNp, monthRevenue, monthHpp, monthGp, monthExpense, monthNp };
  }, [transactions, walletTxns, allocationMap]);

  const hasAllocations = allocations.length > 0;

  if (!isLoaded) return null;

  return (
    <div className="space-y-4">
      {!hasAllocations && !isDemo && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Profit FEFO belum tersedia untuk transaksi lama. HPP akan tampil setelah transaksi baru tercatat.
        </div>
      )}

      {[
        { label: "Hari Ini", rev: data.todayRevenue, hpp: data.todayHpp, gp: data.todayGp, exp: data.todayExpense, np: data.todayNp },
        { label: "Bulan Ini", rev: data.monthRevenue, hpp: data.monthHpp, gp: data.monthGp, exp: data.monthExpense, np: data.monthNp },
      ].map((period) => (
        <div key={period.label}>
          <h2 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">{period.label}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Revenue", value: period.rev, icon: DollarSign, color: "blue" },
              { label: "HPP", value: period.hpp, icon: Receipt, color: "neutral" },
              { label: "Gross Profit", value: period.gp, icon: TrendingUp, color: period.gp >= 0 ? "green" : "red" },
              { label: "Biaya", value: period.exp, icon: TrendingDown, color: "amber" },
              { label: "Net Profit", value: period.np, icon: DollarSign, color: period.np >= 0 ? "green" : "red" },
            ].map((c) => (
              <div key={c.label} className={cn("rounded-xl border p-3 bg-white dark:bg-neutral-950",
                c.color === "green" ? "border-green-200 dark:border-green-800" :
                c.color === "red" ? "border-red-200 dark:border-red-800" :
                c.color === "amber" ? "border-amber-200 dark:border-amber-800" :
                c.color === "blue" ? "border-blue-200 dark:border-blue-800" :
                "border-neutral-200 dark:border-neutral-800")}>
                <p className="text-[10px] text-neutral-500">{c.label}</p>
                <p className={cn("mt-1 text-sm font-bold tabular-nums",
                  c.color === "green" ? "text-green-700 dark:text-green-300" :
                  c.color === "red" ? "text-red-700 dark:text-red-300" :
                  "text-neutral-900 dark:text-neutral-50")}>
                  {formatRupiah(c.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
