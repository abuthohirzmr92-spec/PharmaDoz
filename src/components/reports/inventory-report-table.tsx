"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Package } from "lucide-react";
import { useInventoryStore } from "@/store/inventory-store";
import { buildInventoryProducts } from "@/lib/inventory-demo";
import { cn } from "@/lib/cn";

export function InventoryReportTable() {
  const isLoading = useInventoryStore((s) => s.isLoading);
  const load = useInventoryStore((s) => s.loadDemoData);
  const batches = useInventoryStore((s) => s.batches);
  const products = useMemo(() => buildInventoryProducts(batches), [batches]);

  useEffect(() => {
    if (batches.length === 0) load();
  }, [batches.length, load]);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = useMemo(
    () => ["all", ...new Set(products.map((p) => p.category))],
    [products],
  );

  const filtered = useMemo(() => {
    let result = products;
    if (categoryFilter !== "all") result = result.filter((p) => p.category === categoryFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.batches.some((b) => b.batchNumber.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [products, categoryFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  const stockStatus = (p: typeof products[number]) => {
    if (p.totalStock === 0) return { label: "Habis", cls: "text-red-600 bg-red-50 dark:bg-red-950/30" };
    if (p.totalStock <= p.minStock) return { label: "Menipis", cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" };
    return { label: "OK", cls: "text-green-600 bg-green-50 dark:bg-green-950/30" };
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari produk atau batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
        >
          <option value="all">Semua Kategori</option>
          {categories.filter((c) => c !== "all").map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="w-[30%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Produk</th>
              <th className="w-[18%] hidden sm:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Kategori</th>
              <th className="w-[14%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Stok</th>
              <th className="w-[14%] hidden sm:table-cell px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Min</th>
              <th className="w-[12%] hidden md:table-cell px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Batch</th>
              <th className="w-[12%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-neutral-400">
                  <Package className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Tidak ada produk
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const status = stockStatus(p);
                const activeBatches = p.batches.filter((b) => b.quantity > 0).length;

                return (
                  <tr key={p.id} className="group">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-neutral-900 dark:text-neutral-50 truncate">
                          {p.name}
                        </span>
                        {p.requiresPrescription && (
                          <span className="shrink-0 rounded bg-red-50 px-1 py-0.5 text-[9px] font-semibold text-red-600 dark:bg-red-950/30">R</span>
                        )}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5">
                      <span className="text-xs text-neutral-500">{p.category}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={cn("text-sm font-semibold tabular-nums", p.totalStock === 0 ? "text-red-600" : p.totalStock <= p.minStock ? "text-amber-600" : "text-neutral-900 dark:text-neutral-50")}>
                        {p.totalStock}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5 text-right">
                      <span className="text-xs tabular-nums text-neutral-400">{p.minStock}</span>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5 text-right">
                      <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-400">{activeBatches}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", status.cls)}>
                        {status.label}
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
