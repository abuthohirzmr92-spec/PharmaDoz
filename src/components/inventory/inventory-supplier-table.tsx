"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Building2,
  Phone,
  Mail,
  ArrowUpDown,
} from "lucide-react";
import { useInventoryStore } from "@/store/inventory-store";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SortKey = "name" | "debt";

/* ------------------------------------------------------------------ */
/*  Supplier Table                                                     */
/* ------------------------------------------------------------------ */

export function InventorySupplierTable() {
  const suppliers = useInventoryStore((s) => s.suppliers);
  const invoices = useInventoryStore((s) => s.purchaseInvoices);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);

  /* ---- per-supplier metrics ---- */

  const supplierMetrics = useMemo(() => {
    return suppliers.map((s) => {
      const supplierInvoices = invoices.filter((inv) => inv.supplierId === s.id);
      const activeInvoices = supplierInvoices.filter((inv) => inv.status !== "paid");
      const totalDebt = activeInvoices.reduce(
        (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
        0,
      );
      return { supplier: s, activeInvoices, totalDebt };
    });
  }, [suppliers, invoices]);

  /* ---- filter & sort ---- */

  const filtered = useMemo(() => {
    let result = supplierMetrics;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.supplier.name.toLowerCase().includes(q) ||
          s.supplier.contactPerson.toLowerCase().includes(q) ||
          s.supplier.phone.includes(q),
      );
    }
    result = [...result].sort((a, b) => {
      if (sortKey === "name") {
        return sortAsc
          ? a.supplier.name.localeCompare(b.supplier.name)
          : b.supplier.name.localeCompare(a.supplier.name);
      }
      return sortAsc ? a.totalDebt - b.totalDebt : b.totalDebt - a.totalDebt;
    });
    return result;
  }, [supplierMetrics, searchQuery, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "name");
    }
  };

  const totalDebtAll = useMemo(
    () => supplierMetrics.reduce((s, m) => s + m.totalDebt, 0),
    [supplierMetrics],
  );

  /* ---- render ---- */

  return (
    <div>
      {/* Section heading */}
      <h3 className="mb-3 text-base font-semibold text-neutral-800 dark:text-neutral-200">
        Data Supplier
      </h3>

      {/* Summary + Search */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[10px] text-neutral-500">Total Supplier</span>
          <span className="ml-2 text-sm font-bold text-neutral-900 dark:text-neutral-50 tabular-nums">
            {suppliers.length}
          </span>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[10px] text-neutral-500">Total Hutang</span>
          <span className="ml-2 text-sm font-bold text-red-600 tabular-nums">
            Rp {Math.round(totalDebtAll).toLocaleString("id-ID")}
          </span>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="w-[5%] px-3 py-2.5" />
              <th
                className="w-[25%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 cursor-pointer select-none"
                onClick={() => toggleSort("name")}
              >
                <span className="inline-flex items-center gap-1">
                  Supplier
                  <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th className="w-[22%] hidden sm:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Kontak
              </th>
              <th className="w-[18%] hidden sm:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Telepon
              </th>
              <th className="w-[15%] px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Invoice Aktif
              </th>
              <th
                className="w-[15%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500 cursor-pointer select-none"
                onClick={() => toggleSort("debt")}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Hutang
                  <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-neutral-400">
                  <Building2 className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Tidak ada supplier
                </td>
              </tr>
            ) : (
              filtered.map(({ supplier: s, activeInvoices, totalDebt }) => {
                const isExpanded = expandedSupplier === s.id;
                return (
                  <tr
                    key={s.id}
                    className="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                  >
                    <td className="px-3 py-2.5">
                      {activeInvoices.length > 0 && (
                        <button
                          onClick={() =>
                            setExpandedSupplier(isExpanded ? null : s.id)
                          }
                          className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                        {s.name}
                      </span>
                      {!s.isActive && (
                        <span className="ml-2 text-[10px] text-neutral-400">
                          (nonaktif)
                        </span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                        <Mail className="h-3 w-3 text-neutral-400 shrink-0" />
                        <span className="truncate">{s.contactPerson}</span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                        <Phone className="h-3 w-3 text-neutral-400 shrink-0" />
                        <span>{s.phone}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {activeInvoices.length > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[1.5rem] rounded-full bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                          {activeInvoices.length}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">&mdash;</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {totalDebt > 0 ? (
                        <span className="text-sm font-semibold tabular-nums text-red-600">
                          Rp {Math.round(totalDebt).toLocaleString("id-ID")}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">&mdash;</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded: invoice history for selected supplier */}
      {expandedSupplier && (
        <SupplierInvoiceDetail
          supplierId={expandedSupplier}
          onClose={() => setExpandedSupplier(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Supplier Invoice Detail (expandable)                               */
/* ------------------------------------------------------------------ */

function SupplierInvoiceDetail({
  supplierId,
  onClose,
}: {
  supplierId: string;
  onClose: () => void;
}) {
  const invoices = useInventoryStore((s) => s.purchaseInvoices);
  const supplier = useInventoryStore((s) =>
    s.suppliers.find((sup) => sup.id === supplierId),
  );
  const supplierInvoices = invoices.filter(
    (inv) => inv.supplierId === supplierId && inv.status !== "paid",
  );

  if (!supplier) return null;

  return (
    <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-950/20">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {supplier.name}
          </h4>
          <p className="mt-0.5 text-[10px] text-neutral-500">
            {supplierInvoices.length} invoice aktif
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-[10px] text-neutral-400 hover:text-neutral-600"
        >
          Tutup
        </button>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-700">
            <th className="py-1.5 pr-2 text-left text-[10px] font-medium text-neutral-400">
              Invoice
            </th>
            <th className="py-1.5 pr-2 text-left text-[10px] font-medium text-neutral-400">
              Tgl
            </th>
            <th className="py-1.5 pr-2 text-left text-[10px] font-medium text-neutral-400">
              Status
            </th>
            <th className="py-1.5 pr-2 text-right text-[10px] font-medium text-neutral-400">
              Total
            </th>
            <th className="py-1.5 pr-2 text-right text-[10px] font-medium text-neutral-400">
              Dibayar
            </th>
            <th className="py-1.5 text-right text-[10px] font-medium text-neutral-400">
              Sisa
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {supplierInvoices.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="py-4 text-center text-[10px] text-neutral-400"
              >
                Tidak ada invoice aktif
              </td>
            </tr>
          ) : (
            supplierInvoices.map((inv) => {
              const remaining = inv.totalAmount - inv.paidAmount;
              return (
                <tr key={inv.id}>
                  <td className="py-1.5 pr-2 font-mono text-neutral-700 dark:text-neutral-300">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-1.5 pr-2 text-neutral-500">
                    {new Date(inv.purchaseDate).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td className="py-1.5 pr-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium",
                        inv.status === "partial"
                          ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                          : "text-red-600 bg-red-50 dark:bg-red-950/30",
                      )}
                    >
                      {inv.status === "partial" ? "Sebagian" : "Belum"}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums font-medium">
                    {inv.totalAmount.toLocaleString("id-ID")}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-neutral-500">
                    {inv.paidAmount.toLocaleString("id-ID")}
                  </td>
                  <td className="py-1.5 text-right tabular-nums font-medium text-red-600">
                    {remaining.toLocaleString("id-ID")}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
