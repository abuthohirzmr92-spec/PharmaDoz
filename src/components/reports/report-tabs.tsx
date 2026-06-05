"use client";

import { ReceiptText, Package, AlertTriangle, ShoppingCart, TrendingUp, BarChart3 } from "lucide-react";
import type { ReportTab } from "@/types/report";
import { cn } from "@/lib/cn";

const TABS: { key: ReportTab; label: string; icon: typeof ReceiptText }[] = [
  { key: "sales", label: "Penjualan", icon: ReceiptText },
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "expired", label: "Kadaluarsa", icon: AlertTriangle },
  { key: "purchase", label: "Pembelian", icon: ShoppingCart },
  { key: "pl", label: "Laba/Rugi", icon: TrendingUp },
  { key: "products", label: "Produk Analytics", icon: BarChart3 },
];

interface ReportTabsProps {
  active: ReportTab;
  onChange: (tab: ReportTab) => void;
}

export function ReportTabs({ active, onChange }: ReportTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-900">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;

        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-white text-brand-700 shadow-sm dark:bg-neutral-800 dark:text-brand-400"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
