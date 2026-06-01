"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { TrendingUp, ShoppingCart, DollarSign, Percent } from "lucide-react";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { computeGrossProfit, formatRupiah } from "@/lib/finance/profit-engine";

function Card({ label, value, icon, sub, accent }: {
  label: string; value: string; icon: React.ReactNode; sub?: string; accent?: "green" | "amber" | "default";
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-500">{label}</span>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg",
          accent === "green" ? "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400" :
          accent === "amber" ? "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400" :
          "bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400"
        )}>{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold text-neutral-900 dark:text-neutral-50">{value}</p>
      {sub && <p className="mt-1 text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}

export function ProfitSummaryCards({ capitalBalance }: { capitalBalance: number }) {
  const { transactions } = useTransactionStore();
  const batches = useInventoryStore((s) => (s as any).batches ?? []);

  // Get last 30 days transactions
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentTxns = useMemo(
    () => transactions.filter((t) => new Date(t.createdAt) >= thirtyDaysAgo),
    [transactions],
  );

  const profit = useMemo(
    () => computeGrossProfit(recentTxns, batches),
    [recentTxns, batches],
  );

  const roi = capitalBalance > 0 ? Math.round((profit.grossProfit / capitalBalance) * 10000) / 100 : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card label="Omset 30 Hari" value={formatRupiah(profit.revenue)} icon={<ShoppingCart className="h-4 w-4" />} />
      <Card label="HPP 30 Hari" value={formatRupiah(profit.cogs)} icon={<DollarSign className="h-4 w-4" />} sub="Harga Pokok Penjualan" />
      <Card label="Profit Kotor" value={formatRupiah(profit.grossProfit)} icon={<TrendingUp className="h-4 w-4" />}
        sub={`Margin ${profit.marginPct}%`} accent="green" />
      <Card label="ROI" value={`${roi}%`} icon={<Percent className="h-4 w-4" />}
        sub={roi > 20 ? "Sangat Baik" : roi > 5 ? "Baik" : "Perlu Ditingkatkan"} accent={roi > 10 ? "green" : "amber"} />
    </div>
  );
}
