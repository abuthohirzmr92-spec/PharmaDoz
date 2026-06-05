"use client";

import { useMemo } from "react";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { useWalletStore } from "@/store/wallet-store";

export type MetricPeriod = "today" | "week" | "month";

export interface OwnerMetrics {
  // Financial (period-filtered)
  revenue: number;
  profit: number;
  hpp: number;
  transactionCount: number;
  // Wallet (current)
  cashBalance: number;
  bankBalance: number;
  totalFunds: number;
  // Inventory (current)
  inventoryValue: number;
  nearExpiryCount: number;
  nearExpiryValue: number;
  atRiskCount: number;
  atRiskValue: number;
  deadStockCount: number;
  deadStockValue: number;
  reorderNeededCount: number;
  // Performance (period-filtered)
  topSelling: Array<{ name: string; qty: number; revenue: number }>;
  topProfitable: Array<{ name: string; profit: number; margin: number }>;
  // Alerts
  alerts: Array<{ type: "expiry" | "reorder" | "slow" | "dead"; message: string }>;
}

export function useOwnerMetrics(period: MetricPeriod = "today"): OwnerMetrics {
  const { transactions } = useTransactionStore();
  const { batches, saleAllocations } = useInventoryStore();
  const { wallets } = useWalletStore();

  const cutoff = useMemo(() => {
    const now = new Date();
    if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === "week") return new Date(now.getTime() - 7 * 86400000);
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, [period]);

  // ---- Financial KPIs ----
  const { revenue, profit, hpp, txnCount, topSelling, topProfitable } = useMemo(() => {
    let rev = 0, pft = 0, cost = 0, cnt = 0;
    const prodMap = new Map<string, { name: string; qty: number; revenue: number; hpp: number }>();

    const allocMap = new Map<string, Map<string, number>>();
    for (const a of saleAllocations) {
      if (!a.transactionItemId) continue;
      const m = allocMap.get(a.transactionId) ?? new Map();
      m.set(a.transactionItemId, (m.get(a.transactionItemId) ?? 0) + a.quantity * a.costPrice);
      allocMap.set(a.transactionId, m);
    }

    for (const txn of transactions) {
      if (new Date(txn.createdAt) < cutoff) continue;
      cnt++;
      rev += txn.total;
      const itemMap = allocMap.get(txn.id);
      let txnHpp = 0;
      if (itemMap) {
        for (const item of txn.items) {
          const itemHpp = itemMap.get(item.id ?? "") ?? 0;
          txnHpp += itemHpp;
          const cur = prodMap.get(item.productId) ?? { name: item.productName, qty: 0, revenue: 0, hpp: 0 };
          cur.qty += item.quantity;
          cur.revenue += item.subtotal;
          cur.hpp += itemHpp;
          prodMap.set(item.productId, cur);
        }
      }
      cost += txnHpp;
    }
    pft = rev - cost;

    const topS = Array.from(prodMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5)
      .map(p => ({ name: p.name, qty: p.qty, revenue: p.revenue }));
    const topP = Array.from(prodMap.values())
      .map(p => ({ name: p.name, profit: p.revenue - p.hpp, margin: p.revenue > 0 ? Math.round(((p.revenue - p.hpp) / p.revenue) * 100) : 0 }))
      .sort((a, b) => b.profit - a.profit).slice(0, 5);

    return { revenue: rev, profit: pft, hpp: cost, txnCount: cnt, topSelling: topS, topProfitable: topP };
  }, [transactions, saleAllocations, cutoff]);

  // ---- Wallet KPIs ----
  const { cashBalance, bankBalance, totalFunds } = useMemo(() => {
    const active = wallets.filter((w) => !w.isArchived && w.isActive);
    return {
      cashBalance: active.filter((w) => w.type === "cash").reduce((s, w) => s + w.balance, 0),
      bankBalance: active.filter((w) => w.type === "bank").reduce((s, w) => s + w.balance, 0),
      totalFunds: active.reduce((s, w) => s + w.balance, 0),
    };
  }, [wallets]);

  // ---- Inventory KPIs ----
  const inventoryStats = useMemo(() => {
    const now = new Date();
    const nearCutoff = new Date(now.getTime() + 90 * 86400000);
    const slowCutoff = new Date(now.getTime() - 30 * 86400000);
    let invVal = 0;
    let nearCnt = 0, nearVal = 0;
    let atRiskCnt = 0, atRiskVal = 0;
    let deadCnt = 0, deadVal = 0;
    let reorderCnt = 0;

    const soldProductIds = new Set<string>();
    const lastSaleMap = new Map<string, Date>();
    for (const txn of transactions) {
      for (const item of txn.items) {
        soldProductIds.add(item.productId);
        const cur = lastSaleMap.get(item.productId);
        const d = new Date(txn.createdAt);
        if (!cur || d > cur) lastSaleMap.set(item.productId, d);
      }
    }

    for (const b of batches) {
      if (b.quantity <= 0) continue;
      const val = b.quantity * b.unitPrice;
      invVal += val;

      const exp = new Date(b.expiredDate);
      if (exp <= nearCutoff) { nearCnt++; nearVal += val; }

      const lastSale = lastSaleMap.get(b.productId);
      const isSlow = !lastSale || lastSale < slowCutoff;
      if (exp <= nearCutoff && isSlow) { atRiskCnt++; atRiskVal += val; }

      if (!soldProductIds.has(b.productId)) { deadCnt++; deadVal += val; }

      if (b.quantity <= (b as any).minStock) reorderCnt++;
    }

    return {
      inventoryValue: invVal,
      nearExpiryCount: nearCnt, nearExpiryValue: nearVal,
      atRiskCount: atRiskCnt, atRiskValue: atRiskVal,
      deadStockCount: deadCnt, deadStockValue: deadVal,
      reorderNeededCount: reorderCnt,
    };
  }, [batches, transactions]);

  const inv = inventoryStats;

  // ---- Alerts ----
  const alerts = useMemo(() => {
    const a: OwnerMetrics["alerts"] = [];
    if (inv.nearExpiryCount > 0) a.push({ type: "expiry", message: `${inv.nearExpiryCount} produk kadaluarsa < 90 hari (Rp ${Math.round(inv.nearExpiryValue).toLocaleString("id-ID")}) — pertimbangkan diskon.` });
    if (inv.reorderNeededCount > 0) a.push({ type: "reorder", message: `${inv.reorderNeededCount} produk stok di bawah minimum — buat purchase order.` });
    if (inv.atRiskCount > 0) a.push({ type: "slow", message: `${inv.atRiskCount} produk berisiko (near expiry + tidak terjual 30 hari).` });
    if (inv.deadStockCount > 0) a.push({ type: "dead", message: `${inv.deadStockCount} produk dead stock (Rp ${Math.round(inv.deadStockValue).toLocaleString("id-ID")}) — pertimbangkan write-off.` });
    return a;
  }, [inv]);

  return {
    revenue, profit, hpp, transactionCount: txnCount,
    cashBalance, bankBalance, totalFunds,
    inventoryValue: inv.inventoryValue,
    nearExpiryCount: inv.nearExpiryCount, nearExpiryValue: inv.nearExpiryValue,
    atRiskCount: inv.atRiskCount, atRiskValue: inv.atRiskValue,
    deadStockCount: inv.deadStockCount, deadStockValue: inv.deadStockValue,
    reorderNeededCount: inv.reorderNeededCount,
    topSelling, topProfitable,
    alerts,
  };
}
