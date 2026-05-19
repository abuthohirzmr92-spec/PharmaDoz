"use client";

import { useEffect } from "react";
import { ReceiptText } from "lucide-react";
import { useTransactionStore } from "@/store/transaction-store";
import { formatCurrencyID } from "@/lib/date-utils";

const METHOD_LABELS: Record<string, string> = {
  cash: "Tunai",
  debit: "Debit",
  credit: "Kredit",
  qris: "QRIS",
  transfer: "Transfer",
};

export function RecentTransactionsCard() {
  const loadTxns = useTransactionStore((s) => s.loadDemoTransactions);
  const isLoaded = useTransactionStore((s) => s.isLoaded);
  const isLoading = useTransactionStore((s) => s.isLoading);
  const transactions = useTransactionStore((s) => s.transactions);

  useEffect(() => {
    if (!isLoaded) loadTxns();
  }, [isLoaded, loadTxns]);

  const recent = transactions.slice(0, 5);

  if (isLoading) {
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
          Transaksi Terbaru
        </h3>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {recent.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-neutral-400">
            Belum ada transaksi
          </p>
        ) : (
          recent.map((t) => {
            const methodLabel =
              METHOD_LABELS[t.payments[0]?.method ?? ""] ?? "—";
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                <ReceiptText className="h-4 w-4 shrink-0 text-neutral-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-neutral-900 dark:text-neutral-50">
                      {t.invoiceNumber}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(t.createdAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 truncate">
                    {t.items.length} item · {t.cashierName} · {methodLabel}
                  </p>
                </div>
                <span className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
                  {formatCurrencyID(t.total)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
