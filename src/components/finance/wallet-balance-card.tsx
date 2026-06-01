"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { Banknote, Landmark, Smartphone } from "lucide-react";
import type { FinancialWallet } from "@/types";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  cash: { icon: Banknote, label: "Kas", color: "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400" },
  bank: { icon: Landmark, label: "Bank", color: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400" },
  digital: { icon: Smartphone, label: "Digital", color: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400" },
};

interface WalletBalanceCardProps {
  wallet: FinancialWallet;
  className?: string;
}

export function WalletBalanceCard({ wallet, className }: WalletBalanceCardProps) {
  const config = typeConfig[wallet.type] ?? typeConfig.cash!;
  const Icon = config.icon;

  return (
    <Link
      href={`/finance/wallets/${wallet.id}`}
      className={cn(
        "block rounded-xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", config.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              {wallet.name}
            </h3>
            <p className="text-xs text-neutral-500">{config.label}</p>
          </div>
        </div>
        {wallet.allowOverdraft && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            OD
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-4 text-xl font-bold",
          wallet.balance >= 0
            ? "text-neutral-900 dark:text-neutral-50"
            : "text-red-600",
        )}
      >
        {formatRupiah(wallet.balance)}
      </p>
      {wallet.allowOverdraft && wallet.overdraftLimit > 0 && (
        <p className="mt-1 text-xs text-neutral-400">
          Limit overdraft: {formatRupiah(wallet.overdraftLimit)}
        </p>
      )}
    </Link>
  );
}
