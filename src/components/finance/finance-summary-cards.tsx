"use client";

import { useWalletStore } from "@/store/wallet-store";
import { useEffect, useMemo } from "react";
import { cn } from "@/lib/cn";
import { Wallet, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
  className?: string;
}

function SummaryCard({ label, value, icon, trend, className }: SummaryCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-500">{label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        {value}
      </p>
      {trend && (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            trend.positive ? "text-green-600" : "text-red-600",
          )}
        >
          {trend.positive ? "↑" : "↓"} {trend.value}
        </p>
      )}
    </div>
  );
}

export function FinanceSummaryCards() {
  const { wallets, transactions, loadWallets, loadTransactions, getTotalBalance, getInflowSummary, getOutflowSummary } =
    useWalletStore();

  useEffect(() => {
    loadWallets();
    loadTransactions(undefined, { limit: 500 });
  }, [loadWallets, loadTransactions]);

  const totalBalance = getTotalBalance();
  const inflowToday = getInflowSummary(1);
  const outflowToday = getOutflowSummary(1);
  const inflowMonth = getInflowSummary(30);
  const outflowMonth = getOutflowSummary(30);

  const transferCount = useMemo(
    () => transactions.filter((t) => t.sourceType === "transfer_in" || t.sourceType === "transfer_out").length,
    [transactions],
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <SummaryCard
        label="Total Saldo"
        value={formatRupiah(totalBalance)}
        icon={<Wallet className="h-4 w-4" />}
        trend={
          totalBalance > 0
            ? { value: `${wallets.filter((w) => !w.isArchived).length} wallet aktif`, positive: true }
            : undefined
        }
      />
      <SummaryCard
        label="Kas Masuk Hari Ini"
        value={formatRupiah(inflowToday)}
        icon={<TrendingUp className="h-4 w-4" />}
        trend={{ value: `Bulan ini: ${formatRupiah(inflowMonth)}`, positive: true }}
      />
      <SummaryCard
        label="Kas Keluar Hari Ini"
        value={formatRupiah(outflowToday)}
        icon={<TrendingDown className="h-4 w-4" />}
        trend={{ value: `Bulan ini: ${formatRupiah(outflowMonth)}`, positive: false }}
      />
      <SummaryCard
        label="Transfer"
        value={String(transferCount)}
        icon={<ArrowRightLeft className="h-4 w-4" />}
      />
    </div>
  );
}
