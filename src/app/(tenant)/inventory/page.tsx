"use client";

import { useMemo } from "react";
import { useInventoryStore } from "@/store/inventory-store";
import { buildInventoryProducts } from "@/lib/inventory-demo";
import { useInventoryBranch } from "./use-inventory-branch";
import { InventoryDashboardCards } from "@/components/inventory/inventory-dashboard-cards";
import { cn } from "@/lib/cn";

export default function InventoryDashboardPage() {
  useInventoryBranch();

  return (
    <div className="overflow-y-auto h-full space-y-6">
      <InventoryDashboardCards />
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentMovements />
        <LowStockAlerts />
      </div>
    </div>
  );
}

function RecentMovements() {
  const movements = useInventoryStore((s) => s.stockMovements);
  const recent = [...movements]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Mutasi Terbaru
        </h3>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {recent.map((m) => {
          const isNeg = m.qtyChange < 0;
          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-neutral-900 dark:text-neutral-50">
                  {m.productName}
                </p>
                <p className="text-[10px] text-neutral-400">
                  {new Date(m.timestamp).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" · "}
                  {m.referenceNumber || m.type}
                </p>
              </div>
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  isNeg ? "text-red-600" : "text-green-600",
                )}
              >
                {isNeg ? m.qtyChange : `+${m.qtyChange}`}
              </span>
            </div>
          );
        })}
        {recent.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-neutral-400">
            Belum ada mutasi
          </p>
        )}
      </div>
    </div>
  );
}

function LowStockAlerts() {
  const batches = useInventoryStore((s) => s.batches);
  const products = useMemo(
    () => buildInventoryProducts(batches).filter((p) => p.totalStock <= p.minStock),
    [batches],
  );

  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Stok Menipis
        </h3>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-neutral-900 dark:text-neutral-50">
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
        ))}
        {products.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-green-600">
            Semua stok aman
          </p>
        )}
      </div>
    </div>
  );
}
