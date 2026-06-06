"use client";

import { useState, useMemo } from "react";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { ExportBar } from "./export-bar";
import { useReportExport } from "@/hooks/use-report-export";
import { cn } from "@/lib/cn";
import { TrendingUp, DollarSign, Clock, AlertTriangle, Package, Skull } from "lucide-react";

type Period = "all" | "7d" | "30d" | "90d";

function formatRupiah(n: number): string {
  return n > 0 ? "Rp " + Math.round(n).toLocaleString("id-ID") : "Rp 0";
}
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" });
}

export function ProductAnalyticsPanel() {
  const { transactions } = useTransactionStore();
  const { batches, saleAllocations } = useInventoryStore();
  const [period, setPeriod] = useState<Period>("30d");
  const { tableRef, isExporting, handleExport } = useReportExport({ title: "Analytics Produk" });

  const cutoff = useMemo(() => {
    if (period === "all") return new Date(0);
    const d = new Date();
    d.setDate(d.getDate() - parseInt(period));
    return d;
  }, [period]);

  // ---- Product stats from transactions + allocations ----
  const productStats = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; hpp: number; txnCount: Set<string> }>();
    const txnAllocMap = new Map<string, Map<string, number>>(); // txnId → itemId → hpp

    // Build HPP per item from allocations
    for (const a of saleAllocations) {
      if (!a.transactionItemId) continue;
      const txnMap = txnAllocMap.get(a.transactionId) ?? new Map();
      const cur = txnMap.get(a.transactionItemId) ?? 0;
      txnMap.set(a.transactionItemId, cur + a.quantity * a.costPrice);
      txnAllocMap.set(a.transactionId, txnMap);
    }

    for (const txn of transactions) {
      if (new Date(txn.createdAt) < cutoff) continue;
      for (const item of txn.items) {
        const entry = map.get(item.productId) ?? {
          name: item.productName, qty: 0, revenue: 0, hpp: 0, txnCount: new Set<string>(),
        };
        entry.qty += item.quantity;
        entry.revenue += item.subtotal;
        const itemHpp = txnAllocMap.get(txn.id)?.get(item.id ?? "") ?? 0;
        entry.hpp += itemHpp;
        entry.txnCount.add(txn.id);
        map.set(item.productId, entry);
      }
    }

    return Array.from(map.entries()).map(([id, d]) => ({
      productId: id, productName: d.name,
      qty: d.qty, revenue: d.revenue, hpp: d.hpp,
      profit: d.revenue - d.hpp,
      margin: d.revenue > 0 ? Math.round(((d.revenue - d.hpp) / d.revenue) * 100) : 0,
      txnCount: d.txnCount.size,
    }));
  }, [transactions, saleAllocations, cutoff]);

  const topSelling = useMemo(() =>
    [...productStats].sort((a, b) => b.qty - a.qty).slice(0, 5),
  [productStats]);

  const mostProfitable = useMemo(() =>
    [...productStats].sort((a, b) => b.profit - a.profit).slice(0, 5),
  [productStats]);

  // ---- Near Expiry (< 90 days) ----
  const now = new Date();
  const nearExpiryCutoff = new Date(now.getTime() + 90 * 86400 * 1000);
  const nearExpiry = useMemo(() =>
    batches
      .filter((b) => b.quantity > 0 && new Date(b.expiredDate) <= nearExpiryCutoff)
      .sort((a, b) => new Date(a.expiredDate).getTime() - new Date(b.expiredDate).getTime())
      .map((b) => ({
        ...b,
        daysLeft: Math.ceil((new Date(b.expiredDate).getTime() - now.getTime()) / (86400 * 1000)),
      })),
  [batches]);

  // ---- Dead Stock (never sold) ----
  const soldProductIds = useMemo(() => new Set(saleAllocations.map((a: any) => a.productId ?? a.batchId)), [saleAllocations]);
  const deadStock = useMemo(() =>
    batches.filter((b) => b.quantity > 0 && !soldProductIds.has(b.productId)),
  [batches, soldProductIds]);

  // ---- Slow Moving (last sale > 30d) ----
  const lastSaleMap = useMemo(() => {
    const map = new Map<string, { date: string; productName: string }>();
    for (const txn of transactions) {
      for (const item of txn.items) {
        const cur = map.get(item.productId);
        if (!cur || new Date(txn.createdAt) > new Date(cur.date)) {
          map.set(item.productId, { date: txn.createdAt, productName: item.productName });
        }
      }
    }
    return map;
  }, [transactions]);

  const slowCutoff = new Date(now.getTime() - 30 * 86400 * 1000);
  const slowMoving = useMemo(() =>
    batches
      .filter((b) => b.quantity > 0)
      .map((b) => {
        const ls = lastSaleMap.get(b.productId);
        const lastSaleDate = ls ? new Date(ls.date) : null;
        const daysInactive = lastSaleDate ? Math.ceil((now.getTime() - lastSaleDate.getTime()) / (86400 * 1000)) : 999;
        return { ...b, lastSaleDate: ls?.date ?? null, daysInactive };
      })
      .filter((b) => b.daysInactive > 30)
      .sort((a, b) => b.daysInactive - a.daysInactive),
  [batches, lastSaleMap]);

  // ---- At-Risk (near expiry + no sales > 30d) ----
  const atRisk = useMemo(() =>
    slowMoving.filter((b) => new Date(b.expiredDate) <= nearExpiryCutoff),
  [slowMoving]);

  // ---- Inventory Value ----
  const inventoryValue = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; totalCost: number }>();
    for (const b of batches) {
      if (b.quantity <= 0) continue;
      const cur = map.get(b.productId) ?? { name: b.productName, qty: 0, totalCost: 0 };
      cur.qty += b.quantity;
      cur.totalCost += b.quantity * b.unitPrice;
      map.set(b.productId, cur);
    }
    return Array.from(map.entries()).map(([id, d]) => ({
      productId: id, productName: d.name, qty: d.qty, totalCost: d.totalCost,
      avgCost: d.qty > 0 ? d.totalCost / d.qty : 0,
    })).sort((a, b) => b.totalCost - a.totalCost);
  }, [batches]);

  const periods: { key: Period; label: string }[] = [
    { key: "7d", label: "7 Hari" }, { key: "30d", label: "30 Hari" },
    { key: "90d", label: "90 Hari" }, { key: "all", label: "Semua" },
  ];

  return (
    <div ref={tableRef} className="space-y-6">
      {/* Date Filter */}
      <div className="flex items-center gap-2">
        <ExportBar onExport={handleExport} isExporting={isExporting} />
        <span className="text-xs text-neutral-500">Filter (Penjualan):</span>
        <div className="flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
          {periods.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={cn("px-2.5 py-1 text-xs font-medium rounded-md", period === p.key ? "bg-brand-600 text-white" : "text-neutral-500 hover:text-neutral-700")}>
              {p.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-neutral-400 ml-auto">* Inventory metrics always current</span>
      </div>

      {/* Top Selling + Most Profitable */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="🔥 Top Selling" icon={TrendingUp}>
          <TopTable columns={["Product","Qty","Revenue","HPP","Profit"]} data={topSelling.map(p => [p.productName, p.qty, formatRupiah(p.revenue), formatRupiah(p.hpp), formatRupiah(p.profit)])} />
        </SectionCard>
        <SectionCard title="💰 Most Profitable" icon={DollarSign}>
          <TopTable columns={["Product","Revenue","HPP","Profit","M%"]} data={mostProfitable.map(p => [p.productName, formatRupiah(p.revenue), formatRupiah(p.hpp), formatRupiah(p.profit), p.margin+"%"])} />
        </SectionCard>
      </div>

      {/* Inventory Value */}
      <SectionCard title="📦 Inventory Value (current)" icon={Package}>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-neutral-200 dark:border-neutral-700">
            {["Product","Qty","Avg Cost","Total Value"].map(h => <th key={h} className="px-3 py-1.5 text-left font-medium text-neutral-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {inventoryValue.slice(0, 8).map((p) => (
              <tr key={p.productId}><td className="px-3 py-1">{p.productName}</td><td className="px-3 py-1">{p.qty}</td><td className="px-3 py-1">{formatRupiah(p.avgCost)}</td><td className="px-3 py-1 font-medium">{formatRupiah(p.totalCost)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-neutral-300 font-semibold dark:border-neutral-600">
            <td className="px-3 py-1.5">Total</td>
            <td className="px-3 py-1.5">{inventoryValue.reduce((s,p)=>s+p.qty,0).toLocaleString("id-ID")}</td>
            <td className="px-3 py-1.5" />
            <td className="px-3 py-1.5">{formatRupiah(inventoryValue.reduce((s,p)=>s+p.totalCost,0))}</td>
          </tr></tfoot>
        </table>
      </SectionCard>

      {/* Near Expiry + At-Risk */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="⏰ Near Expiry (< 90 hari)" icon={Clock}>
          {nearExpiry.length === 0 ? <EmptyMsg text="Tidak ada produk mendekati kadaluarsa ✅" /> : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-neutral-200 dark:border-neutral-700">
                {["Product","Batch","Qty","Days Left"].map(h => <th key={h} className="px-3 py-1.5 text-left font-medium text-neutral-500">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {nearExpiry.slice(0, 5).map((b) => (
                  <tr key={b.id}><td className="px-3 py-1">{b.productName}</td><td className="px-3 py-1 font-mono text-[10px]">{b.batchNumber}</td><td className="px-3 py-1">{b.quantity}</td><td className={cn("px-3 py-1 font-medium", b.daysLeft < 30 ? "text-red-600" : "text-amber-600")}>{b.daysLeft}d</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard title="⚠ At-Risk (near expiry + no sales 30d)" icon={AlertTriangle}>
          {atRisk.length === 0 ? <EmptyMsg text="Tidak ada produk berisiko ✅" /> : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-neutral-200 dark:border-neutral-700">
                {["Product","Batch","Qty","Last Sold","Expiry","Value"].map(h => <th key={h} className="px-3 py-1.5 text-left font-medium text-neutral-500">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {atRisk.slice(0, 5).map((b) => (
                  <tr key={b.id}><td className="px-3 py-1">{b.productName}</td><td className="px-3 py-1 font-mono text-[10px]">{b.batchNumber}</td><td className="px-3 py-1">{b.quantity}</td><td className="px-3 py-1 text-neutral-400">{formatDate(b.lastSaleDate)}</td><td className="px-3 py-1 text-red-500">{formatDate(b.expiredDate)}</td><td className="px-3 py-1">{formatRupiah(b.quantity * b.unitPrice)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>

      {/* Slow Moving + Dead Stock */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="🐢 Slow Moving (>30d no sale)" icon={Clock}>
          {slowMoving.length === 0 ? <EmptyMsg text="Semua produk aktif ✅" /> : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-neutral-200 dark:border-neutral-700">
                {["Product","Stock","Last Sold","Days"].map(h => <th key={h} className="px-3 py-1.5 text-left font-medium text-neutral-500">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {slowMoving.slice(0, 5).map((b) => (
                  <tr key={b.id}><td className="px-3 py-1">{b.productName}</td><td className="px-3 py-1">{b.quantity}</td><td className="px-3 py-1 text-neutral-400">{formatDate(b.lastSaleDate)}</td><td className="px-3 py-1 text-amber-600 font-medium">{b.daysInactive}d</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard title="💀 Dead Stock (never sold)" icon={Skull}>
          {deadStock.length === 0 ? <EmptyMsg text="Tidak ada dead stock ✅" /> : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-neutral-200 dark:border-neutral-700">
                {["Product","Batch","Qty","Value"].map(h => <th key={h} className="px-3 py-1.5 text-left font-medium text-neutral-500">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {deadStock.slice(0, 5).map((b) => (
                  <tr key={b.id}><td className="px-3 py-1">{b.productName}</td><td className="px-3 py-1 font-mono text-[10px]">{b.batchNumber}</td><td className="px-3 py-1">{b.quantity}</td><td className="px-3 py-1">{formatRupiah(b.quantity * b.unitPrice)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
        <Icon className="h-4 w-4" />{title}
      </h3>
      {children}
    </div>
  );
}

function TopTable({ columns, data }: { columns: string[]; data: (string | number)[][] }) {
  return (
    <table className="w-full text-xs">
      <thead><tr className="border-b border-neutral-200 dark:border-neutral-700">
        {columns.map((h) => <th key={h} className="px-3 py-1.5 text-left font-medium text-neutral-500">{h}</th>)}
      </tr></thead>
      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {data.map((row, i) => (
          <tr key={i}>{row.map((cell, j) => <td key={j} className="px-3 py-1">{cell}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyMsg({ text }: { text: string }) {
  return <p className="py-6 text-center text-xs text-neutral-400">{text}</p>;
}
