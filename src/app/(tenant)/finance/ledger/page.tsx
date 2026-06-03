"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Container } from "@/components/shared/container";
import { WidgetErrorBoundary } from "@/components/shared/widget-error-boundary";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { useWalletStore } from "@/store/wallet-store";
import { cn } from "@/lib/cn";

const TransactionList = dynamic(
  () => import("@/components/finance/transaction-list").then((m) => m.TransactionList),
  { loading: () => <TableSkeleton rows={10} /> },
);

const SOURCE_LABELS: Record<string, string> = {
  sale: "Penjualan", purchase: "Pembayaran Supplier", expense: "Biaya",
  transfer_in: "Transfer Masuk", transfer_out: "Transfer Keluar",
  adjustment: "Penyesuaian", capital_in: "Setor Modal", capital_out: "Tarik Modal",
};

type Filter = "all" | "inflow" | "outflow";

export default function LedgerPage() {
  const { wallets, transactions, loadWallets, loadTransactions, isLoading } = useWalletStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [walletFilter, setWalletFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    loadWallets();
    loadTransactions(undefined, { limit: 200 });
  }, []);

  const walletNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const w of wallets) map[w.id] = w.name;
    return map;
  }, [wallets]);

  const filtered = useMemo(() => {
    let result = transactions;
    if (filter === "inflow") result = result.filter((t) => t.type === "credit");
    if (filter === "outflow") result = result.filter((t) => t.type === "debit");
    if (sourceFilter !== "all") result = result.filter((t) => t.sourceType === sourceFilter);
    if (walletFilter !== "all") result = result.filter((t) => t.walletId === walletFilter);
    if (dateFrom) result = result.filter((t) => new Date(t.transactionDate) >= new Date(dateFrom));
    if (dateTo) result = result.filter((t) => new Date(t.transactionDate) <= new Date(dateTo + "T23:59:59"));
    return result;
  }, [transactions, filter, sourceFilter, walletFilter, dateFrom, dateTo]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) set.add(t.sourceType);
    return Array.from(set);
  }, [transactions]);

  const inflow = filtered.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const outflow = filtered.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);

  return (
    <Container>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Ledger Keuangan</h1>
        <p className="mt-1 text-sm text-neutral-500">Seluruh riwayat mutasi dana dari semua wallet</p>
        <div className="mt-2 flex gap-2 text-xs">
          <span className="text-green-600">Masuk: Rp {inflow.toLocaleString("id-ID")}</span>
          <span className="text-red-600">Keluar: Rp {outflow.toLocaleString("id-ID")}</span>
          <span className={cn("font-medium", inflow - outflow >= 0 ? "text-blue-600" : "text-amber-600")}>
            Net: Rp {(inflow - outflow).toLocaleString("id-ID")}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-900">
          {(["all", "inflow", "outflow"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1 text-xs font-medium rounded-md", filter === f ? "bg-white shadow-sm text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50" : "text-neutral-500")}>
              {f === "all" ? "Semua" : f === "inflow" ? "Masuk" : "Keluar"}
            </button>
          ))}
        </div>

        <select value={walletFilter} onChange={(e) => setWalletFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50">
          <option value="all">Semua Wallet</option>
          {wallets.filter((w) => !w.isArchived).map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50">
          <option value="all">Semua Jenis</option>
          {sources.map((s) => (
            <option key={s} value={s}>{SOURCE_LABELS[s] ?? s}</option>
          ))}
        </select>

        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
        <span className="text-xs text-neutral-400 self-center">s/d</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
      </div>

      {/* Table */}
      <WidgetErrorBoundary title="Ledger">
        <TransactionList
          transactions={filtered}
          isLoading={isLoading}
          showWallet
          walletNames={walletNames}
        />
      </WidgetErrorBoundary>
    </Container>
  );
}
