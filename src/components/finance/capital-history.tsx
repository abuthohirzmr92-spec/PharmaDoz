"use client";

import type { CapitalTransaction } from "@/types";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

interface CapitalHistoryProps {
  transactions: CapitalTransaction[];
  walletNames?: Record<string, string>;
}

export function CapitalHistory({ transactions, walletNames }: CapitalHistoryProps) {
  if (!transactions.length) {
    return <p className="text-sm text-neutral-400 py-8 text-center">Belum ada transaksi modal.</p>;
  }

  return (
    <div className="relative space-y-0 pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-neutral-200 dark:before:bg-neutral-800">
      {transactions.map((tx) => (
        <div key={tx.id} className="relative pb-4">
          <div className="absolute -left-[19px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
            {tx.type === "deposit" ? (
              <ArrowDownCircle className="h-3 w-3 text-green-500" />
            ) : (
              <ArrowUpCircle className="h-3 w-3 text-red-500" />
            )}
          </div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                {tx.type === "deposit" ? "Setor Modal" : "Tarik Modal"}
              </p>
              {tx.description && <p className="text-xs text-neutral-500">{tx.description}</p>}
              <p className="text-xs text-neutral-400">{formatDate(tx.transactionDate)}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold tabular-nums ${tx.type === "deposit" ? "text-green-600" : "text-red-600"}`}>
                {tx.type === "deposit" ? "+" : "-"}{formatRupiah(tx.amount)}
              </p>
              {tx.walletId && walletNames?.[tx.walletId] && (
                <p className="text-xs text-neutral-400">{walletNames[tx.walletId]}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
