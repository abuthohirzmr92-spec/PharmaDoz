"use client";

import { cn } from "@/lib/cn";
import type { WalletTransaction } from "@/types";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const sourceLabels: Record<string, string> = {
  sale: "Penjualan",
  purchase: "Pembelian",
  expense: "Biaya",
  transfer_in: "Transfer Masuk",
  transfer_out: "Transfer Keluar",
  adjustment: "Penyesuaian",
};

interface TransactionListProps {
  transactions: WalletTransaction[];
  isLoading?: boolean;
  showWallet?: boolean;
  walletNames?: Record<string, string>;
  emptyMessage?: string;
}

export function TransactionList({
  transactions,
  isLoading,
  showWallet,
  walletNames,
  emptyMessage = "Belum ada transaksi.",
}: TransactionListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800"
          />
        ))}
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-sm text-neutral-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="px-4 py-3 font-medium text-neutral-500">Tanggal</th>
              {showWallet && (
                <th className="px-4 py-3 font-medium text-neutral-500">Wallet</th>
              )}
              <th className="px-4 py-3 font-medium text-neutral-500">Deskripsi</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Tipe</th>
              <th className="px-4 py-3 font-medium text-neutral-500 text-right">Jumlah</th>
              <th className="px-4 py-3 font-medium text-neutral-500 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="bg-white hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900"
              >
                <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">
                  {formatDate(tx.transactionDate)}
                </td>
                {showWallet && (
                  <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">
                    {walletNames?.[tx.walletId] ?? tx.walletId}
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {tx.type === "credit" ? (
                      <ArrowDownCircle className="h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <ArrowUpCircle className="h-4 w-4 shrink-0 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm text-neutral-900 dark:text-neutral-50">
                        {tx.description || sourceLabels[tx.sourceType] || tx.sourceType}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {sourceLabels[tx.sourceType] || tx.sourceType}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      tx.type === "credit"
                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                        : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
                    )}
                  >
                    {tx.type === "credit" ? "Masuk" : "Keluar"}
                  </span>
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right text-sm font-medium tabular-nums",
                    tx.type === "credit" ? "text-green-600" : "text-red-600",
                  )}
                >
                  {tx.type === "credit" ? "+" : "-"}
                  {formatRupiah(tx.amount)}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums text-neutral-500">
                  {formatRupiah(tx.runningBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
