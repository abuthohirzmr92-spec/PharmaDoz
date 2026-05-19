"use client";

import { useEffect } from "react";
import { DollarSign, ShoppingCart, TrendingUp, Clock } from "lucide-react";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { cn } from "@/lib/cn";
import { formatCurrencyID } from "@/lib/date-utils";

interface StatCard {
  key: string;
  label: string;
  icon: typeof DollarSign;
  value: string | number;
  warn?: boolean;
  danger?: boolean;
}

export function DashboardStatsGrid() {
  const loadTxns = useTransactionStore((s) => s.loadDemoTransactions);
  const isTxnsLoaded = useTransactionStore((s) => s.isLoaded);
  const todaySales = useTransactionStore((s) => s.getTodaySalesTotal());
  const todayCount = useTransactionStore((s) => s.getTodayTransactionCount());

  const isLoading = useInventoryStore((s) => s.isLoading);
  const loadInv = useInventoryStore((s) => s.loadDemoData);
  const batches = useInventoryStore((s) => s.batches);
  const getLowStock = useInventoryStore((s) => s.getLowStockProducts);
  const getNearExpiry = useInventoryStore((s) => s.getNearExpiryBatches);

  useEffect(() => {
    if (!isTxnsLoaded) loadTxns();
  }, [isTxnsLoaded, loadTxns]);

  useEffect(() => {
    if (batches.length === 0) loadInv();
  }, [batches.length, loadInv]);

  const lowStockCount = getLowStock().length;
  const nearExpiryCount = getNearExpiry(30).length;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const cards: StatCard[] = [
    { key: "sales", label: "Penjualan Hari Ini", icon: DollarSign, value: formatCurrencyID(todaySales) },
    { key: "txns", label: "Transaksi Hari Ini", icon: ShoppingCart, value: todayCount },
    { key: "low", label: "Stok Menipis", icon: TrendingUp, value: lowStockCount, warn: lowStockCount > 0 },
    { key: "expiry", label: "ED ≤ 30 Hari", icon: Clock, value: nearExpiryCount, danger: nearExpiryCount > 0, warn: nearExpiryCount === 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className={cn(
              "rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900",
              card.danger && card.value !== 0 && "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
              card.warn && card.value !== 0 && !card.danger && "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
            )}
          >
            <div className="flex items-center gap-2">
              <Icon
                className={cn(
                  "h-4 w-4",
                  card.danger && card.value !== 0 ? "text-red-600" : card.warn && card.value !== 0 ? "text-amber-600" : "text-neutral-400",
                )}
              />
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                {card.label}
              </span>
            </div>
            <p
              className={cn(
                "mt-2 text-xl font-bold tabular-nums",
                card.danger && card.value !== 0 ? "text-red-700 dark:text-red-400" : card.warn && card.value !== 0 ? "text-amber-700 dark:text-amber-400" : "text-neutral-900 dark:text-neutral-50",
              )}
            >
              {card.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
