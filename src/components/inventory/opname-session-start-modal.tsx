"use client";

import { useState, useMemo } from "react";
import { X, Play, Package } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { useOpnameSessionStore } from "@/store/opname-session-store";
import { useInventoryStore } from "@/store/inventory-store";
import { useAuthStore } from "@/store/auth-store";
import { extractRackLocations, type OpnameProductInfo } from "@/lib/opname/location-normalizer";
import { countProductsByRackLocation } from "@/lib/opname/session-location-filter";
import type { BatchInput } from "@/lib/opname/session-snapshot";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OpnameSessionStartModal({ open, onClose }: Props) {
  const batches = useInventoryStore((s) => s.batches);
  const startSession = useOpnameSessionStore((s) => s.startSession);
  const activeSession = useOpnameSessionStore((s) => s.activeSession);
  const userName = useAuthStore((s) => s.user?.displayName ?? "Petugas Opname");

  const [title, setTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Build product info from batches (with rackLocation from inventory)
  const products: OpnameProductInfo[] = useMemo(() => {
    const map = new Map<string, OpnameProductInfo>();
    for (const b of batches) {
      if (b.quantity <= 0) continue;
      if (!map.has(b.productId)) {
        map.set(b.productId, {
          productId: b.productId,
          productName: b.productName,
          rackLocation: (b as any).rackLocation ?? null,
        });
      }
    }
    return Array.from(map.values());
  }, [batches]);

  const locations = useMemo(() => extractRackLocations(products), [products]);
  const { total, filtered } = useMemo(
    () => countProductsByRackLocation(products, selectedIds),
    [products, selectedIds],
  );

  const canStart = title.trim().length > 0 && filtered > 0;

  const handleToggleLocation = (loc: string) => {
    setSelectedIds((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc],
    );
  };

  const handleStart = () => {
    if (!canStart) return;
    // RC1 P0F.3 — Build batch snapshot at session start
    // RC1 P0F.3A — rackLocation is product-level, not batch-level.
    // Build a lookup from catalog products (loaded in panel) for type-safe location.
    const productRackMap = new Map<string, string | null>();
    for (const p of products) {
      productRackMap.set(p.productId, p.rackLocation);
    }
    const batchInputs: BatchInput[] = batches
      .filter(b => b.quantity > 0)
      .map(b => ({
        productId: b.productId,
        batchId: b.id,
        quantity: b.quantity,
        productName: b.productName,
        rackLocation: productRackMap.get(b.productId) ?? null,
      }));
    const id = startSession(title.trim(), userName, selectedIds, batchInputs);
    if (!id) {
      toast.error("Gagal memulai session. Session mungkin sudah aktif atau nama kosong.");
      return;
    }
    toast.success(`Session "${title.trim()}" dimulai. ${filtered} produk akan dihitung.`);
    onClose();
  };

  const defaultTitle = useMemo(() => {
    const d = new Date();
    return `Stock Opname ${d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`;
  }, []);

  if (!open) return null;

  // Don't show if session already active
  if (activeSession && activeSession.status !== "completed") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-900" onClick={e => e.stopPropagation()}>
          <p className="text-center text-sm text-neutral-500">Session masih berjalan: <strong>{activeSession.title}</strong></p>
          <p className="mt-1 text-center text-xs text-neutral-400">Selesaikan session saat ini sebelum memulai yang baru.</p>
          <button onClick={onClose} className="mt-4 w-full rounded-lg border px-4 py-2 text-sm dark:border-neutral-700">Tutup</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="mx-4 w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-neutral-900 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3.5 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Mulai Stock Opname</h2>
          <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 p-5">
          {/* Session name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Nama Sesi</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultTitle}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
              autoFocus
            />
          </div>

          {/* Location selector */}
          {locations.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Lokasi ({filtered}/{total} produk)
              </label>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 p-2 dark:border-neutral-700">
                <label className={cn("flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800",
                  selectedIds.length === 0 && "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400")}>
                  <input type="checkbox" checked={selectedIds.length === 0} onChange={() => setSelectedIds([])} className="h-3.5 w-3.5" />
                  Semua Lokasi
                </label>
                {locations.map((loc) => (
                  <label key={loc} className={cn("flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800",
                    selectedIds.includes(loc) && "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400")}>
                    <input type="checkbox" checked={selectedIds.includes(loc)} onChange={() => handleToggleLocation(loc)} className="h-3.5 w-3.5" />
                    {loc}
                  </label>
                ))}
              </div>
            </div>
          )}

          {locations.length === 0 && (
            <div className="rounded-lg bg-neutral-50 p-4 text-center dark:bg-neutral-800">
              <Package className="mx-auto mb-1 h-5 w-5 text-neutral-400" />
              <p className="text-xs text-neutral-500">Tidak ada data lokasi. Semua produk akan dihitung.</p>
            </div>
          )}

          {filtered === 0 && selectedIds.length > 0 && (
            <p className="text-xs text-amber-600">⚠ Tidak ada produk di lokasi terpilih.</p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 rounded-lg border px-4 py-2 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400">
              Batal
            </button>
            <button onClick={handleStart} disabled={!canStart}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              <Play className="h-3.5 w-3.5" /> Mulai Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
