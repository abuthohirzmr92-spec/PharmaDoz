"use client";

import { useEffect, useMemo } from "react";
import { useTransactionStore } from "@/store/transaction-store";
import { formatCurrencyID } from "@/lib/date-utils";
import { cn } from "@/lib/cn";
import { TableSkeleton } from "@/components/shared/table-skeleton";

export function TopProductsCard() {
  const loadTxns = useTransactionStore((s) => s.loadDemoTransactions);
  const isLoaded = useTransactionStore((s) => s.isLoaded);
  const isLoading = useTransactionStore((s) => s.isLoading);
  const transactions = useTransactionStore((s) => s.transactions);
  const getTopProducts = useTransactionStore((s) => s.getTopProducts);

  useEffect(() => {
    if (!isLoaded) loadTxns();
  }, [isLoaded, loadTxns]);

  const top = useMemo(() => getTopProducts(5), [getTopProducts, transactions]);

  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Produk Terlaris
        </h3>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {top.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-neutral-400">
            Belum ada data penjualan
          </p>
        ) : (
          top.map((p, idx) => (
            <div key={p.productId} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                  idx === 0
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : idx === 1
                      ? "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                      : "text-neutral-400",
                )}
              >
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-neutral-900 dark:text-neutral-50 truncate">
                  {p.productName}
                </p>
                <p className="text-[10px] text-neutral-400">
                  {p.qtySold} terjual
                </p>
              </div>
              <span className="text-xs font-semibold tabular-nums text-neutral-700 dark:text-neutral-300">
                {formatCurrencyID(p.revenue)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
