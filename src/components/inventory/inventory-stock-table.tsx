"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Package } from "lucide-react";
import { useInventoryStore } from "@/store/inventory-store";
import { useProductCatalog } from "@/hooks/use-product-catalog";
import { cn } from "@/lib/cn";
import { getDaysUntilExpiry, buildInventoryProducts } from "@/lib/inventory-demo";
import { useWorkspaceSelection } from "@/components/shared/workspace";

/* ------------------------------------------------------------------ */
/*  Main Component — Product Master Table for Workspace                 */
/* ------------------------------------------------------------------ */

export function InventoryStockTable() {
  const searchQuery = useInventoryStore((s) => s.searchQuery);
  const setSearchQuery = useInventoryStore((s) => s.setSearchQuery);
  const loadDemoData = useInventoryStore((s) => s.loadDemoData);
  const batches = useInventoryStore((s) => s.batches);
  const { selectedId, select } = useWorkspaceSelection();

  // Product catalog
  const { catalog: productCatalog, isLoading: catalogLoading } = useProductCatalog();

  useEffect(() => {
    if (batches.length === 0) loadDemoData();
  }, [batches.length, loadDemoData]);

  // Merged products list
  const products = useMemo(() => {
    if (catalogLoading || productCatalog.size === 0) return [];

    const batchProducts = buildInventoryProducts(batches, productCatalog);
    const batchIds = new Set(batchProducts.map((p) => p.id));

    for (const [id, cat] of productCatalog) {
      if (!batchIds.has(id) && cat.name) {
        batchProducts.push({
          id,
          tenantId: "demo-tenant",
          name: cat.name,
          category: cat.category,
          barcode: cat.barcode,
          unit: cat.unit,
          unitLevels: cat.unitLevels,
          salesUnit: cat.unit,
          defaultPrice: cat.defaultPrice,
          defaultSellingPrice: cat.defaultSellingPrice,
          minStock: 5,
          totalStock: 0,
          batches: [],
          requiresPrescription: false,
          isActive: true,
        });
      }
    }

    return batchProducts;
  }, [batches, productCatalog, catalogLoading]);

  const handleSelectProduct = useCallback(
    (id: string) => {
      select(selectedId === id ? null : id);
    },
    [selectedId, select],
  );

  // Filtered products
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

  const isLoading = catalogLoading || productCatalog.size === 0;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Search — integrated into the workspace header area */}
      <div className="shrink-0 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari produk, kategori, atau batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          />
        </div>
      </div>

      {/* Product Table — single table with sticky header, body scrolls */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="hidden sm:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500" style={{ width: "10%" }}>Kategori</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Produk</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-500" style={{ width: "8%" }}>Stok</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500" style={{ width: "10%" }}>Satuan</th>
              <th className="hidden sm:table-cell px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500" style={{ width: "10%" }}>Harga</th>
              <th className="hidden sm:table-cell px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-500" style={{ width: "7%" }}>Batch</th>
              <th className="hidden md:table-cell px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-500" style={{ width: 84 }}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-400">
                  <div className="mx-auto mb-2 h-4 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  Memuat katalog produk...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-400">
                  <Package className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Produk tidak ditemukan
                </td>
              </tr>
            ) : (
              filtered.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  isSelected={selectedId === product.id}
                  onSelect={handleSelectProduct}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Keyboard shortcuts */}
      {searchQuery !== "" && (
        <div className="shrink-0 border-t border-neutral-100 px-4 py-2 dark:border-neutral-800">
          <div className="flex items-center gap-4 text-[10px] text-neutral-400">
            <span>
              <kbd className="rounded border border-neutral-300 px-1 py-0.5 font-mono text-[9px] dark:border-neutral-600">Ctrl+F</kbd> Cari
            </span>
            <span>
              <kbd className="rounded border border-neutral-300 px-1 py-0.5 font-mono text-[9px] dark:border-neutral-600">Esc</kbd> Clear
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Product Row                                                        */
/* ------------------------------------------------------------------ */

function ProductRow({
  product,
  isSelected,
  onSelect,
}: {
  product: ReturnType<typeof buildInventoryProducts>[number];
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const fefoBatches = useMemo(
    () =>
      [...product.batches]
        .filter((b) => b.quantity > 0)
        .sort((a, b) => new Date(a.expiredDate).getTime() - new Date(b.expiredDate).getTime()),
    [product.batches],
  );

  const hasNearExpiry = useMemo(
    () => fefoBatches.some((b) => getDaysUntilExpiry(b.expiredDate) <= 90),
    [fefoBatches],
  );
  const hasExpired = useMemo(
    () => fefoBatches.some((b) => getDaysUntilExpiry(b.expiredDate) < 0),
    [fefoBatches],
  );

  return (
    <tr
      onClick={() => onSelect(product.id)}
      className={cn(
        "cursor-pointer border-b border-neutral-100 transition-colors hover:bg-neutral-50 dark:border-neutral-800/50 dark:hover:bg-neutral-800/50",
        isSelected && "border-l-2 border-l-brand-500 bg-brand-50/50 dark:bg-brand-950/20",
      )}
    >
      <td className="hidden sm:table-cell px-3 py-2.5">
        <span className="text-xs text-neutral-500">{product.category}</span>
      </td>
      <td className="px-3 py-2.5 max-w-[200px]">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50" title={product.name}>
            {product.name}
          </span>
          {product.requiresPrescription && (
            <span className="shrink-0 rounded bg-red-50 px-1 py-0.5 text-[9px] font-semibold text-red-600 dark:bg-red-950/30">R</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-center">
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            product.totalStock <= product.minStock ? "text-amber-600"
            : product.totalStock === 0 ? "text-red-500"
            : "text-neutral-900 dark:text-neutral-50",
          )}
        >
          {product.totalStock}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
          {product.salesUnit || product.unit || "—"}
        </span>
      </td>
      <td className="hidden sm:table-cell px-3 py-2.5 text-right">
        <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
          {product.defaultSellingPrice
            ? `Rp ${product.defaultSellingPrice.toLocaleString("id-ID")}`
            : "—"}
        </span>
      </td>
      <td className="hidden sm:table-cell px-3 py-2.5 text-center">
        <span className="text-xs tabular-nums text-neutral-500">
          {product.batches.filter((b) => b.quantity > 0).length}
        </span>
      </td>
      <td className="hidden md:table-cell px-2 py-2.5">
        <div className="flex justify-center gap-1">
          {hasExpired && (
            <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-950/30">EXP</span>
          )}
          {hasNearExpiry && (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-950/30">DE</span>
          )}
          {!hasExpired && !hasNearExpiry && (
            <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:bg-green-950/30">OK</span>
          )}
        </div>
      </td>
    </tr>
  );
}
