"use client";

import { useState, useMemo } from "react";
import { X, Move } from "lucide-react";
import { toast } from "sonner";
import { useLocationMasterStore } from "@/store/location-master-store";
import { inventoryRepo } from "@/lib/repository-instances";
import type { ProductBatch } from "@/types/inventory";

interface Props {
  open: boolean;
  batch: ProductBatch | null;
  productName: string;
  onClose: () => void;
  onRelocated: (updatedBatch: ProductBatch) => void;
}

export function BatchRelocateModal({ open, batch, productName, onClose, onRelocated }: Props) {
  const locationMaster = useLocationMasterStore((s) => s.locations);

  const locationMap = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    for (const loc of locationMaster) map.set(loc.id, { code: loc.code, name: loc.name });
    return map;
  }, [locationMaster]);

  const currentArea = batch?.storageAreaId ? locationMap.get(batch.storageAreaId) : null;

  const [selectedAreaId, setSelectedAreaId] = useState(batch?.storageAreaId ?? "");
  const [selectedSlot, setSelectedSlot] = useState(batch?.storageSlot ?? "");
  const [saving, setSaving] = useState(false);

  if (!open || !batch) return null;

  const handleRelocate = async () => {
    if (!selectedAreaId) { toast.error("Pilih Area Penyimpanan terlebih dahulu."); return; }
    setSaving(true);
    try {
      const updated = await inventoryRepo.updateBatchLocation(batch.id, {
        storageAreaId: selectedAreaId || null,
        storageSlot: selectedSlot.trim() || null,
        isRelocated: true,
      });
      toast.success(`Batch ${batch.batchNumber} dipindahkan.`);
      onRelocated(updated);
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal memindahkan batch.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white shadow-xl dark:bg-neutral-900" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3.5 dark:border-neutral-800">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Pindahkan Batch</h2>
            <p className="text-[11px] text-neutral-500">{productName} — {batch.batchNumber}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Current location */}
          <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">
            <p className="text-[10px] font-medium text-neutral-400 uppercase">Lokasi Saat Ini</p>
            {currentArea ? (
              <div className="mt-1">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{currentArea.name}</p>
                {batch.storageSlot && <p className="text-xs text-neutral-500">{batch.storageSlot}</p>}
              </div>
            ) : (
              <p className="mt-1 text-sm text-neutral-400">Mengikuti Lokasi Utama Produk</p>
            )}
          </div>

          {/* New location */}
          <div>
            <label className="mb-0.5 block text-[10px] font-medium text-neutral-500">Area Penyimpanan Baru</label>
            <select
              value={selectedAreaId}
              onChange={(e) => {
                setSelectedAreaId(e.target.value);
                if (!e.target.value) setSelectedSlot("");
              }}
              className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
            >
              <option value="">— Pilih Area —</option>
              {locationMaster.filter(l => l.isActive).map(l => (
                <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-0.5 block text-[10px] font-medium text-neutral-500">Nomor Slot Baru</label>
            <input
              type="text"
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              placeholder={selectedAreaId ? "Contoh: A-12" : "Pilih Area dulu"}
              disabled={!selectedAreaId}
              className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-neutral-100 disabled:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:disabled:bg-neutral-800/50"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={onClose} disabled={saving}
              className="flex-1 rounded-lg border px-4 py-2 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400">
              Batal
            </button>
            <button onClick={handleRelocate} disabled={saving || !selectedAreaId}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              <Move className="h-3.5 w-3.5" />
              {saving ? "Menyimpan..." : "Pindahkan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
