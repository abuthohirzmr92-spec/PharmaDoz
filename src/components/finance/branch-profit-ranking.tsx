"use client";

import { useMemo } from "react";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { useBranchStore } from "@/store/branch-store";
import { computeBranchProfit, formatRupiah } from "@/lib/finance/profit-engine";
import { cn } from "@/lib/cn";
import { Medal } from "lucide-react";

export function BranchProfitRanking() {
  const { transactions } = useTransactionStore();
  const { branches } = useBranchStore();
  const batches = useInventoryStore((s) => (s as any).batches ?? []);

  const branchNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of branches) map.set(b.id, b.name);
    return map;
  }, [branches]);

  const ranking = useMemo(
    () => computeBranchProfit(transactions, batches, branchNames),
    [transactions, batches, branchNames],
  );

  if (!ranking.length) {
    return <p className="text-sm text-neutral-400 py-8 text-center">Belum ada data profit cabang.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
            <th className="px-4 py-3 font-medium text-neutral-500 w-10">#</th>
            <th className="px-4 py-3 font-medium text-neutral-500">Cabang</th>
            <th className="px-4 py-3 font-medium text-neutral-500 text-right">Omset</th>
            <th className="px-4 py-3 font-medium text-neutral-500 text-right">HPP</th>
            <th className="px-4 py-3 font-medium text-neutral-500 text-right">Profit</th>
            <th className="px-4 py-3 font-medium text-neutral-500 text-right">Margin</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {ranking.map((b) => (
            <tr key={b.branchId}
              className={cn("bg-white hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900",
                b.rank === 1 && "bg-amber-50 dark:bg-amber-950/30")}>
              <td className="px-4 py-3">
                {b.rank <= 3 ? (
                  <Medal className={cn("h-4 w-4",
                    b.rank === 1 ? "text-amber-500" : b.rank === 2 ? "text-neutral-400" : "text-amber-700")} />
                ) : (
                  <span className="text-xs text-neutral-400">{b.rank}</span>
                )}
              </td>
              <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-50">{b.branchName}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(b.revenue)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-neutral-500">{formatRupiah(b.cogs)}</td>
              <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", b.grossProfit >= 0 ? "text-green-600" : "text-red-600")}>
                {formatRupiah(b.grossProfit)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-neutral-500">{b.marginPct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
