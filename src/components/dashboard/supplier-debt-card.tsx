"use client";

import { useEffect, useMemo } from "react";
import { ShoppingCart, AlertCircle } from "lucide-react";
import { useInventoryStore } from "@/store/inventory-store";
import { cn } from "@/lib/cn";
import { formatCurrencyID } from "@/lib/date-utils";
import { CardSkeleton } from "@/components/shared/card-skeleton";

export function SupplierDebtCard() {
  const isLoading = useInventoryStore((s) => s.isLoading);
  const load = useInventoryStore((s) => s.loadDemoData);
  const batches = useInventoryStore((s) => s.batches);
  const invoices = useInventoryStore((s) => s.purchaseInvoices);

  useEffect(() => {
    if (batches.length === 0) load();
  }, [batches.length, load]);

  const unpaid = useMemo(
    () => invoices.filter((inv) => inv.status !== "paid"),
    [invoices],
  );

  const totalDebt = useMemo(
    () => unpaid.reduce((s, inv) => s + (inv.totalAmount - inv.paidAmount), 0),
    [unpaid],
  );

  if (isLoading) {
    return <CardSkeleton />;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Hutang Supplier
          </h3>
          <span className="text-xs font-bold text-red-600 tabular-nums">
            {formatCurrencyID(totalDebt)}
          </span>
        </div>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {unpaid.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-green-600 font-medium">
            Tidak ada hutang supplier
          </p>
        ) : (
          unpaid.slice(0, 5).map((inv) => {
            const isOverdue = inv.dueDate && new Date(inv.dueDate) < now;
            const remaining = inv.totalAmount - inv.paidAmount;

            return (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-2.5">
                {isOverdue ? (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                ) : (
                  <ShoppingCart className="h-4 w-4 shrink-0 text-amber-500" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-neutral-900 dark:text-neutral-50 truncate">
                    {inv.supplierName}
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    {inv.invoiceNumber} · JT:{" "}
                    {inv.dueDate
                      ? new Date(inv.dueDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      isOverdue ? "text-red-600" : "text-amber-600",
                    )}
                  >
                    {formatCurrencyID(remaining)}
                  </span>
                  {isOverdue && (
                    <span className="ml-1 rounded bg-red-50 px-1 py-0.5 text-[9px] font-medium text-red-600 dark:bg-red-950/30">
                      LWT
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
