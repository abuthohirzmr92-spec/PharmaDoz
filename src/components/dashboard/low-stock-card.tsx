"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useInventoryStore } from "@/store/inventory-store";
import { cn } from "@/lib/cn";
import { TableSkeleton } from "@/components/shared/table-skeleton";

export function LowStockCard() {
  const isLoading = useInventoryStore((s) => s.isLoading);
  const load = useInventoryStore((s) => s.loadDemoData);
  const batches = useInventoryStore((s) => s.batches);
  const getLowStock = useInventoryStore((s) => s.getLowStockProducts);

  useEffect(() => {
    if (batches.length === 0) load();
  }, [batches.length, load]);

  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }

  const products = getLowStock();

  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Stok Menipis
        </h3>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {products.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-green-600 font-medium">
            Semua stok aman
          </p>
        ) : (
          products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-neutral-900 dark:text-neutral-50 truncate">
                  {p.name}
                </p>
                <p className="text-[10px] text-neutral-400">{p.category}</p>
              </div>
              <span
                className={cn(
                  "text-xs font-bold tabular-nums",
                  p.totalStock === 0 ? "text-red-600" : "text-amber-600",
                )}
              >
                {p.totalStock}
                <span className="ml-0.5 text-[10px] font-normal text-neutral-400">
                  /{p.minStock}
                </span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
