"use client";

/* ------------------------------------------------------------------ */
/*  Analytics Store — computes branch-aware metrics from stores        */
/* ------------------------------------------------------------------ */
/*  No direct Supabase calls — reads existing Zustand stores only.    */
/*  Stock-dependent values are marked with a comment noting inventory  */
/*  store integration is needed.                                       */
/* ------------------------------------------------------------------ */

import { create } from "zustand";
import type {
  BranchMetrics,
  ConsolidatedMetrics,
  BranchComparisonRow,
  AnalyticsFilters,
} from "@/types/analytics";
import type { Transaction } from "@/types/transaction";
import { useTransactionStore } from "./transaction-store";
import { useBranchStore } from "./branch-store";

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

interface AnalyticsState {
  branchMetrics: BranchMetrics[];
  consolidated: ConsolidatedMetrics | null;
  comparison: BranchComparisonRow[];
  isLoading: boolean;

  /* Actions */
  computeBranchMetrics: (filters?: AnalyticsFilters) => void;
  computeConsolidated: () => void;
  computeComparison: () => void;
  computeAll: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Derive the top-selling product name (by qty) from a set of transactions. */
function getTopProductFromTransactions(txns: Transaction[]): string {
  const qtyMap = new Map<string, number>();

  for (const txn of txns) {
    for (const item of txn.items) {
      qtyMap.set(item.productName, (qtyMap.get(item.productName) ?? 0) + item.quantity);
    }
  }

  let top = "";
  let maxQty = 0;
  for (const [name, qty] of Array.from(qtyMap)) {
    if (qty > maxQty) {
      maxQty = qty;
      top = name;
    }
  }

  return top || "-";
}

/** Compute a metric row for a single branch from its transactions. */
function buildBranchMetrics(
  branchId: string,
  branchName: string,
  txns: Transaction[],
): BranchMetrics {
  const totalSales = txns.reduce((sum, t) => sum + t.total, 0);
  const transactionCount = txns.length;
  const averageTransactionValue =
    transactionCount > 0 ? totalSales / transactionCount : 0;
  const topProduct = getTopProductFromTransactions(txns);

  return {
    branchId,
    branchName,
    totalSales,
    transactionCount,
    averageTransactionValue,
    topProduct,
    // Requires inventory store integration (stock data is branch-scoped)
    stockValue: 0,
    lowStockCount: 0,
    nearExpiryCount: 0,
  };
}

/** Group transactions by pharmacyId, returning a Map<branchId, Transaction[]> */
function groupByBranch(txns: Transaction[]): Map<string, Transaction[]> {
  const map = new Map<string, Transaction[]>();

  for (const txn of txns) {
    const key = txn.pharmacyId ?? "__unknown__";
    const bucket = map.get(key) ?? [];
    bucket.push(txn);
    map.set(key, bucket);
  }

  return map;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useAnalyticsStore = create<AnalyticsState>()((set, get) => ({
  branchMetrics: [],
  consolidated: null,
  comparison: [],
  isLoading: false,

  /* ---- computeBranchMetrics ---- */

  computeBranchMetrics: (filters) => {
    set({ isLoading: true });

    const transactions = useTransactionStore.getState().transactions;
    const branches = useBranchStore.getState().branches;

    // 1. Apply date-range filter
    let filtered = transactions;
    if (filters?.dateRange) {
      const { from, to } = filters.dateRange;
      filtered = filtered.filter((t) => {
        const d = new Date(t.createdAt);
        return d >= from && d <= to;
      });
    }

    // 2. Apply branch-id filter
    if (filters?.branchIds && filters.branchIds.length > 0) {
      const ids = new Set(filters.branchIds);
      filtered = filtered.filter((t) => t.pharmacyId && ids.has(t.pharmacyId));
    }

    // 3. Group remaining transactions by branch
    const grouped = groupByBranch(filtered);

    // 4. Build a metric row for every known branch
    const metrics: BranchMetrics[] = [];

    for (const branch of branches) {
      const branchTxns = grouped.get(branch.id) ?? [];
      metrics.push(buildBranchMetrics(branch.id, branch.name, branchTxns));
    }

    // 5. If there are orphan transactions (no matching branch), add an "unknown" row
    const unknownTxns = grouped.get("__unknown__") ?? [];
    if (unknownTxns.length > 0) {
      metrics.push(buildBranchMetrics("__unknown__", "Tanpa Cabang", unknownTxns));
    }

    set({ branchMetrics: metrics, isLoading: false });
  },

  /* ---- computeConsolidated ---- */

  computeConsolidated: () => {
    const { branchMetrics } = get();

    if (branchMetrics.length === 0) {
      set({ consolidated: null });
      return;
    }

    const totalSales = branchMetrics.reduce((s, b) => s + b.totalSales, 0);
    const totalTransactions = branchMetrics.reduce((s, b) => s + b.transactionCount, 0);
    const branches = useBranchStore.getState().branches;
    const activeBranches = branches.filter((b) => b.isActive);

    // Best-guess daily average over the date span of available transactions
    const allTxns = useTransactionStore.getState().transactions;
    let averageDailySales = 0;
    if (allTxns.length > 1) {
      const dates = allTxns.map((t) => new Date(t.createdAt).getTime());
      const minDate = Math.min(...dates);
      const maxDate = Math.max(...dates);
      const daySpan = (maxDate - minDate) / (1000 * 60 * 60 * 24) || 1;
      averageDailySales = totalSales / daySpan;
    }

    const topSellingProduct = getTopProductFromTransactions(allTxns);
    const totalStockValue = 0; // Requires inventory store integration

    set({
      consolidated: {
        totalSales,
        totalTransactions,
        averageDailySales,
        branchCount: branches.length,
        activeBranchCount: activeBranches.length,
        topSellingProduct,
        totalStockValue,
        branches: branchMetrics,
      },
    });
  },

  /* ---- computeComparison ---- */

  computeComparison: () => {
    const { branchMetrics } = get();

    const comparison: BranchComparisonRow[] = branchMetrics.map((m) => ({
      branchId: m.branchId,
      branchName: m.branchName,
      sales: m.totalSales,
      transactions: m.transactionCount,
      avgTransaction: m.averageTransactionValue,
      stockValue: m.stockValue,
      lowStockAlerts: m.lowStockCount,
    }));

    set({ comparison });
  },

  /* ---- computeAll ---- */

  computeAll: () => {
    get().computeBranchMetrics();
    get().computeConsolidated();
    get().computeComparison();
  },
}));
