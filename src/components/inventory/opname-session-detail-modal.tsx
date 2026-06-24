"use client";

import { useState, useCallback } from "react";
import { X, Check, Play, Pause } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOpnameSessionStore } from "@/store/opname-session-store";
import { useInventoryStore } from "@/store/inventory-store";

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

  const handleStartEdit = useCallback((key: string, currentQty: number) => {
    setEditingKey(key);
    setEditQty(currentQty > 0 ? String(currentQty) : "");
  }, []);

  const handleSave = useCallback((key: string) => {
    const qty = parseInt(editQty.replace(/\D/g, ""), 10) || 0;
    markItemCounted(key, qty);
    setEditingKey(null);
    setEditQty("");
  }, [editQty, markItemCounted]);

  const handleSkip = useCallback((key: string) => {
    markItemCounted(key, 0);
  }, [markItemCounted]);

  const isEditable = activeSession?.status === "in_progress";
  const isComplete = activeSession?.status === "completed";

  if (!open || !activeSession) return null;

  // Enrich items with batch data for display
  const enrichedItems = items.map((item) => {
    const batch = batches.find((b) => b.id === item.batchId);
    return {
      ...item,
      productName: batch?.productName || item.productName || "—",
      batchNumber: batch?.batchNumber || item.batchNumber || "—",
      systemQty: batch?.quantity ?? item.systemQty,
    };
  });

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
            <span className={cn("rounded px-2 py-1 text-[10px] font-medium",
              isComplete && "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
              activeSession.status === "paused" && "bg-amber-100 text-amber-700",
              activeSession.status === "in_progress" && "bg-brand-100 text-brand-700")}>
              {isComplete ? "Completed" : activeSession.status === "paused" ? "Paused" : "In Progress"}
            </span>
            <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-5 py-3 border-b dark:border-neutral-800 shrink-0">
          <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div className="h-2 rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${activeSession.progressPercent}%` }} />
          </div>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto">
          {enrichedItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-400">
              Session tidak memiliki item untuk dihitung.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white dark:bg-neutral-950">
                <tr className="border-b text-left text-[10px] font-medium uppercase text-neutral-400 dark:border-neutral-800">
                  <th className="px-4 py-2">Produk</th>
                  <th className="px-2 py-2">Batch</th>
                  <th className="px-2 py-2 text-right">Qty Sistem</th>
                  <th className="px-2 py-2 text-right">Qty Fisik</th>
                  <th className="px-2 py-2 text-center">Status</th>
                  <th className="px-2 py-2 text-center w-[80px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-neutral-800">
                {enrichedItems.map((item) => {
                  const isEditing = editingKey === item.key;
                  const isPending = item.status === "pending";

                  return (
                    <tr key={item.key} className={cn(
                      "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                      item.status === "counted" && "bg-green-50/30 dark:bg-green-950/10",
                      item.status === "skipped" && "bg-neutral-50 dark:bg-neutral-900/50",
                    )}>
                      <td className="px-4 py-2 font-medium text-neutral-700 dark:text-neutral-300">{item.productName}</td>
                      <td className="px-2 py-2 font-mono text-neutral-500">{item.batchNumber}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-neutral-500">{item.systemQty}</td>
                      <td className="px-2 py-2 text-right">
                        {isEditing ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value.replace(/\D/g, ""))}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSave(item.key); if (e.key === "Escape") { setEditingKey(null); setEditQty(""); } }}
                            className="w-16 rounded border border-brand-300 bg-white px-1.5 py-0.5 text-right text-xs tabular-nums focus:border-brand-500 focus:outline-none dark:border-brand-700 dark:bg-neutral-800 dark:text-neutral-50"
                            placeholder="0"
                            autoFocus
                          />
                        ) : (
                          <span className={cn("tabular-nums",
                            item.physicalQty > 0 ? "font-medium text-neutral-700 dark:text-neutral-300" : "text-neutral-400")}>
                            {item.physicalQty || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium",
                          item.status === "counted" && "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
                          item.status === "skipped" && "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
                          item.status === "pending" && "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
                        )}>
                          {item.status === "counted" ? "Counted" : item.status === "skipped" ? "Skipped" : "Pending"}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {isEditable && (
                          isEditing ? (
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => handleSave(item.key)}
                                className="rounded bg-green-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-green-700">
                                Simpan
                              </button>
                              <button onClick={() => { setEditingKey(null); setEditQty(""); }}
                                className="rounded border px-2 py-1 text-[10px] text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700">
                                Batal
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => handleStartEdit(item.key, item.physicalQty)}
                                className="rounded bg-brand-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-brand-700">
                                {isPending ? "Hitung" : "Edit"}
                              </button>
                              {isPending && (
                                <button onClick={() => handleSkip(item.key)}
                                  className="rounded border px-2 py-1 text-[10px] text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700">
                                  Skip
                                </button>
                              )}
                            </div>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3 text-xs text-neutral-400 dark:border-neutral-800 shrink-0">
          {enrichedItems.filter(i => i.status === "counted").length} counted · {enrichedItems.filter(i => i.status === "skipped").length} skipped · {enrichedItems.filter(i => i.status === "pending").length} pending
        </div>
      </div>
    </div>
  );
}
