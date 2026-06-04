// ---------------------------------------------------------------------------
// HPP + Profit Engine
// ---------------------------------------------------------------------------
// HPP from FEFO batch allocations (sale_batch_allocations)
// Gross Profit = Revenue - HPP
// Net Profit = Gross Profit - Operational Expenses
// ---------------------------------------------------------------------------

import type { Transaction } from "@/types/transaction";

export interface HppSummary {
  revenue: number;
  hpp: number;
  grossProfit: number;
  grossMargin: number;
  transactionCount: number;
}

export interface NetProfitSummary extends HppSummary {
  operationalExpense: number;
  netProfit: number;
  netMargin: number;
}

export interface DailyProfit {
  date: string;
  revenue: number;
  hpp: number;
  grossProfit: number;
  expense: number;
  netProfit: number;
}

/** Category labels for expense source types */
export const EXPENSE_CATEGORIES: Record<string, string> = {
  expense: "Operasional",
  purchase: "Pembelian",
};

/**
 * Calculate operational expenses from wallet transactions (debits).
 * Filters to source_type = 'expense' only (true operational costs).
 */
export function computeOperationalExpense(
  expenses: Array<{ amount: number; sourceType: string }>,
): number {
  return expenses
    .filter((e) => e.sourceType === "expense")
    .reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Compute net profit: Gross Profit - Operational Expenses.
 */
export function computeNetProfitSummary(
  transactions: Transaction[],
  allocationMap: Map<string, Array<{ quantity: number; cost_price: number }>>,
  expenses: Array<{ amount: number; sourceType: string; transactionDate: string }>,
  periodStart?: Date,
): NetProfitSummary {
  const base = computeGrossProfitSummary(transactions, allocationMap);
  const filteredExpenses = periodStart
    ? expenses.filter((e) => new Date(e.transactionDate) >= periodStart)
    : expenses;
  const operationalExpense = computeOperationalExpense(filteredExpenses);
  const netProfit = base.grossProfit - operationalExpense;
  const netMargin = base.revenue > 0 ? Math.round((netProfit / base.revenue) * 10000) / 100 : 0;

  return { ...base, operationalExpense, netProfit, netMargin };
}

/**
 * Compute daily profit including expenses.
 */
export function computeDailyNetProfit(
  transactions: Transaction[],
  allocationMap: Map<string, Array<{ quantity: number; cost_price: number }>>,
  expenses: Array<{ amount: number; sourceType: string; transactionDate: string }>,
): DailyProfit[] {
  const daily = new Map<string, { revenue: number; hpp: number; expense: number }>();

  // Revenue + HPP from sales
  for (const txn of transactions) {
    const allocs = allocationMap.get(txn.id);
    if (!allocs) continue;
    const date = txn.createdAt.slice(0, 10);
    const entry = daily.get(date) ?? { revenue: 0, hpp: 0, expense: 0 };
    entry.revenue += txn.total;
    entry.hpp += computeHppFromAllocations(allocs);
    daily.set(date, entry);
  }

  // Expenses
  for (const e of expenses) {
    if (e.sourceType !== "expense") continue;
    const date = e.transactionDate.slice(0, 10);
    const entry = daily.get(date) ?? { revenue: 0, hpp: 0, expense: 0 };
    entry.expense += e.amount;
    daily.set(date, entry);
  }

  return Array.from(daily.entries())
    .map(([date, d]) => ({
      date,
      revenue: d.revenue,
      hpp: d.hpp,
      grossProfit: d.revenue - d.hpp,
      expense: d.expense,
      netProfit: d.revenue - d.hpp - d.expense,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
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
    .map(([date, d]) => ({ date, revenue: d.revenue, hpp: d.hpp, grossProfit: d.revenue - d.hpp, expense: 0, netProfit: d.revenue - d.hpp }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
