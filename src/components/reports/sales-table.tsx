"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { useTransactionStore } from "@/store/transaction-store";
import { applyFilters, defaultFilters } from "@/lib/report-filters";
import { resolveDateRange, formatCurrencyID, formatDateID } from "@/lib/date-utils";
import { exportTableToPdf } from "@/lib/export-pdf";
import { exportToExcel } from "@/lib/export-excel";
import { ReportDateFilter } from "./report-date-filter";
import { ExportBar } from "./export-bar";
import type { DateRange, SortConfig, ExportFormat } from "@/types/report";

const METHOD_LABELS: Record<string, string> = {
  cash: "Tunai", debit: "Debit", credit: "Kredit", qris: "QRIS", transfer: "Transfer",
};

const PAGE_SIZE = 25;

function SortIcon({ column, sort }: { column: string; sort: SortConfig }) {
  if (sort.key !== column) return <ChevronDown className="h-3 w-3 text-neutral-300" />;
  return sort.direction === "asc" ? (
    <ChevronUp className="h-3 w-3 text-brand-600" />
  ) : (
    <ChevronDown className="h-3 w-3 text-brand-600" />
  );
}

export function SalesTable() {
  const loadTxns = useTransactionStore((s) => s.loadDemoTransactions);
  const isLoaded = useTransactionStore((s) => s.isLoaded);
  const isLoading = useTransactionStore((s) => s.isLoading);
  const transactions = useTransactionStore((s) => s.transactions);

  useEffect(() => {
    if (!isLoaded) loadTxns();
  }, [isLoaded, loadTxns]);

  const [dateRange, setDateRange] = useState<DateRange>(() => resolveDateRange("last7"));
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortConfig>({ key: "createdAt", direction: "desc" });
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const handleDateChange = (range: DateRange) => {
    setDateRange(range);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const filters = useMemo(
    () => ({
      ...defaultFilters(dateRange),
      searchQuery,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    [dateRange, searchQuery, sort, page],
  );

  const { result, totalCount } = useMemo(
    () => applyFilters(transactions, filters),
    [transactions, filters],
  );

  // Full filtered data (all pages) for export
  const allFiltered = useMemo(() => {
    const all = applyFilters(transactions, {
      ...defaultFilters(dateRange),
      searchQuery,
      sort,
      page: 1,
      pageSize: totalCount,
    });
    return all.result;
  }, [transactions, dateRange, searchQuery, sort, totalCount]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (isLoading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  const handleSort = (key: string) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  };

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      if (format === "pdf" && tableRef.current) {
        await exportTableToPdf(tableRef.current, "Laporan Penjualan");
        toast.success("PDF berhasil diunduh");
      } else if (format === "excel") {
        const excelData = allFiltered.map((t) => ({
          invoiceNumber: t.invoiceNumber,
          tanggal: formatDateID(t.createdAt),
          kasir: t.cashierName,
          item: t.items.reduce((s, i) => s + i.quantity, 0),
          subtotal: t.subtotal,
          diskon: t.discount,
          pajak: t.tax,
          total: t.total,
          metode: t.payments.map((p) => p.method).join(", "),
        }));
        exportToExcel(excelData, [
          { key: "invoiceNumber", label: "Invoice" },
          { key: "tanggal", label: "Tanggal" },
          { key: "kasir", label: "Kasir" },
          { key: "item", label: "Item" },
          { key: "subtotal", label: "Subtotal" },
          { key: "diskon", label: "Diskon" },
          { key: "pajak", label: "Pajak" },
          { key: "total", label: "Total" },
          { key: "metode", label: "Metode Bayar" },
        ], "Laporan_Penjualan");
        toast.success("Excel berhasil diunduh");
      }
    } catch {
      toast.error("Gagal mengekspor — coba lagi");
    } finally {
      setIsExporting(false);
    }
  };

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
      <div ref={tableRef} className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th
                className="w-[18%] cursor-pointer px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500"
                onClick={() => handleSort("invoiceNumber")}
              >
                <span className="inline-flex items-center gap-1">
                  Invoice <SortIcon sort={sort} column="invoiceNumber" />
                </span>
              </th>
              <th
                className="w-[14%] hidden sm:table-cell cursor-pointer px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500"
                onClick={() => handleSort("createdAt")}
              >
                <span className="inline-flex items-center gap-1">
                  Tanggal <SortIcon sort={sort} column="createdAt" />
                </span>
              </th>
              <th className="w-[14%] hidden md:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Kasir
              </th>
              <th className="w-[10%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Item
              </th>
              <th className="w-[12%] hidden sm:table-cell px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Subtotal
              </th>
              <th
                className="w-[12%] cursor-pointer px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500"
                onClick={() => handleSort("total")}
              >
                <span className="inline-flex items-center gap-1">
                  Total <SortIcon sort={sort} column="total" />
                </span>
              </th>
              <th className="w-[12%] hidden md:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Bayar
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {result.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-400">
                  <ReceiptText className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Tidak ada transaksi untuk periode ini
                </td>
              </tr>
            ) : (
              result.map((txn) => {
                const methodLabel =
                  METHOD_LABELS[txn.payments[0]?.method ?? ""] ?? "—";
                const date = new Date(txn.createdAt);

                return (
                  <tr key={txn.id} className="group">
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-mono font-medium text-neutral-900 dark:text-neutral-50">
                        {txn.invoiceNumber}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5">
                      <div className="text-xs text-neutral-500">
                        <div>{date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}</div>
                        <div className="text-[10px] text-neutral-400">
                          {date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5">
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        {txn.cashierName}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
                        {txn.items.length}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5 text-right">
                      <span className="text-xs tabular-nums text-neutral-500">
                        {txn.subtotal.toLocaleString("id-ID")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
                        {formatCurrencyID(txn.total)}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5">
                      <span className="rounded bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {methodLabel}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
        <span>
          Menampilkan {Math.min((page - 1) * PAGE_SIZE + 1, totalCount)}–{Math.min(page * PAGE_SIZE, totalCount)} dari {totalCount}
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
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-neutral-200 p-1.5 disabled:opacity-30 dark:border-neutral-700"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
