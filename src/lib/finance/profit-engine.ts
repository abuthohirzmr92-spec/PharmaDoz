// ---------------------------------------------------------------------------
// Profit Engine — Gross Profit, Branch Profit, ROI computation
// ---------------------------------------------------------------------------
// Reuses computePAndL logic from report-aggregate.ts but adds branch-level
// filtering and ROI calculation for Financial Insight Lite.
//
// Formulae:
//   Revenue = SUM(item.subtotal)
//   COGS = SUM(avgBuyPrice[productId] * item.quantity)
//   GrossProfit = Revenue - COGS
//   Margin% = ROUND((GrossProfit / Revenue) * 100)
//   ROI = (GrossProfit / TotalCapital) * 100
// ---------------------------------------------------------------------------

import type { Transaction } from "@/types/transaction";
import type { ProductBatch } from "@/types/inventory";
import type { AnalyticsFilters } from "@/types/analytics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProfitSummary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
  periodLabel: string;
}

export interface BranchProfit {
  branchId: string;
  branchName: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
  transactionCount: number;
  rank: number;
}

export interface ProductProfit {
  productId: string;
  productName: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  quantitySold: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute weighted average buy price per product from all batches */
function buildAvgBuyPriceMap(batches: ProductBatch[]): Map<string, number> {
  const totalBuy = new Map<string, number>(); // productId → SUM(unitPrice * quantity)
  const totalQty = new Map<string, number>(); // productId → SUM(quantity)

  for (const b of batches) {
    const buy = totalBuy.get(b.productId) ?? 0;
    const qty = totalQty.get(b.productId) ?? 0;
    totalBuy.set(b.productId, buy + b.unitPrice * b.quantity);
    totalQty.set(b.productId, qty + b.quantity);
  }

  const avg = new Map<string, number>();
  for (const [pid] of totalBuy) {
    const buy = totalBuy.get(pid) ?? 0;
    const qty = totalQty.get(pid) ?? 1;
    avg.set(pid, qty > 0 ? buy / qty : 0);
  }
  return avg;
}

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

// ---------------------------------------------------------------------------
// Gross Profit
// ---------------------------------------------------------------------------

/**
 * Compute gross profit from sales transactions and product batches.
 * Uses weighted average COGS across all batches (same method as computePAndL).
 */
export function computeGrossProfit(
  transactions: Transaction[],
  batches: ProductBatch[],
  branchId?: string,
): ProfitSummary {
  const avgBuyPrice = buildAvgBuyPriceMap(batches);

  let revenue = 0;
  let cogs = 0;

  for (const txn of transactions) {
    // Filter by branch if specified
    if (branchId && txn.pharmacyId !== branchId) continue;

    for (const item of txn.items) {
      const itemRevenue = item.subtotal;
      const buyPrice = avgBuyPrice.get(item.productId) ?? item.unitPrice * 0.6;
      const itemCOGS = buyPrice * item.quantity;

      revenue += itemRevenue;
      cogs += itemCOGS;
    }
  }

  const grossProfit = revenue - cogs;
  const marginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0;

  return { revenue, cogs, grossProfit, marginPct, periodLabel: "" };
}

// ---------------------------------------------------------------------------
// Branch Profit
// ---------------------------------------------------------------------------

/**
 * Compute gross profit per branch, ranked by profit descending.
 */
export function computeBranchProfit(
  transactions: Transaction[],
  batches: ProductBatch[],
  branchNames: Map<string, string>,
): BranchProfit[] {
  const avgBuyPrice = buildAvgBuyPriceMap(batches);

  // Aggregate per branch
  const map = new Map<string, {
    revenue: number; cogs: number; count: number;
  }>();

  for (const txn of transactions) {
    const bid = txn.pharmacyId ?? "unknown";
    const entry = map.get(bid) ?? { revenue: 0, cogs: 0, count: 0 };

    for (const item of txn.items) {
      const buyPrice = avgBuyPrice.get(item.productId) ?? item.unitPrice * 0.6;
      entry.revenue += item.subtotal;
      entry.cogs += buyPrice * item.quantity;
    }
    entry.count++;
    map.set(bid, entry);
  }

  // Convert to array + rank
  const results: BranchProfit[] = [];
  for (const [branchId, data] of map) {
    const gp = data.revenue - data.cogs;
    results.push({
      branchId,
      branchName: branchNames.get(branchId) ?? branchId,
      revenue: data.revenue,
      cogs: data.cogs,
      grossProfit: gp,
      marginPct: data.revenue > 0 ? Math.round((gp / data.revenue) * 10000) / 100 : 0,
      transactionCount: data.count,
      rank: 0,
    });
  }

  // Sort by gross profit descending
  results.sort((a, b) => b.grossProfit - a.grossProfit);

  // Assign ranks
  results.forEach((r, i) => (r.rank = i + 1));

  return results;
}

// ---------------------------------------------------------------------------
// ROI
// ---------------------------------------------------------------------------

/** Simple ROI: (Gross Profit / Total Capital) × 100 */
export function computeROI(totalCapital: number, grossProfit: number): number {
  if (totalCapital <= 0) return 0;
  return Math.round((grossProfit / totalCapital) * 10000) / 100;
}

// ---------------------------------------------------------------------------
// Product Profit
// ---------------------------------------------------------------------------

/**
 * Compute gross profit per product, ranked by profit descending.
 */
export function computeProductProfit(
  transactions: Transaction[],
  batches: ProductBatch[],
  limit: number = 10,
): ProductProfit[] {
  const avgBuyPrice = buildAvgBuyPriceMap(batches);

  const map = new Map<string, { name: string; revenue: number; cogs: number; qty: number }>();

  for (const txn of transactions) {
    for (const item of txn.items) {
      const entry = map.get(item.productId) ?? {
        name: item.productName,
        revenue: 0,
        cogs: 0,
        qty: 0,
      };
      const buyPrice = avgBuyPrice.get(item.productId) ?? item.unitPrice * 0.6;
      entry.revenue += item.subtotal;
      entry.cogs += buyPrice * item.quantity;
      entry.qty += item.quantity;
      map.set(item.productId, entry);
    }
  }

  const results: ProductProfit[] = [];
  for (const [productId, data] of map) {
    results.push({
      productId,
      productName: data.name,
      revenue: data.revenue,
      cogs: data.cogs,
      grossProfit: data.revenue - data.cogs,
      quantitySold: data.qty,
    });
  }

  results.sort((a, b) => b.grossProfit - a.grossProfit);
  return results.slice(0, limit);
}

export { formatRupiah };
