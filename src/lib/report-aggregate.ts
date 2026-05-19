/* ------------------------------------------------------------------ */
/*  Report Aggregation — pure functions over data arrays              */
/* ------------------------------------------------------------------ */

import type { Transaction } from "@/types/transaction";
import type { DateRange } from "@/types/report";
import type { ProductBatch } from "@/types/inventory";

/* ---- Sales Trend ---- */

export interface SalesTrendPoint {
  date: string;
  label: string;
  total: number;
  count: number;
}

export function computeSalesTrend(
  transactions: Transaction[],
  range: DateRange,
): SalesTrendPoint[] {
  const days: SalesTrendPoint[] = [];
  const from = new Date(range.from);
  const to = new Date(range.to);

  const d = new Date(from);
  while (d <= to) {
    const dateStr = d.toISOString().slice(0, 10);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    const dayTxns = transactions.filter((t) => {
      const td = new Date(t.createdAt);
      return td >= d && td < next;
    });

    days.push({
      date: dateStr,
      label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      total: dayTxns.reduce((s, t) => s + t.total, 0),
      count: dayTxns.length,
    });

    d.setDate(d.getDate() + 1);
  }

  return days;
}

/* ---- Top Products ---- */

export interface TopProductRow {
  productId: string;
  productName: string;
  qtySold: number;
  revenue: number;
}

export function computeTopProducts(
  transactions: Transaction[],
  limit = 10,
): TopProductRow[] {
  const map = new Map<string, { qtySold: number; revenue: number }>();

  for (const txn of transactions) {
    for (const item of txn.items) {
      const entry = map.get(item.productId);
      if (entry) {
        entry.qtySold += item.quantity;
        entry.revenue += item.subtotal;
      } else {
        map.set(item.productId, { qtySold: item.quantity, revenue: item.subtotal });
      }
    }
  }

  return Array.from(map.entries())
    .map(([productId, data]) => ({
      productId,
      productName: transactions
        .flatMap((t) => t.items)
        .find((i) => i.productId === productId)?.productName ?? "",
      ...data,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/* ---- Profit & Loss ---- */

export interface PAndLRow {
  period: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPercent: number;
}

export function computePAndL(
  transactions: Transaction[],
  batches: ProductBatch[],
  groupBy: "day" | "week" | "month" = "day",
): PAndLRow[] {
  // Build average buy price per product from batches
  const avgBuyPrice = new Map<string, number>();
  const batchGroups = new Map<string, { totalCost: number; totalQty: number }>();

  for (const b of batches) {
    const entry = batchGroups.get(b.productId) || { totalCost: 0, totalQty: 0 };
    entry.totalCost += b.unitPrice * b.quantity;
    entry.totalQty += b.quantity;
    batchGroups.set(b.productId, entry);
  }

  for (const [productId, entry] of batchGroups) {
    avgBuyPrice.set(productId, entry.totalQty > 0 ? entry.totalCost / entry.totalQty : 0);
  }

  // Group transactions by period
  const periodMap = new Map<string, { revenue: number; cogs: number }>();

  for (const txn of transactions) {
    let periodKey: string;
    const d = new Date(txn.createdAt);

    switch (groupBy) {
      case "week": {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        periodKey = weekStart.toISOString().slice(0, 10);
        break;
      }
      case "month":
        periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        break;
      default:
        periodKey = d.toISOString().slice(0, 10);
    }

    const entry = periodMap.get(periodKey) || { revenue: 0, cogs: 0 };

    for (const item of txn.items) {
      entry.revenue += item.subtotal;
      const buyPrice = avgBuyPrice.get(item.productId) ?? item.unitPrice * 0.6;
      entry.cogs += buyPrice * item.quantity;
    }

    periodMap.set(periodKey, entry);
  }

  return Array.from(periodMap.entries())
    .map(([period, data]) => ({
      period,
      revenue: data.revenue,
      cogs: data.cogs,
      grossProfit: data.revenue - data.cogs,
      marginPercent: data.revenue > 0 ? Math.round(((data.revenue - data.cogs) / data.revenue) * 100) : 0,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/* ---- Payment Method Summary ---- */

export interface PaymentSummary {
  method: string;
  count: number;
  total: number;
}

export function computePaymentSummary(transactions: Transaction[]): PaymentSummary[] {
  const map = new Map<string, { count: number; total: number }>();

  for (const txn of transactions) {
    for (const payment of txn.payments) {
      const entry = map.get(payment.method) || { count: 0, total: 0 };
      entry.count++;
      entry.total += payment.amount;
      map.set(payment.method, entry);
    }
  }

  const labels: Record<string, string> = {
    cash: "Tunai",
    debit: "Debit",
    credit: "Kredit",
    qris: "QRIS",
    transfer: "Transfer",
  };

  return Array.from(map.entries())
    .map(([method, data]) => ({
      method: labels[method] ?? method,
      ...data,
    }))
    .sort((a, b) => b.total - a.total);
}

/* ---- Cashier Summary ---- */

export interface CashierSummary {
  cashierName: string;
  transactionCount: number;
  totalSales: number;
}

export function computeCashierSummary(transactions: Transaction[]): CashierSummary[] {
  const map = new Map<string, { count: number; total: number }>();

  for (const txn of transactions) {
    const entry = map.get(txn.cashierName) || { count: 0, total: 0 };
    entry.count++;
    entry.total += txn.total;
    map.set(txn.cashierName, entry);
  }

  return Array.from(map.entries())
    .map(([cashierName, data]) => ({ cashierName, transactionCount: data.count, totalSales: data.total }))
    .sort((a, b) => b.totalSales - a.totalSales);
}
