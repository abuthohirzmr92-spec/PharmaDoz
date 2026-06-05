"use client";

import { useMemo } from "react";
import { useInventoryStore } from "@/store/inventory-store";
import { cn } from "@/lib/cn";

interface Props {
  transactionId: string;
  itemId: string;
  itemHpp: number;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { month: "short", year: "numeric" });
}

function getStatus(expiredDate: string | null): { label: string; cls: string } {
  if (!expiredDate) return { label: "—", cls: "text-neutral-400" };
  const exp = new Date(expiredDate);
  const now = new Date();
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (86400 * 1000));
  if (daysLeft < 0) return { label: "Expired", cls: "text-red-600 bg-red-50 dark:bg-red-950" };
  if (daysLeft <= 90) return { label: "Near Expiry", cls: "text-amber-600 bg-amber-50 dark:bg-amber-950" };
  return { label: "Good", cls: "text-green-600 bg-green-50 dark:bg-green-950" };
}

export function BatchAllocationPanel({ transactionId, itemId, itemHpp }: Props) {
  const allocations = useInventoryStore((s) => s.saleAllocations);

  const itemAllocs = useMemo(() => {
    return allocations.filter(
      (a) => a.transactionId === transactionId && a.transactionItemId === itemId,
    );
  }, [allocations, transactionId, itemId]);

  const totalCost = useMemo(
    () => itemAllocs.reduce((s, a) => s + a.quantity * a.costPrice, 0),
    [itemAllocs],
  );

  if (!itemAllocs.length) return null;

  return (
    <tr className="bg-neutral-100/50 dark:bg-neutral-900/70">
      <td colSpan={7} className="px-0 py-0">
        <div className="ml-6 mr-3 my-1 overflow-hidden rounded border border-neutral-200 dark:border-neutral-700">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                <th className="w-[25%] px-2 py-1 text-left font-medium text-neutral-500">Batch Number</th>
                <th className="w-[15%] px-2 py-1 text-left font-medium text-neutral-500">Expiry</th>
                <th className="w-[8%] px-2 py-1 text-center font-medium text-neutral-500">Qty</th>
                <th className="w-[22%] px-2 py-1 text-right font-medium text-neutral-500">Cost Price</th>
                <th className="w-[18%] px-2 py-1 text-right font-medium text-neutral-500">Total Cost</th>
                <th className="w-[12%] px-2 py-1 text-center font-medium text-neutral-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {itemAllocs.map((a, idx) => {
                const status = getStatus(a.expiredDate);
                return (
                  <tr key={idx} data-batch-id={a.batchId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                    <td className="px-2 py-1 text-neutral-700 dark:text-neutral-300">{a.batchNumber}</td>
                    <td className="px-2 py-1 text-neutral-500">{formatDate(a.expiredDate)}</td>
                    <td className="px-2 py-1 text-center text-neutral-600">{a.quantity}</td>
                    <td className="px-2 py-1 text-right text-neutral-600">Rp {a.costPrice.toLocaleString("id-ID")}</td>
                    <td className="px-2 py-1 text-right font-medium text-neutral-700 dark:text-neutral-300">Rp {(a.quantity * a.costPrice).toLocaleString("id-ID")}</td>
                    <td className="px-2 py-1 text-center">
                      <span className={cn("inline-flex rounded px-1.5 py-0.5 text-[9px] font-medium", status.cls)}>{status.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-200 bg-neutral-50/70 dark:border-neutral-600 dark:bg-neutral-800/50">
                <td className="px-2 py-1 text-neutral-500 font-medium" colSpan={4}>TOTAL HPP</td>
                <td className="px-2 py-1 text-right font-semibold text-neutral-800 dark:text-neutral-200">Rp {totalCost.toLocaleString("id-ID")}</td>
                <td className={cn("px-2 py-1 text-center text-[9px] font-medium", totalCost === itemHpp ? "text-green-600" : "text-red-600")}>
                  {totalCost === itemHpp ? "✓ MATCH" : "⚠ MISMATCH"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </td>
    </tr>
  );
}
