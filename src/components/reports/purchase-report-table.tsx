"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useInventoryStore } from "@/store/inventory-store";
import { exportTableToPdf } from "@/lib/export-pdf";
import { ExportBar } from "./export-bar";
import { useReportExport } from "@/hooks/use-report-export";
import type { PurchaseStatus } from "@/types/inventory";
import { cn } from "@/lib/cn";
import { formatCurrencyID } from "@/lib/date-utils";

const STATUS_STYLE: Record<PurchaseStatus, { cls: string; label: string }> = {
  paid: { cls: "text-green-600 bg-green-50 dark:bg-green-950/30", label: "Lunas" },
  partial: { cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", label: "Sebagian" },
  unpaid: { cls: "text-red-600 bg-red-50 dark:bg-red-950/30", label: "Belum" },
};

const STATUS_FILTERS = [
  { label: "Semua", value: "all" },
  { label: "Lunas", value: "paid" },
  { label: "Sebagian", value: "partial" },
  { label: "Belum", value: "unpaid" },
];

// TODO: branch isolation pending schema support — purchase_invoices has no pharmacy_id column
export function PurchaseReportTable({ branchId: _branchId = "all" }: { branchId?: string }) {
  const isLoading = useInventoryStore((s) => s.isLoading);
  const load = useInventoryStore((s) => s.loadDemoData);
  const batches = useInventoryStore((s) => s.batches);
  const invoices = useInventoryStore((s) => s.purchaseInvoices);
  const { tableRef, isExporting, handleExport } = useReportExport({
    title: "Laporan Pembelian",
    getExcelData: () => invoices.map((inv) => ({ supplier: inv.supplierName, invoice: inv.invoiceNumber, status: inv.status, total: inv.totalAmount, paid: inv.paidAmount })),
    getExcelColumns: () => [{ key: "supplier", label: "Supplier" }, { key: "invoice", label: "Invoice" }, { key: "status", label: "Status" }, { key: "total", label: "Total" }, { key: "paid", label: "Dibayar" }],
  });

  useEffect(() => {
    if (batches.length === 0) load();
  }, [batches.length, load]);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    let result = invoices;
    if (statusFilter !== "all") result = result.filter((i) => i.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.supplierName.toLowerCase().includes(q),
      );
    }
    return result.sort(
      (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime(),
    );
  }, [invoices, statusFilter, searchQuery]);

  const totalOutstanding = useMemo(
    () => invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0),
    [invoices],
  );

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
    <div ref={tableRef}>
      {/* Summary */}
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30">
        <span className="text-[10px] font-medium text-red-600">
          Total Hutang: {formatCurrencyID(totalOutstanding)}
        </span>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                statusFilter === f.value
                  ? "bg-brand-600 text-white"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari invoice atau supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          />
        </div>
        <ExportBar onExport={handleExport} isExporting={isExporting} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="w-[20%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Invoice</th>
              <th className="w-[22%] hidden sm:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Supplier</th>
              <th className="w-[14%] hidden sm:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Tanggal</th>
              <th className="w-[14%] hidden md:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Jatuh Tempo</th>
              <th className="w-[12%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Status</th>
              <th className="w-[12%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Total</th>
              <th className="w-[10%] hidden md:table-cell px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Sisa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-400">
                  <ShoppingCart className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Tidak ada invoice pembelian
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const st = STATUS_STYLE[inv.status];
                const remaining = inv.totalAmount - inv.paidAmount;

                return (
                  <tr key={inv.id} className="group">
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-mono font-medium text-neutral-900 dark:text-neutral-50">
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5">
                      <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate block">
                        {inv.supplierName}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5">
                      <span className="text-xs text-neutral-500">
                        {new Date(inv.purchaseDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5">
                      <span className={cn("text-xs", inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== "paid" ? "text-red-600 font-medium" : "text-neutral-500")}>
                        {inv.dueDate
                          ? new Date(inv.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })
                          : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
                        {formatCurrencyID(inv.totalAmount)}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5 text-right">
                      <span className={cn("text-xs tabular-nums", remaining > 0 ? "text-red-600 font-medium" : "text-green-600")}>
                        {remaining > 0 ? formatCurrencyID(remaining) : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
