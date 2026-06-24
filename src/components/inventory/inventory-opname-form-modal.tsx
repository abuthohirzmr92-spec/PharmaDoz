"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Clipboard, Loader2 } from "lucide-react";
import { useInventoryStore } from "@/store/inventory-store";
import { productRepo } from "@/lib/repository-instances";
import { canPerformOpname } from "@/lib/opname/session-guard";
import type { StockOpname, StockOpnameItem } from "@/types/inventory";
import type { InventoryProduct } from "@/types/inventory";
import {
  StockOpnameMultiUnitRow,
  initMultiUnitCounts,
} from "./stock-opname-multi-unit-row";
import type { MultiUnitCount } from "@/lib/unit-opname";

function generateUUID(): string {
  return "opn-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function InventoryOpnameFormModal({ open, onClose }: Props) {
  const batches = useInventoryStore((s) => s.batches);
  const performOpname = useInventoryStore((s) => s.performOpname);
  const isSubmitting = useInventoryStore((s) => s.isSubmitting);

  // Build product list from batches (grouped by product, with active batches)
  const products = useMemo(() => {
    const grouped = new Map<string, { productId: string; productName: string; batches: typeof batches }>();
    for (const b of batches) {
      if (b.quantity <= 0) continue;
      const key = b.productId;
      if (!grouped.has(key)) {
        grouped.set(key, { productId: b.productId, productName: b.productName, batches: [] });
      }
      grouped.get(key)!.batches.push(b);
    }
    return Array.from(grouped.values());
  }, [batches]);

  const [items, setItems] = useState<Record<string, string>>({});
  // V3 P3B — Multi Unit Opname state
  const [catalogProducts, setCatalogProducts] = useState<InventoryProduct[]>([]);
  const [multiUnitStates, setMultiUnitStates] = useState<Record<string, MultiUnitCount[]>>({});
  const [batchUnits, setBatchUnits] = useState<Record<string, string>>({});

  // Load catalog products for unitLevels (existing query, reused)
  useEffect(() => {
    if (open && productRepo.isConnected) {
      productRepo.getProducts().then(setCatalogProducts).catch(() => setCatalogProducts([]));
    }
  }, [open]);

  // Initialize items when modal opens or products change
  useEffect(() => {
    if (open) {
      const init: Record<string, string> = {};
      for (const p of products) {
        for (const b of p.batches) {
          const key = `${p.productId}:${b.id}`;
          init[key] = String(b.quantity);
        }
      }
      setItems(init);
      setMultiUnitStates({});
    }
  }, [open, products]);

  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  const getItem = (productId: string, batchId: string) => {
    const key = `${productId}:${batchId}`;
    return items[key] ?? "0";
  };

  const handlePhysicalChange = (productId: string, batchId: string, value: string) => {
    const key = `${productId}:${batchId}`;
    setItems((prev) => ({ ...prev, [key]: value }));
  };

  const buildOpname = (): StockOpname | null => {
    const opnameItems: StockOpnameItem[] = [];
    for (const p of products) {
      for (const b of p.batches) {
        const physicalQty = parseInt(getItem(p.productId, b.id)) || 0;
        const difference = physicalQty - b.quantity;
        const batchKey = `${p.productId}:${b.id}`;
        opnameItems.push({
          tenantId: "",
          productId: p.productId,
          productName: p.productName,
          batchId: b.id,
          batchNumber: b.batchNumber,
          systemQty: b.quantity,
          physicalQty,
          difference,
          note: "",
          // V3 P3B — attach multi-unit breakdown as metadata
          multiUnitCounts: multiUnitStates[batchKey],
          physicalBaseQty: physicalQty,
          // V3 P3B.1A — base unit for smart fallback display
          baseUnit: batchUnits[batchKey] ?? undefined,
        });
      }
    }

    return {
      id: generateUUID(),
      tenantId: "",
      date: new Date().toISOString().split("T")[0] ?? new Date().toISOString(),
      status: "confirmed",
      conductedBy: "Petugas Opname",
      notes: notes || "",
      items: opnameItems,
    };
  };

  const handleSubmit = async () => {
    setError("");
    // RC1 P0E.2 — Session guard
    const guard = canPerformOpname();
    if (!guard.allowed) {
      setError(guard.reason ?? "Opname tidak diizinkan.");
      return;
    }
    const opname = buildOpname();
    if (!opname || opname.items.length === 0) {
      setError("Tidak ada item untuk di-opname.");
      return;
    }

    try {
      await performOpname(opname);
      onClose();
    } catch {
      setError("Gagal menyimpan stock opname.");
    }
  };

  const itemCount = products.reduce((sum, p) => sum + p.batches.length, 0);
  const diffCount = products.reduce((sum, p) => {
    for (const b of p.batches) {
      const physical = parseInt(getItem(p.productId, b.id)) || 0;
      if (physical !== b.quantity) sum++;
    }
    return sum;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <Clipboard className="h-5 w-5 text-brand-600" />
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">Buat Stock Opname</h2>
              <p className="text-xs text-neutral-500">{products.length} produk · {itemCount} batch · {diffCount} selisih</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>
        )}

        {/* Items */}
        <div className="p-5 space-y-4">
          {products.map((p) => (
            <div key={p.productId} className="rounded-lg border border-neutral-200 dark:border-neutral-800">
              <div className="bg-neutral-50 px-3 py-2 font-medium text-sm text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50">
                {p.productName}
              </div>
              {p.batches.map((b) => {
                const physicalQty = getItem(p.productId, b.id);
                const physical = parseInt(physicalQty) || 0;
                const diff = physical - b.quantity;
                // V3 P3B — Multi Unit Opname
                const catProd = catalogProducts.find(cp => cp.id === p.productId);
                const unitLevels = catProd?.unitLevels ?? [];
                const baseUnit = catProd?.unit ?? "pcs";
                const hasMultiUnit = unitLevels.length > 0;
                const batchKey = `${p.productId}:${b.id}`;
                const muCounts = multiUnitStates[batchKey];
                // V3 P3B.1A — store base unit for history display
                if (baseUnit !== "pcs" && !batchUnits[batchKey]) {
                  setBatchUnits(prev => ({ ...prev, [batchKey]: baseUnit }));
                }
                return (
                  <div key={b.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <div className="grid grid-cols-5 gap-2 items-center px-3 py-2 text-xs">
                      <div className="col-span-1 text-neutral-500 truncate" title={b.batchNumber}>
                        {b.batchNumber}
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-neutral-400">System</span>
                        <p className="font-medium tabular-nums text-neutral-700 dark:text-neutral-300">{b.quantity}</p>
                      </div>
                      <div className="col-span-3 text-center">
                        <span className="text-neutral-400">Fisik</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={hasMultiUnit ? (muCounts ? String(muCounts.reduce((s, c) => s + c.baseQty, 0)) : "0") : (physicalQty === "0" ? "" : physicalQty)}
                          onChange={(e) => {
                            if (hasMultiUnit) return; // handled by multi-unit row
                            const raw = e.target.value.replace(/\D/g, "").replace(/^0+/, "") || "0";
                            handlePhysicalChange(p.productId, b.id, raw);
                          }}
                          onFocus={(e) => {
                            if (hasMultiUnit) return;
                            if (e.target.value === "0") handlePhysicalChange(p.productId, b.id, "");
                          }}
                          readOnly={hasMultiUnit}
                          className={`w-20 text-center rounded border bg-white px-1 py-0.5 font-medium tabular-nums focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-neutral-900 dark:text-neutral-50 ${
                            hasMultiUnit ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300" : "border-neutral-300 dark:border-neutral-700"
                          }`}
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-neutral-400">Selisih</span>
                        <p className={`font-semibold tabular-nums ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-neutral-500"}`}>
                          {diff > 0 ? "+" : ""}{diff}
                        </p>
                      </div>
                      <div className="col-span-1">
                        <span className="text-neutral-400">Exp</span>
                        <p className={`text-[10px] ${new Date(b.expiredDate) < new Date() ? "text-red-500" : "text-neutral-500"}`}>
                          {new Date(b.expiredDate).toLocaleDateString("id-ID", { month: "short", year: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    {/* Multi Unit Level-3 counting rows */}
                    {hasMultiUnit && (
                      <div className="px-3 pb-2">
                        <StockOpnameMultiUnitRow
                          baseUnit={baseUnit}
                          unitLevels={unitLevels}
                          systemQty={b.quantity}
                          counts={muCounts ?? initMultiUnitCounts(unitLevels, baseUnit)}
                          onChange={(counts, physicalBaseQty) => {
                            setMultiUnitStates(prev => ({ ...prev, [batchKey]: counts }));
                            handlePhysicalChange(p.productId, b.id, String(physicalBaseQty));
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="px-5 pb-2">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan opname (opsional)..."
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 flex gap-3 border-t border-neutral-200 bg-white px-5 py-4 dark:border-neutral-700 dark:bg-neutral-900">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Menyimpan..." : `Simpan Opname (${diffCount} selisih)`}
          </button>
        </div>
      </div>
    </div>
  );
}
