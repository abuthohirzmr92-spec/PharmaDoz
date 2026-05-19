"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ChevronDown, ChevronRight, Package } from "lucide-react";
import { useInventoryStore } from "@/store/inventory-store";
import { cn } from "@/lib/cn";
import { getDaysUntilExpiry, buildInventoryProducts } from "@/lib/inventory-demo";

export function InventoryStockTable() {
  const searchQuery = useInventoryStore((s) => s.searchQuery);
  const setSearchQuery = useInventoryStore((s) => s.setSearchQuery);
  const loadDemoData = useInventoryStore((s) => s.loadDemoData);
  const batches = useInventoryStore((s) => s.batches);
  const products = useMemo(() => buildInventoryProducts(batches), [batches]);

  useEffect(() => {
    if (batches.length === 0) loadDemoData();
  }, [batches.length, loadDemoData]);

  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!searchQuery) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.batches.some((b) => b.batchNumber.toLowerCase().includes(q)),
    );
  }, [products, searchQuery]);

  
  return (
    <div>
      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Cari produk, kategori, atau batch..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="w-[5%] px-3 py-2.5" />
              <th className="w-[30%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Produk
              </th>
              <th className="w-[15%] hidden sm:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Kategori
              </th>
              <th className="w-[12%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Stok
              </th>
              <th className="w-[12%] hidden sm:table-cell px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Batch
              </th>
              <th className="w-[26%] hidden md:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Status Batch
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-neutral-400">
                  <Package className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Produk tidak ditemukan
                </td>
              </tr>
            ) : (
              filtered.map((product) => {
                const isExpanded = expandedProduct === product.id;
                const fefoBatches = [...product.batches].sort(
                  (a, b) =>
                    new Date(a.expiredDate).getTime() -
                    new Date(b.expiredDate).getTime(),
                );
                const hasNearExpiry = fefoBatches.some(
                  (b) => getDaysUntilExpiry(b.expiredDate) <= 90 && b.quantity > 0,
                );
                const hasExpired = fefoBatches.some(
                  (b) => getDaysUntilExpiry(b.expiredDate) < 0 && b.quantity > 0,
                );

                return (
                  <tr key={product.id} className="group">
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() =>
                          setExpandedProduct(isExpanded ? null : product.id)
                        }
                        className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
                          {product.name}
                        </span>
                        {product.requiresPrescription && (
                          <span className="shrink-0 rounded bg-red-50 px-1 py-0.5 text-[9px] font-semibold text-red-600 dark:bg-red-950/30">
                            R
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5">
                      <span className="text-xs text-neutral-500">{product.category}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          product.totalStock <= product.minStock
                            ? "text-amber-600"
                            : product.totalStock === 0
                              ? "text-red-500"
                              : "text-neutral-900 dark:text-neutral-50",
                        )}
                      >
                        {product.totalStock}
                      </span>
                      {product.totalStock <= product.minStock && product.totalStock > 0 && (
                        <span className="ml-1 text-[10px] text-amber-500">MIN</span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5 text-right">
                      <span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-400">
                        {product.batches.filter((b) => b.quantity > 0).length}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5">
                      <div className="flex gap-1">
                        {hasExpired && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-red-600 bg-red-50 dark:bg-red-950/30">
                            EXP
                          </span>
                        )}
                        {hasNearExpiry && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30">
                            DE
                          </span>
                        )}
                        {!hasExpired && !hasNearExpiry && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-green-600 bg-green-50 dark:bg-green-950/30">
                            OK
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded: batch detail for selected product */}
      {expandedProduct && (
        <BatchDetailPanel
          productId={expandedProduct}
          onClose={() => setExpandedProduct(null)}
        />
      )}
    </div>
  );
}

function BatchDetailPanel({
  productId,
  onClose,
}: {
  productId: string;
  onClose: () => void;
}) {
  const batches = useInventoryStore((s) => s.batches);
  const productBatches = useMemo(
    () =>
      batches
        .filter((b) => b.productId === productId)
        .sort(
          (a, b) =>
            new Date(a.expiredDate).getTime() -
            new Date(b.expiredDate).getTime(),
        ),
    [batches, productId],
  );

  if (productBatches.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-950/20">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Detail Batch — {productBatches[0]?.productName}
        </h4>
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
              Batch
            </th>
            <th className="py-1.5 pr-2 text-right text-[10px] font-medium text-neutral-400">
              Qty
            </th>
            <th className="py-1.5 pr-2 text-right text-[10px] font-medium text-neutral-400">
              HPP
            </th>
            <th className="py-1.5 pr-2 text-right text-[10px] font-medium text-neutral-400">
              Jual
            </th>
            <th className="py-1.5 pr-2 text-right text-[10px] font-medium text-neutral-400">
              ED
            </th>
            <th className="py-1.5 text-left text-[10px] font-medium text-neutral-400">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {productBatches.map((b) => {
            const days = getDaysUntilExpiry(b.expiredDate);
            const isExpired = days < 0;
            const isNear = days >= 0 && days <= 90;

            return (
              <tr key={b.id}>
                <td className="py-1.5 pr-2 font-mono text-neutral-700 dark:text-neutral-300">
                  {b.batchNumber}
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums font-medium">
                  {b.quantity}
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-neutral-500">
                  {b.unitPrice.toLocaleString("id-ID")}
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-neutral-500">
                  {b.sellingPrice.toLocaleString("id-ID")}
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-neutral-500">
                  {new Date(b.expiredDate).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "2-digit",
                  })}
                </td>
                <td className="py-1.5">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      isExpired
                        ? "text-red-600 bg-red-50 dark:bg-red-950/30"
                        : isNear
                          ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                          : "text-green-600 bg-green-50 dark:bg-green-950/30",
                    )}
                  >
                    {isExpired
                      ? `EXPIRED`
                      : isNear
                        ? `${days}h`
                        : `OK (${days}h)`}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
