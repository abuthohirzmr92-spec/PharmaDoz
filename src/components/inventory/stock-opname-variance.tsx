"use client";

import { ClipboardList, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface VarianceItem {
  productName: string;
  batchNumber: string;
  systemQty: number;
  physicalQty: number;
  difference: number;
}

export interface StockOpnameVarianceProps {
  items: VarianceItem[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function StockOpnameVariance({ items }: StockOpnameVarianceProps) {
  const discrepancies = items.filter((i) => i.difference !== 0);
  const totalItemsChecked = items.length;
  const totalDifferences = discrepancies.reduce(
    (sum, i) => sum + Math.abs(i.difference),
    0,
  );

  if (discrepancies.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col items-center gap-2 text-center">
          <ClipboardList className="h-6 w-6 text-green-400" />
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Tidak ada selisih — semua item sesuai
          </p>
          <p className="text-xs text-neutral-400">
            {totalItemsChecked} item diperiksa, 0 selisih
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="w-[30%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Produk
              </th>
              <th className="w-[18%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Batch
              </th>
              <th className="w-[13%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                System
              </th>
              <th className="w-[13%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Fisik
              </th>
              <th className="w-[13%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Selisih
              </th>
              <th className="w-[13%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Variance %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {discrepancies.map((item, idx) => {
              const variancePercent =
                item.systemQty === 0
                  ? item.physicalQty > 0
                    ? 100
                    : 0
                  : Math.round(
                      (Math.abs(item.difference) / item.systemQty) * 100,
                    );

              const isLoss = item.difference < 0;
              const isSurplus = item.difference > 0;

              return (
                <tr
                  key={`${item.productName}-${item.batchNumber}-${idx}`}
                  className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-medium text-neutral-900 dark:text-neutral-50 truncate block">
                      {item.productName}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-mono text-neutral-500">
                      {item.batchNumber}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
                      {item.systemQty}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs tabular-nums font-medium text-neutral-800 dark:text-neutral-200">
                      {item.physicalQty}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isLoss ? (
                        <Minus className="h-3 w-3 text-red-500 shrink-0" />
                      ) : (
                        <Plus className="h-3 w-3 text-amber-500 shrink-0" />
                      )}
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          isLoss
                            ? "text-red-600"
                            : isSurplus
                              ? "text-amber-600"
                              : "text-neutral-400",
                        )}
                      >
                        {Math.abs(item.difference)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                        isLoss
                          ? "bg-red-50 text-red-600 dark:bg-red-950/30"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-950/30",
                      )}
                    >
                      {variancePercent}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary row */}
      <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="text-neutral-500">
              Item diperiksa:{" "}
              <strong className="text-neutral-800 dark:text-neutral-200">
                {totalItemsChecked}
              </strong>
            </span>
            <span className="text-neutral-500">
              Item berselisih:{" "}
              <strong className="text-neutral-800 dark:text-neutral-200">
                {discrepancies.length}
              </strong>
            </span>
          </div>
          <span className="text-neutral-500">
            Total selisih:{" "}
            <strong
              className={cn(
                "tabular-nums",
                totalDifferences > 0
                  ? "text-amber-600"
                  : "text-neutral-800 dark:text-neutral-200",
              )}
            >
              {totalDifferences}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
