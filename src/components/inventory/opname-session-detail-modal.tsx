"use client";

import { useState, useCallback } from "react";
import { X, Check, Play, Pause } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOpnameSessionStore } from "@/store/opname-session-store";
import { useInventoryStore } from "@/store/inventory-store";
import { useLocationMasterStore } from "@/store/location-master-store";
import { ProductBatchGroup, groupBatchesByProduct, type BatchItem } from "./product-batch-group";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OpnameSessionDetailModal({ open, onClose }: Props) {
  const activeSession = useOpnameSessionStore((s) => s.activeSession);
  const items = useOpnameSessionStore((s) => s.items);
  const markItemCounted = useOpnameSessionStore((s) => s.markItemCounted);
  const completeSession = useOpnameSessionStore((s) => s.completeSession);
  const batches = useInventoryStore((s) => s.batches);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "partial" | "done">("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSave = useCallback((key: string) => {
    const qty = parseInt(editQty.replace(/\D/g, ""), 10) || 0;
    markItemCounted(key, qty);
    setEditingKey(null);
    setEditQty("");
  }, [editQty, markItemCounted]);

  // RC1 P0H.2 — Only in_progress allows editing. Paused/Completed = read-only.
  const isEditable = activeSession?.status === "in_progress";
  const isPaused = activeSession?.status === "paused";
  const isComplete = activeSession?.status === "completed";

  if (!open || !activeSession) return null;

  // ADR-016: Location source of truth = Master Lokasi Produk (storage_areas)
  const locationMaster = useLocationMasterStore((s) => s.locations);
  const locationMap = new Map(locationMaster.map(l => [l.id, l]));
  // Build productId → storage area name lookup from inventory batches
  const productLocationMap = new Map<string, string>();
  for (const b of batches) {
    const prod = (b as any);
    if (prod.defaultStorageAreaId && !productLocationMap.has(b.productId)) {
      const area = locationMap.get(prod.defaultStorageAreaId);
      if (area) productLocationMap.set(b.productId, area.name);
    }
  }

  // Enrich items with batch metadata — systemQty stays as snapshot (not live qty)
  const enrichedItems: BatchItem[] = items.map((item) => {
    const batch = batches.find((b) => b.id === item.batchId);
    return {
      ...item,
      productName: batch?.productName || item.productName || "—",
      batchNumber: batch?.batchNumber || item.batchNumber || "—",
      // systemQty is immutable snapshot — DO NOT override with live batch.quantity
      expiredDate: batch?.expiredDate,
      rackLocation: productLocationMap.get(item.productId) ?? null,
    } as BatchItem;
  });

  // Extract locations — only those with products in this session (Option A)
  const locations = [...new Set(enrichedItems.map(i => i.rackLocation).filter(Boolean) as string[])].sort();

  // FEFO groups with filters
  const productGroups = groupBatchesByProduct(enrichedItems, {
    searchTerm,
    locationFilter: locationFilter,
    statusFilter: statusFilter,
  });

  const countedItems = items.filter(i => i.status === "counted" || i.status === "skipped").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl dark:bg-neutral-900" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3.5 dark:border-neutral-800 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{activeSession.title}</h2>
            <p className="text-xs text-neutral-500">
              {activeSession.selectedLocationIds.length > 0
                ? activeSession.selectedLocationIds.join(", ")
                : "Semua Lokasi"}
              {" · "}
              {activeSession.completedItems}/{activeSession.totalItems} batch
              {" · "}
              {activeSession.progressPercent}%
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditable && (
              <button onClick={completeSession}
                className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400">
                <Check className="mr-1 inline h-3 w-3" /> Selesai
              </button>
            )}
            {isPaused && (
              <div className="mb-2 rounded bg-amber-100 px-3 py-1.5 text-center text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                ⏸ Session dijeda — input tidak aktif. Klik "Lanjutkan" di banner untuk melanjutkan.
              </div>
            )}
            <span className={cn("rounded px-2 py-1 text-[10px] font-medium",
              isComplete && "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
              isPaused && "bg-amber-100 text-amber-700",
              activeSession.status === "in_progress" && "bg-brand-100 text-brand-700")}>
              {isComplete ? "Completed" : activeSession.status === "paused" ? "Paused" : "In Progress"}
            </span>
            <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-5 py-3 border-b dark:border-neutral-800 shrink-0">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
            <span>{activeSession.completedItems} / {activeSession.totalItems} batch</span>
            <span className="font-bold">{activeSession.progressPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div className="h-2 rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${activeSession.progressPercent}%` }} />
          </div>
        </div>

        {/* Product-centric FEFO workspace */}
        <div className="flex-1 overflow-y-auto">
          <ProductBatchGroup
            groups={productGroups}
            mode={isEditable ? "editable" : "readonly"}
            showWorkspace
            workspaceProps={{
              filters: { searchTerm, locationFilter, statusFilter },
              onFiltersChange: (f) => {
                setSearchTerm(f.searchTerm);
                setLocationFilter(f.locationFilter);
                setStatusFilter(f.statusFilter);
              },
              locations,
              totalProducts: productGroups.length,
              totalBatches: items.length,
              progressPercent: activeSession.progressPercent,
              completedBatches: countedItems,
            }}
            editingKey={editingKey}
            editValue={editQty}
            onStartEdit={(key, qty) => { setEditingKey(key); setEditQty(qty > 0 ? String(qty) : ""); }}
            onEditChange={(val) => setEditQty(val)}
            onEditConfirm={(key) => handleSave(key)}
            onEditCancel={() => { setEditingKey(null); setEditQty(""); }}
            onSkipItem={(key) => markItemCounted(key, 0)}
          />
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3 text-xs text-neutral-400 dark:border-neutral-800 shrink-0">
          {items.filter(i => i.status === "counted").length} counted · {items.filter(i => i.status === "skipped").length} skipped · {items.filter(i => i.status === "pending").length} pending
        </div>
      </div>
    </div>
  );
}
