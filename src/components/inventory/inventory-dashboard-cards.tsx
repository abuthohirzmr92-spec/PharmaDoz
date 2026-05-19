"use client";

import { useEffect, useMemo } from "react";
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShoppingCart,
  DollarSign,
} from "lucide-react";
import { useInventoryStore } from "@/store/inventory-store";
import { buildDashboardSummary } from "@/lib/inventory-demo";
import { cn } from "@/lib/cn";

interface CardDef {
  key: string;
  label: string;
  icon: typeof Package;
  isCurrency?: boolean;
  warn?: boolean;
  danger?: boolean;
}

const CARD_DEFS: CardDef[] = [
  { key: "totalProducts", label: "Total Produk", icon: Package },
  { key: "totalStockValue", label: "Nilai Stok", icon: DollarSign, isCurrency: true },
  { key: "lowStockCount", label: "Stok Menipis", icon: TrendingUp, warn: true },
  { key: "nearExpiryCount", label: "Mendekati ED", icon: Clock, warn: true },
  { key: "expiredCount", label: "Kadaluarsa", icon: AlertTriangle, danger: true },
  { key: "totalPurchaseValue", label: "Hutang Supplier", icon: ShoppingCart, isCurrency: true },
];

export function InventoryDashboardCards() {
  const loadDemoData = useInventoryStore((s) => s.loadDemoData);
  const batches = useInventoryStore((s) => s.batches);
  const purchaseInvoices = useInventoryStore((s) => s.purchaseInvoices);
  const stockMovements = useInventoryStore((s) => s.stockMovements);

  useEffect(() => {
    if (batches.length === 0) loadDemoData();
  }, [batches.length, loadDemoData]);

  const summary = useMemo(
    () => buildDashboardSummary(batches, purchaseInvoices, stockMovements),
    [batches, purchaseInvoices, stockMovements],
  );

  const values: Record<string, number> = {
    totalProducts: summary.totalProducts,
    totalStockValue: summary.totalStockValue,
    lowStockCount: summary.lowStockCount,
    nearExpiryCount: summary.nearExpiryCount,
    expiredCount: summary.expiredCount,
    totalPurchaseValue: summary.totalPurchaseValue,
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {CARD_DEFS.map((def) => {
        const val = values[def.key] ?? 0;
        const Icon = def.icon;

        return (
          <div
            key={def.key}
            className={cn(
              "rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900",
              def.danger && val > 0 && "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
              def.warn && val > 0 && !def.danger && "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
            )}
          >
            <div className="flex items-center gap-2">
              <Icon
                className={cn(
                  "h-4 w-4",
                  def.danger && val > 0
                    ? "text-red-600"
                    : def.warn && val > 0
                      ? "text-amber-600"
                      : "text-neutral-400",
                )}
              />
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                {def.label}
              </span>
            </div>
            <p
              className={cn(
                "mt-2 text-xl font-bold tabular-nums",
                def.danger && val > 0
                  ? "text-red-700 dark:text-red-400"
                  : def.warn && val > 0
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-neutral-900 dark:text-neutral-50",
              )}
            >
              {def.isCurrency
                ? `Rp ${Math.round(val).toLocaleString("id-ID")}`
                : val}
            </p>
          </div>
        );
      })}
    </div>
  );
}
