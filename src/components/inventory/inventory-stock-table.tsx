"use client";

import { useState, useMemo, useEffect, memo, useCallback, Fragment } from "react";
import { Search, ChevronDown, ChevronRight, Package } from "lucide-react";
import { useInventoryStore } from "@/store/inventory-store";
import { useLocationMasterStore } from "@/store/location-master-store";
import { useProductStore } from "@/store/product-store";
import { cn } from "@/lib/cn";
import { getDaysUntilExpiry, buildInventoryProducts } from "@/lib/inventory-demo";
import type { InventoryProduct, ProductBatch } from "@/types/inventory";
import { BatchRelocateModal } from "./batch-relocate-modal";

/* ------------------------------------------------------------------ */
/*  Stock Row (memoized)                                               */
/* ------------------------------------------------------------------ */

const StockRow = memo(function StockRow({
  product,
  isExpanded,
  onToggleExpand,
  onRelocateBatch,
}: {
  product: ReturnType<typeof buildInventoryProducts>[number];
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onRelocateBatch: (batch: ProductBatch, productName: string) => void;
}) {
  // RC1 M2 — Location lookup map from storage area master
  const locationMaster = useLocationMasterStore((s) => s.locations);
  const locationMap = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    for (const loc of locationMaster) {
      map.set(loc.id, { code: loc.code, name: loc.name });
    }
    return map;
  }, [locationMaster]);

  const fefoBatches = useMemo(
    () =>
      [...product.batches].sort(
        (a, b) =>
          new Date(a.expiredDate).getTime() -
          new Date(b.expiredDate).getTime(),
      ),
    [product.batches],
  );
  const hasNearExpiry = useMemo(
    () =>
      fefoBatches.some(
        (b) => getDaysUntilExpiry(b.expiredDate) <= 90 && b.quantity > 0,
      ),
    [fefoBatches],
  );
  const hasExpired = useMemo(
    () =>
      fefoBatches.some(
        (b) => getDaysUntilExpiry(b.expiredDate) < 0 && b.quantity > 0,
      ),
    [fefoBatches],
  );

  const COLSPAN = 6;

  return (
    <Fragment>
      {/* Product row */}
      <tr className="group">
        <td className="px-3 py-2.5">
          <button
            onClick={() => onToggleExpand(product.id)}
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

      {/* Inline batch detail rows */}
      {isExpanded && fefoBatches.length > 0 && (
        <tr className="bg-neutral-50 dark:bg-neutral-900/50">
          <td colSpan={COLSPAN} className="px-6 py-2">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="py-1 pr-3 text-left text-[10px] font-medium text-neutral-400">Batch</th>
                  <th className="py-1 pr-3 text-right text-[10px] font-medium text-neutral-400">Qty</th>
                  <th className="py-1 pr-3 text-right text-[10px] font-medium text-neutral-400">HPP</th>
                  <th className="py-1 pr-3 text-right text-[10px] font-medium text-neutral-400">Jual</th>
                  <th className="py-1 pr-3 text-right text-[10px] font-medium text-neutral-400">ED</th>
                  <th className="py-1 pr-3 text-left text-[10px] font-medium text-neutral-400">Lokasi</th>
                  <th className="py-1 text-left text-[10px] font-medium text-neutral-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {fefoBatches.map((b) => {
                  const days = getDaysUntilExpiry(b.expiredDate);
                  const isExp = days < 0;
                  const isNear = days >= 0 && days <= 90;
                  return (
                    <tr key={b.id}>
                      <td className="py-1 pr-3 font-mono text-neutral-700 dark:text-neutral-300">{b.batchNumber}</td>
                      <td className="py-1 pr-3 text-right tabular-nums font-medium">{b.quantity}</td>
                      <td className="py-1 pr-3 text-right tabular-nums text-neutral-500">{b.unitPrice.toLocaleString("id-ID")}</td>
                      <td className="py-1 pr-3 text-right tabular-nums text-neutral-500">{b.sellingPrice.toLocaleString("id-ID")}</td>
                      <td className="py-1 pr-3 text-right tabular-nums text-neutral-500">
                        {new Date(b.expiredDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}
                      </td>
                      <td className="py-1 pr-3">
                        {(() => {
                          // --- RESOLUTION CHAIN ---
                          // Priority 1: Batch Location (REALITY)
                          const batchArea = b.storageAreaId ? locationMap.get(b.storageAreaId) : null;
                          if (batchArea) {
                            return (
                              <div>
                                <p className="text-[10px] font-medium text-neutral-700 dark:text-neutral-300">{batchArea.name}</p>
                                {b.storageSlot && <p className="text-[9px] text-neutral-400">{b.storageSlot}</p>}
                                {b.isRelocated ? (
                                  <span className="inline-block mt-0.5 rounded bg-amber-50 px-1 text-[8px] font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">Lokasi Dipindahkan</span>
                                ) : (
                                  <span className="inline-block mt-0.5 text-[8px] text-neutral-400">Mengikuti Lokasi Utama Produk</span>
                                )}
                              </div>
                            );
                          }

                          // Priority 2: Product Default Location (SUGGESTION)
                          const defaultAreaId = product.defaultStorageAreaId ?? null;
                          const defaultArea = defaultAreaId ? locationMap.get(defaultAreaId) : null;
                          if (defaultArea) {
                            return (
                              <div>
                                <p className="text-[10px] text-neutral-500">{defaultArea.name}</p>
                                {product.defaultStorageSlot && (
                                  <p className="text-[9px] text-neutral-400">{product.defaultStorageSlot}</p>
                                )}
                                <span className="inline-block mt-0.5 text-[8px] text-neutral-400">Mengikuti Lokasi Utama Produk</span>
                              </div>
                            );
                          }

                          // Priority 3: Legacy Rack Location (FALLBACK)
                          if (product.rackLocation) {
                            return (
                              <div>
                                <p className="text-[10px] text-neutral-500">{product.rackLocation}</p>
                                <span className="inline-block mt-0.5 rounded bg-neutral-100 px-1 text-[8px] font-medium text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">Legacy</span>
                              </div>
                            );
                          }

                          // Priority 4: No Location
                          return <span className="text-[10px] text-neutral-400">—</span>;
                        })()}
                      </td>
                      <td className="py-1">
                        <span className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium",
                          isExp ? "text-red-600 bg-red-50 dark:bg-red-950/30" :
                          isNear ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30" :
                          "text-green-600 bg-green-50 dark:bg-green-950/30"
                        )}>
                          {isExp ? "EXPIRED" : isNear ? `${days}h` : `OK (${days}h)`}
                        </span>
                      </td>
                      <td className="py-1 text-center">
                        <button
                          onClick={() => onRelocateBatch(b, product.name)}
                          className="rounded border border-neutral-300 px-1.5 py-0.5 text-[9px] text-neutral-500 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 dark:border-neutral-700 dark:hover:bg-brand-950/20"
                        >
                          Pindahkan
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </Fragment>
  );
});

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function InventoryStockTable() {
  const searchQuery = useInventoryStore((s) => s.searchQuery);
  const setSearchQuery = useInventoryStore((s) => s.setSearchQuery);
  const loadDemoData = useInventoryStore((s) => s.loadDemoData);
  const batches = useInventoryStore((s) => s.batches);
  const [catalogProducts, setCatalogProducts] = useState<InventoryProduct[]>([]);
  // RC1 M2 — Batch relocation modal state
  const [relocateBatch, setRelocateBatch] = useState<ProductBatch | null>(null);
  const [relocateProductName, setRelocateProductName] = useState("");
  // RC1 M2 — Load storage area master for batch location display
  const loadLocations = useLocationMasterStore((s) => s.loadLocations);
  const locationCount = useLocationMasterStore((s) => s.locations.length);

  useEffect(() => {
    if (locationCount === 0) loadLocations();
  }, [locationCount, loadLocations]);

  useEffect(() => {
    if (batches.length === 0) loadDemoData();
  }, [batches.length, loadDemoData]);

  // PERF-P0.1: Load catalog only if batches NOT loaded by loadDemoData (avoids duplicate getProducts())
  useEffect(() => {
    const productStore = useProductStore.getState();
    if (!productStore.isConnected) return;
    if (batches.length > 0) return; // loadDemoData already fetched products
    productStore.loadCatalog().then(setCatalogProducts).catch(() => {});
  }, [batches.length]);

  // Merge batch-derived products with catalog products (show zero-stock items)
  const products = useMemo(() => {
    const batchProducts = buildInventoryProducts(batches);
    const batchIds = new Set(batchProducts.map((p) => p.id));

    // Add catalog products that have no batches (stock = 0)
    for (const cat of catalogProducts) {
      if (!batchIds.has(cat.id)) {
        batchProducts.push({
          ...cat,
          totalStock: 0,
          batches: [],
        });
      }
    }

    return batchProducts;
  }, [batches, catalogProducts]);

  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedProduct((prev) => (prev === id ? null : id));
  }, []);

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
              filtered.map((product) => (
                <StockRow
                  key={product.id}
                  product={product}
                  onRelocateBatch={(batch, name) => { setRelocateBatch(batch); setRelocateProductName(name); }}
                  isExpanded={expandedProduct === product.id}
                  onToggleExpand={handleToggleExpand}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* RC1 M2 — Batch Relocation Modal */}
      <BatchRelocateModal
        open={!!relocateBatch}
        batch={relocateBatch}
        productName={relocateProductName}
        onClose={() => { setRelocateBatch(null); setRelocateProductName(""); }}
        onRelocated={(updated) => { useInventoryStore.getState().updateBatch(updated); setRelocateBatch(null); setRelocateProductName(""); }}
      />
    </div>
  );
}
