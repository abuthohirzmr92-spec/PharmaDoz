"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/cn";
import { useInventoryStore } from "@/store/inventory-store";
import { useLocationMasterStore } from "@/store/location-master-store";
import { useProductCatalog } from "@/hooks/use-product-catalog";
import { getDaysUntilExpiry, buildInventoryProducts } from "@/lib/inventory-demo";
import { useWorkspaceSelection } from "@/components/shared/workspace";
import type { ProductBatch } from "@/types/inventory";
import { BatchRelocateModal } from "./batch-relocate-modal";

/* ------------------------------------------------------------------ */
/*  Batch Status Badge                                                  */
/* ------------------------------------------------------------------ */

function BatchStatusBadge({ days }: { days: number }) {
  const isExpired = days < 0;
  const isNearExpiry = days >= 0 && days <= 90;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-medium",
        isExpired
          ? "bg-red-50 text-red-600 dark:bg-red-950/30"
          : isNearExpiry
            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30"
            : "bg-green-50 text-green-600 dark:bg-green-950/30",
      )}
      style={{ width: 72 }}
    >
      {isExpired ? "EXPIRED" : isNearExpiry ? `${days}h` : "OK"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Batch Detail Content                                               */
/* ------------------------------------------------------------------ */

export function BatchDetailContent() {
  const { selectedId } = useWorkspaceSelection();
  const batches = useInventoryStore((s) => s.batches);
  const locations = useLocationMasterStore((s) => s.locations);
  const { catalog: productCatalog } = useProductCatalog();

  // Relocate modal
  const [relocateBatch, setRelocateBatch] = useState<ProductBatch | null>(null);
  const [relocateProductName, setRelocateProductName] = useState("");

  // Location map
  const locationMap = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    for (const loc of locations) map.set(loc.id, { code: loc.code, name: loc.name });
    return map;
  }, [locations]);

  // Find selected product
  const products = useMemo(() => {
    if (productCatalog.size === 0) return [];
    return buildInventoryProducts(batches, productCatalog);
  }, [batches, productCatalog]);

  const product = useMemo(
    () => products.find((p) => p.id === selectedId) ?? null,
    [products, selectedId],
  );

  if (!product) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <p className="text-sm text-neutral-400">Pilih produk dari tabel untuk melihat batch.</p>
      </div>
    );
  }

  const fefoBatches = [...product.batches]
    .filter((b) => b.quantity > 0)
    .sort((a, b) => new Date(a.expiredDate).getTime() - new Date(b.expiredDate).getTime());

  if (fefoBatches.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <p className="text-sm text-neutral-400">Tidak ada batch dengan stok aktif.</p>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-1 flex-col overflow-hidden min-h-0">
      {/* Header — always visible, outside scroll area */}
      <div className="shrink-0 border-b border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <table className="w-full text-[11px]">
          <thead>
            <tr>
              <th className="py-2 pl-4 pr-2 text-left text-[10px] font-medium text-neutral-400">Batch</th>
              <th className="py-2 px-2 text-right text-[10px] font-medium text-neutral-400">Qty</th>
              <th className="py-2 px-2 text-right text-[10px] font-medium text-neutral-400">HPP</th>
              <th className="py-2 px-2 text-right text-[10px] font-medium text-neutral-400">Jual</th>
              <th className="py-2 px-2 text-right text-[10px] font-medium text-neutral-400">ED</th>
              <th className="py-2 px-2 text-center text-[10px] font-medium text-neutral-400">Status</th>
              <th className="py-2 pr-4 pl-2 text-center text-[10px] font-medium text-neutral-400">Aksi</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Body — only this scrolls */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <table className="w-full text-[11px]">
          <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
          {fefoBatches.map((b) => {
            const days = getDaysUntilExpiry(b.expiredDate);
            const locCode = b.storageAreaId
              ? locationMap.get(b.storageAreaId)?.code
              : product.defaultStorageAreaId
                ? locationMap.get(product.defaultStorageAreaId)?.code
                : null;

            return (
              <tr key={b.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                <td className="py-1.5 pl-4 pr-2">
                  <span className="font-mono text-neutral-700 dark:text-neutral-300">{b.batchNumber}</span>
                  {locCode && (
                    <span className="ml-1 text-[9px] text-neutral-400">{locCode}</span>
                  )}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums font-medium">{b.quantity}</td>
                <td className="py-1.5 px-2 text-right tabular-nums text-neutral-500">
                  {b.unitPrice.toLocaleString("id-ID")}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums text-neutral-500">
                  {b.sellingPrice.toLocaleString("id-ID")}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums text-neutral-500">
                  {new Date(b.expiredDate).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "2-digit",
                  })}
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex justify-center">
                    <BatchStatusBadge days={days} />
                  </div>
                </td>
                <td className="py-1.5 pr-4 pl-2 text-center">
                  <button
                    onClick={() => {
                      setRelocateBatch(b);
                      setRelocateProductName(product.name);
                    }}
                    className="rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] text-neutral-500 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-neutral-700 dark:hover:bg-brand-950/20"
                  >
                    Pindahkan
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>{/* close overflow-y-auto body */}
    </div>{/* close flex-1 flex flex-col */}

      {/* Relocate Modal */}
      <BatchRelocateModal
        open={!!relocateBatch}
        batch={relocateBatch}
        productName={relocateProductName}
        onClose={() => {
          setRelocateBatch(null);
          setRelocateProductName("");
        }}
        onRelocated={(updated) => {
          useInventoryStore.getState().updateBatch(updated);
          setRelocateBatch(null);
          setRelocateProductName("");
        }}
      />
    </>
  );
}
