"use client";

import { useMemo } from "react";
import { ArrowRight, Store, DollarSign, TrendingUp, ShoppingCart, AlertTriangle } from "lucide-react";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { formatCurrencyID } from "@/lib/date-utils";
import { cn } from "@/lib/cn";
import type { Branch } from "@/lib/branch/branch-types";

/* ------------------------------------------------------------------ */
/*  BranchSummaryCard — Single branch snapshot card                    */
/* ------------------------------------------------------------------ */
/*  Shows: branch name, revenue, profit, transaction count,            */
/*  low stock alerts, and a [Detail] button.                           */
/*  Computes profit from per-branch transactions + sale allocations.   */
/* ------------------------------------------------------------------ */

interface Props {
  branch: Branch;
  onDetail: (branchId: string) => void;
}

function MetricItem({
  label,
  value,
  icon: Icon,
  warn,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          warn ? "text-amber-500" : "text-neutral-400",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-neutral-400 leading-tight">{label}</p>
        <p
          className={cn(
            "text-xs font-semibold tabular-nums text-neutral-800 dark:text-neutral-200",
            warn && "text-amber-600 dark:text-amber-400",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export function BranchSummaryCard({ branch, onDetail }: Props) {
  const transactions = useTransactionStore((s) => s.transactions);
  const saleAllocations = useInventoryStore((s) => s.saleAllocations);
  const getLowStock = useInventoryStore((s) => s.getLowStockProducts);

  /* ---- Per-branch revenue & transaction count ---- */
  const branchTxns = useMemo(
    () => transactions.filter((t) => t.pharmacyId === branch.id),
    [transactions, branch.id],
  );

  const revenue = useMemo(
    () => branchTxns.reduce((s, t) => s + t.total, 0),
    [branchTxns],
  );

  const txnCount = branchTxns.length;

  /* ---- Per-branch profit from allocations ---- */
  const profit = useMemo(() => {
    // Build HPP map from allocations for these transactions
    const branchTxnIds = new Set(branchTxns.map((t) => t.id));
    const allocMap = new Map<string, number>(); // transactionId → total HPP
    for (const a of saleAllocations) {
      if (branchTxnIds.has(a.transactionId)) {
        allocMap.set(
          a.transactionId,
          (allocMap.get(a.transactionId) ?? 0) + a.quantity * a.costPrice,
        );
      }
    }
    const totalHpp = Array.from(allocMap.values()).reduce((s, v) => s + v, 0);
    return revenue - totalHpp;
  }, [branchTxns, saleAllocations, revenue]);

  /* ---- Low stock count (global approximation; demo data not branch-scoped) ---- */
  const lowStockCount = useMemo(() => getLowStock().length, [getLowStock]);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 hover:shadow-sm transition-shadow">
      {/* Branch name */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950">
          <Store className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 truncate">
            {branch.name}
          </p>
          {branch.isMain && (
            <span className="text-[10px] font-medium text-brand-600 dark:text-brand-400">
              Pusat
            </span>
          )}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <MetricItem
          label="Revenue"
          value={formatCurrencyID(revenue)}
          icon={DollarSign}
        />
        <MetricItem
          label="Profit"
          value={profit > 0 ? formatCurrencyID(profit) : revenue > 0 ? formatCurrencyID(profit) : "—"}
          icon={TrendingUp}
        />
        <MetricItem
          label="Transaksi"
          value={String(txnCount)}
          icon={ShoppingCart}
        />
        <MetricItem
          label="Low Stock"
          value={String(lowStockCount)}
          icon={AlertTriangle}
          warn={lowStockCount > 0}
        />
      </div>

      {/* Detail button */}
      <button
        onClick={() => onDetail(branch.id)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 py-2 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
      >
        Detail
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
