// ---------------------------------------------------------------------------
// HPP (Harga Pokok Penjualan) Engine
// ---------------------------------------------------------------------------
// Computes HPP from FEFO batch allocations recorded at time of sale.
// This is the TRUE HPP — not weighted average, not last purchase price.
//
// Data source: sale_batch_allocations (SNPASHOT cost_price)
//              + transactions (revenue)
//              + wallet_transactions (expenses for net profit)
// ---------------------------------------------------------------------------

import type { Transaction } from "@/types/transaction";

export interface HppSummary {
  revenue: number;
  hpp: number;
  grossProfit: number;
  grossMargin: number; // percentage
  transactionCount: number;
}

export interface DailyProfit {
  date: string;
  revenue: number;
  hpp: number;
  grossProfit: number;
}

/**
 * Calculate HPP from recorded batch allocations.
 * Requires sale_batch_allocations records created during checkout.
 */
export function computeHppFromAllocations(
  allocations: Array<{ quantity: number; cost_price: number }>,
): number {
  return allocations.reduce((sum, a) => sum + a.quantity * a.cost_price, 0);
}

/**
 * Calculate gross profit summary from sale_batch_allocations joined with transactions.
 * This is the accurate method — uses actual batch costs at time of sale.
 */
export function computeGrossProfitSummary(
  transactions: Transaction[],
  allocationMap: Map<string, Array<{ quantity: number; cost_price: number }>>,
): HppSummary {
  let revenue = 0;
  let hpp = 0;
  let count = 0;

  for (const txn of transactions) {
    const allocs = allocationMap.get(txn.id);
    if (!allocs) continue;

    revenue += txn.total;
    hpp += computeHppFromAllocations(allocs);
    count++;
  }

  const grossProfit = revenue - hpp;
  const margin = revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0;

  return { revenue, hpp, grossProfit, grossMargin: margin, transactionCount: count };
}

/**
 * Group allocations by date for daily profit trend.
 */
export function computeDailyProfit(
  transactions: Transaction[],
  allocationMap: Map<string, Array<{ quantity: number; cost_price: number }>>,
): DailyProfit[] {
  const daily = new Map<string, { revenue: number; hpp: number }>();

  for (const txn of transactions) {
    const allocs = allocationMap.get(txn.id);
    if (!allocs) continue;
    const date = txn.createdAt.slice(0, 10);

    const entry = daily.get(date) ?? { revenue: 0, hpp: 0 };
    entry.revenue += txn.total;
    entry.hpp += computeHppFromAllocations(allocs);
    daily.set(date, entry);
  }

  return Array.from(daily.entries())
    .map(([date, d]) => ({ date, revenue: d.revenue, hpp: d.hpp, grossProfit: d.revenue - d.hpp }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
