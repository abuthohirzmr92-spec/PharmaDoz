/* ------------------------------------------------------------------ */
/*  Analytics Type Definitions — Branch-Aware Metrics                  */
/* ------------------------------------------------------------------ */

import type { DateRange } from "./report";

/** Per-branch computed metrics from transaction + inventory data */
export interface BranchMetrics {
  branchId: string;
  branchName: string;
  totalSales: number;
  transactionCount: number;
  averageTransactionValue: number;
  topProduct: string;
  stockValue: number;
  lowStockCount: number;
  nearExpiryCount: number;
}

/** Rolled-up view for tenant owners across all branches */
export interface ConsolidatedMetrics {
  totalSales: number;
  totalTransactions: number;
  averageDailySales: number;
  branchCount: number;
  activeBranchCount: number;
  topSellingProduct: string;
  totalStockValue: number;
  branches: BranchMetrics[];
}

/** Flat row used in the comparison table */
export interface BranchComparisonRow {
  branchId: string;
  branchName: string;
  sales: number;
  transactions: number;
  avgTransaction: number;
  stockValue: number;
  lowStockAlerts: number;
}

/** Optional filters that scopes analytics computations */
export interface AnalyticsFilters {
  dateRange?: DateRange;
  branchIds?: string[];
}
