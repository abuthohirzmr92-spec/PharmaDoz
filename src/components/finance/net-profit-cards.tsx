"use client";

import { useMemo, useEffect } from "react";
import { useTransactionStore } from "@/store/transaction-store";
import { useWalletStore } from "@/store/wallet-store";
import { cn } from "@/lib/cn";
import { DollarSign, TrendingUp, TrendingDown, Receipt } from "lucide-react";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export function NetProfitCards() {
  const { transactions } = useTransactionStore();
  const { transactions: walletTxns, loadTransactions } = useWalletStore();

  useEffect(() => { loadTransactions(undefined, { limit: 500 }); }, []);

  const data = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today
    const todayTxns = transactions.filter((t) => new Date(t.createdAt) >= today);
    const todayWallet = walletTxns.filter((t) => new Date(t.transactionDate) >= today && t.type === "debit" && t.sourceType === "expense");
    const todayRevenue = todayTxns.reduce((s, t) => s + t.total, 0);
    const todayExpense = todayWallet.reduce((s, t) => s + t.amount, 0);

    // HPP estimation from transactions (sales_items with cost)
    const todayHpp = todayTxns.reduce((s, t) => s + t.items.reduce((si, i) => si + (i.unitPrice * 0.6) * i.quantity, 0), 0);
    const todayGp = todayRevenue - todayHpp;
    const todayNp = todayGp - todayExpense;

    // Month
    const monthTxns = transactions.filter((t) => new Date(t.createdAt) >= monthStart);
    const monthWallet = walletTxns.filter((t) => new Date(t.transactionDate) >= monthStart && t.type === "debit" && t.sourceType === "expense");
    const monthRevenue = monthTxns.reduce((s, t) => s + t.total, 0);
    const monthExpense = monthWallet.reduce((s, t) => s + t.amount, 0);
    const monthHpp = monthTxns.reduce((s, t) => s + t.items.reduce((si, i) => si + (i.unitPrice * 0.6) * i.quantity, 0), 0);
    const monthGp = monthRevenue - monthHpp;
    const monthNp = monthGp - monthExpense;

    return { todayRevenue, todayHpp, todayGp, todayExpense, todayNp, monthRevenue, monthHpp, monthGp, monthExpense, monthNp };
  }, [transactions, walletTxns]);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Profit Harian</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Revenue", value: data.todayRevenue, icon: DollarSign, color: "blue" },
          { label: "HPP", value: data.todayHpp, icon: Receipt, color: "neutral" },
          { label: "Gross Profit", value: data.todayGp, icon: TrendingUp, color: "green" },
          { label: "Biaya", value: data.todayExpense, icon: TrendingDown, color: "amber" },
          { label: "Net Profit", value: data.todayNp, icon: DollarSign, color: data.todayNp >= 0 ? "green" : "red" },
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

      <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mt-4">Profit Bulanan</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Revenue", value: data.monthRevenue },
          { label: "HPP", value: data.monthHpp },
          { label: "Gross Profit", value: data.monthGp },
          { label: "Biaya", value: data.monthExpense },
          { label: "Net Profit", value: data.monthNp },
        ].map((c, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <p className="text-[10px] text-neutral-500">{c.label}</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-neutral-900 dark:text-neutral-50">{formatRupiah(c.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
