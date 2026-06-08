"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { applyFilters, defaultFilters } from "@/lib/report-filters";
import { resolveDateRange, formatCurrencyID, formatDateID } from "@/lib/date-utils";
import { cn } from "@/lib/cn";
import { exportTableToPdf } from "@/lib/export-pdf";
import { exportToExcel } from "@/lib/export-excel";
import { ReportDateFilter } from "./report-date-filter";
import { ExportBar } from "./export-bar";
import type { DateRange, SortConfig, ExportFormat } from "@/types/report";
import type { Transaction, TransactionItem } from "@/types/transaction";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FlatSalesRow {
  // Invoice metadata (set only on first row of each invoice)
  invoiceNumber: string;
  tanggal: string;
  waktu: string;
  kasir: string;
  metodeBayar: string;
  totalInvoice: number;
  itemCount: number;
  isFirst: boolean; // true = render rowSpan cells

  // Product data (every row)
  productName: string;
  quantity: number;
  unitPrice: number;
  revenue: number;
  hpp: number;
  profit: number;
  margin: number;
  hasAllocations: boolean;

  // needed for export/pagination
  txnId: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const METHOD_LABELS: Record<string, string> = {
  cash: "Tunai", debit: "Debit", credit: "Kredit", qris: "QRIS", transfer: "Transfer",
};

const INVOICE_PAGE_SIZE = 5; // invoices per page

function buildFlatRows(
  transactions: Transaction[],
  hppMap: Map<string, Map<string, number>>,
): FlatSalesRow[] {
  const rows: FlatSalesRow[] = [];
  for (const txn of transactions) {
    const date = new Date(txn.createdAt);
    const methods = txn.payments.map((p) => METHOD_LABELS[p.method] ?? "—").join(", ");
    const itemHppMap = hppMap.get(txn.id);
    const hasAllocs = itemHppMap && itemHppMap.size > 0;

    txn.items.forEach((item, i) => {
      const itemId = item.id ?? "";
      const hpp = itemHppMap?.get(itemId) ?? 0;
      const profit = item.subtotal - hpp; // hpp=0 when no allocation → profit=revenue correctly
      const margin = item.subtotal > 0 && hpp > 0 ? Math.round((profit / item.subtotal) * 100) : 0;

      rows.push({
        invoiceNumber: txn.invoiceNumber,
        tanggal: date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" }),
        waktu: date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        kasir: txn.cashierName,
        metodeBayar: methods || "—",
        totalInvoice: txn.total,
        itemCount: txn.items.length,
        isFirst: i === 0,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        revenue: item.subtotal,
        hpp,
        profit,
        margin,
        hasAllocations: hasAllocs ?? false,
        txnId: txn.id,
      });
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/*  Profit color helper                                                 */
/* ------------------------------------------------------------------ */

function profitColor(profit: number, hasAllocs: boolean): string {
  if (!hasAllocs) return "text-neutral-400";
  if (profit > 0) return "text-green-600 dark:text-green-400";
  if (profit < 0) return "text-red-600 dark:text-red-400";
  return "text-neutral-500";
}

function profitBg(profit: number): string {
  if (profit > 0) return "bg-green-50 dark:bg-green-950/30";
  if (profit < 0) return "bg-red-50 dark:bg-red-950/30";
  return "";
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

export function SalesTable({ branchId = "all" }: { branchId?: string }) {
  const loadTxns = useTransactionStore((s) => s.loadDemoTransactions);
  const isLoaded = useTransactionStore((s) => s.isLoaded);
  const isLoading = useTransactionStore((s) => s.isLoading);
  const transactions = useTransactionStore((s) => s.transactions);
  const saleAllocations = useInventoryStore((s) => s.saleAllocations);

  useEffect(() => {
    if (!isLoaded) loadTxns();
  }, [isLoaded, loadTxns]);

  const [dateRange, setDateRange] = useState<DateRange>(() => resolveDateRange("last7"));
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ key: "createdAt", direction: "desc" });
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  /* ---- Build per-item HPP map from allocations ---- */
  const hppMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const a of saleAllocations) {
      if (!a.transactionItemId) continue;
      const inner = map.get(a.transactionId) ?? new Map<string, number>();
      inner.set(a.transactionItemId, (inner.get(a.transactionItemId) ?? 0) + a.quantity * a.costPrice);
      map.set(a.transactionId, inner);
    }
    return map;
  }, [saleAllocations]);

  /* ---- Filter transactions ---- */
  const handleDateChange = (range: DateRange) => {
    setDateRange(range);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  // Get all filtered transactions (no pagination — we paginate invoices ourselves)
  const allFilteredTxns = useMemo(() => {
    let source = transactions;
    // Branch filter — transactions have pharmacyId
    if (branchId !== "all") {
      source = source.filter((t) => t.pharmacyId === branchId);
    }
    const all = applyFilters(source, {
      ...defaultFilters(dateRange),
      searchQuery,
      sort,
      page: 1,
      pageSize: source.length,  // get ALL matches
    });
    return all.result;
  }, [transactions, dateRange, searchQuery, sort, branchId]);

  /* ---- Build flat rows from filtered transactions ---- */
  const allFlatRows = useMemo(
    () => buildFlatRows(allFilteredTxns, hppMap),
    [allFilteredTxns, hppMap],
  );

  /* ---- Paginate at invoice level (keep invoices together) ---- */
  const paginatedRows = useMemo(() => {
    // Group by invoice
    const invoiceGroups: FlatSalesRow[][] = [];
    let currentGroup: FlatSalesRow[] = [];
    for (const row of allFlatRows) {
      if (row.isFirst && currentGroup.length > 0) {
        invoiceGroups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(row);
    }
    if (currentGroup.length > 0) invoiceGroups.push(currentGroup);

    // Paginate invoice groups
    const totalInvoices = invoiceGroups.length;
    const totalInvoicePages = Math.max(1, Math.ceil(totalInvoices / INVOICE_PAGE_SIZE));
    const startIdx = (page - 1) * INVOICE_PAGE_SIZE;
    const endIdx = Math.min(startIdx + INVOICE_PAGE_SIZE, totalInvoices);

    return {
      rows: invoiceGroups.slice(startIdx, endIdx).flat(),
      totalInvoices,
      totalInvoicePages,
    };
  }, [allFlatRows, page]);

  /* ---- Export: full data (all invoices, all items) ---- */
  const allExportRows = useMemo(
    () => buildFlatRows(allFilteredTxns, hppMap),
    [allFilteredTxns, hppMap],
  );

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      if (format === "pdf" && tableRef.current) {
        await exportTableToPdf(tableRef.current, "Laporan Penjualan");
        toast.success("PDF berhasil diunduh");
      } else if (format === "excel") {
        const excelData = allExportRows.map((r) => ({
          invoiceNumber: r.invoiceNumber,
          tanggal: r.tanggal,
          kasir: r.kasir,
          metodeBayar: r.metodeBayar,
          product: r.productName,
          qty: r.quantity,
          unitPrice: r.unitPrice,
          revenue: r.revenue,
          hpp: r.hpp,
          profit: r.profit,
          margin: r.hasAllocations ? `${r.margin}%` : "—",
          totalInvoice: r.totalInvoice,
        }));
        exportToExcel(excelData, [
          { key: "invoiceNumber", label: "Invoice" },
          { key: "tanggal", label: "Tanggal" },
          { key: "kasir", label: "Kasir" },
          { key: "metodeBayar", label: "Metode Bayar" },
          { key: "product", label: "Produk" },
          { key: "qty", label: "Qty" },
          { key: "unitPrice", label: "Harga Satuan" },
          { key: "revenue", label: "Revenue" },
          { key: "hpp", label: "HPP" },
          { key: "profit", label: "Profit" },
          { key: "margin", label: "Margin %" },
          { key: "totalInvoice", label: "Total Invoice" },
        ], "Laporan_Penjualan");
        toast.success("Excel berhasil diunduh");
      }
    } catch {
      toast.error("Gagal mengekspor — coba lagi");
    } finally {
      setIsExporting(false);
    }
  };

  /* ---- Loading state ---- */
  if (isLoading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ReportDateFilter range={dateRange} onChange={handleDateChange} />
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Cari invoice, kasir, produk..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-[220px] rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
            />
          </div>
          <ExportBar onExport={handleExport} isExporting={isExporting} />
        </div>
      </div>

      {/* Table */}
      <div
        ref={tableRef}
        className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800"
      >
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="w-[10%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Invoice
              </th>
              <th className="w-[9%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Tanggal
              </th>
              <th className="w-[8%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Kasir
              </th>
              <th className="w-[8%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Bayar
              </th>
              <th className="w-[12%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Produk
              </th>
              <th className="w-[5%] px-2 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Qty
              </th>
              <th className="w-[10%] px-2 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Harga
              </th>
              <th className="w-[10%] px-2 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Revenue
              </th>
              <th className="w-[9%] px-2 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                HPP
              </th>
              <th className="w-[9%] px-2 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Profit
              </th>
              <th className="w-[4%] px-1 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                M%
              </th>
              <th className="w-[9%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Total Inv
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {paginatedRows.rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-sm text-neutral-400">
                  <ReceiptText className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Tidak ada transaksi untuk periode ini
                </td>
              </tr>
            ) : (
              paginatedRows.rows.map((row, idx) => (
                <tr
                  key={`${row.txnId}-${row.productName}-${idx}`}
                  className={cn(
                    "group",
                    !row.isFirst && "border-neutral-50 dark:border-neutral-800/50",
                  )}
                >
                  {/* Invoice metadata — rowSpan on first row */}
                  {row.isFirst && (
                    <>
                      <td
                        rowSpan={row.itemCount}
                        className="px-3 py-2.5 align-top border-r border-neutral-100 dark:border-neutral-800"
                      >
                        <span className="text-xs font-mono font-medium text-neutral-900 dark:text-neutral-50">
                          {row.invoiceNumber}
                        </span>
                      </td>
                      <td
                        rowSpan={row.itemCount}
                        className="px-3 py-2.5 align-top border-r border-neutral-100 dark:border-neutral-800"
                      >
                        <div className="text-xs text-neutral-600 dark:text-neutral-400">
                          <div>{row.tanggal}</div>
                          <div className="text-[10px] text-neutral-400">{row.waktu}</div>
                        </div>
                      </td>
                      <td
                        rowSpan={row.itemCount}
                        className="px-3 py-2.5 align-top border-r border-neutral-100 dark:border-neutral-800"
                      >
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">
                          {row.kasir}
                        </span>
                      </td>
                      <td
                        rowSpan={row.itemCount}
                        className="px-3 py-2.5 align-top border-r border-neutral-100 dark:border-neutral-800"
                      >
                        <span className="text-[10px] text-neutral-500">{row.metodeBayar}</span>
                      </td>
                    </>
                  )}

                  {/* Product data — every row */}
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-neutral-800 dark:text-neutral-200">
                      {row.productName}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
                      {row.quantity}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
                      {row.unitPrice.toLocaleString("id-ID")}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <span className="text-xs font-medium tabular-nums text-neutral-700 dark:text-neutral-300">
                      {formatCurrencyID(row.revenue)}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <span className="text-xs tabular-nums text-neutral-500">
                      {row.hasAllocations ? formatCurrencyID(row.hpp) : "—"}
                    </span>
                  </td>
                  <td className={cn("px-2 py-2.5 text-right", profitBg(row.profit))}>
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        profitColor(row.profit, row.hasAllocations),
                      )}
                    >
                      {row.hasAllocations
                        ? (row.profit >= 0 ? "+" : "") + formatCurrencyID(row.profit)
                        : "—"}
                    </span>
                  </td>
                  <td className={cn("px-1 py-2.5 text-center", profitBg(row.profit))}>
                    <span
                      className={cn("text-xs font-medium tabular-nums", profitColor(row.profit, row.hasAllocations))}
                    >
                      {row.hasAllocations ? row.margin + "%" : "—"}
                    </span>
                  </td>

                  {/* Total Invoice — rowSpan on first row */}
                  {row.isFirst && (
                    <td
                      rowSpan={row.itemCount}
                      className="px-3 py-2.5 align-top text-right border-l border-neutral-100 dark:border-neutral-800"
                    >
                      <span className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
                        {formatCurrencyID(row.totalInvoice)}
                      </span>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
        <span>
          Menampilkan {Math.min((page - 1) * INVOICE_PAGE_SIZE + 1, paginatedRows.totalInvoices)}–
          {Math.min(page * INVOICE_PAGE_SIZE, paginatedRows.totalInvoices)} dari{" "}
          {paginatedRows.totalInvoices} invoice
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-neutral-200 p-1.5 disabled:opacity-30 dark:border-neutral-700"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="tabular-nums">
            {page} / {paginatedRows.totalInvoicePages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(paginatedRows.totalInvoicePages, p + 1))}
            disabled={page >= paginatedRows.totalInvoicePages}
            className="rounded-lg border border-neutral-200 p-1.5 disabled:opacity-30 dark:border-neutral-700"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
