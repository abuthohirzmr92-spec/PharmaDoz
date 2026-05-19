"use client";

import { useMemo, useEffect, useState } from "react";
import { Search, Clock, Trash2 } from "lucide-react";
import { useInventoryStore } from "@/store/inventory-store";
import { getDaysUntilExpiry, getExpiredBatches, getNearExpiryBatches } from "@/lib/inventory-demo";
import type { ProductBatch } from "@/types/inventory";
import { cn } from "@/lib/cn";
import { usePermission } from "@/hooks/use-auth";

type ViewMode = "expired" | "near" | "all";

export function InventoryExpiredTable() {
  const searchQuery = useInventoryStore((s) => s.searchQuery);
  const setSearchQuery = useInventoryStore((s) => s.setSearchQuery);
  const loadDemoData = useInventoryStore((s) => s.loadDemoData);
  const batches = useInventoryStore((s) => s.batches);

  useEffect(() => {
    if (batches.length === 0) loadDemoData();
  }, [batches.length, loadDemoData]);

  const canEditExpired = usePermission("expired.edit");

  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleWriteOff = () => {
    if (selectedIds.size === 0) return;
    const ok = window.confirm(
      `Yakin ingin write-off ${selectedIds.size} batch kadaluarsa?\n\nBatch yang sudah di write-off akan dihapus dari stok dan dicatat sebagai kerugian.`,
    );
    if (!ok) return;
    useInventoryStore.getState().writeOffExpiredBatches(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const expiredBatches = useMemo(() => getExpiredBatches(batches), [batches]);
  const nearBatches = useMemo(() => getNearExpiryBatches(batches, 90), [batches]);

  const filtered = useMemo(() => {
    let result: ProductBatch[];
    switch (viewMode) {
      case "expired":
        result = expiredBatches;
        break;
      case "near":
        result = nearBatches;
        break;
      default:
        result = [...expiredBatches, ...nearBatches];
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.productName.toLowerCase().includes(q) ||
          b.batchNumber.toLowerCase().includes(q),
      );
    }

    return result.sort(
      (a, b) =>
        new Date(a.expiredDate).getTime() - new Date(b.expiredDate).getTime(),
    );
  }, [expiredBatches, nearBatches, viewMode, searchQuery]);

  const totalExpiredValue = useMemo(
    () =>
      expiredBatches.reduce((s, b) => s + b.quantity * b.sellingPrice, 0),
    [expiredBatches],
  );
  const totalNearValue = useMemo(
    () =>
      nearBatches.reduce((s, b) => s + b.quantity * b.sellingPrice, 0),
    [nearBatches],
  );

  return (
    <div>
      {/* Summary bar */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 dark:border-red-900 dark:bg-red-950/30">
          <span className="text-[10px] text-red-600">
            EXPIRED: {expiredBatches.length} batch — Rp {Math.round(totalExpiredValue).toLocaleString("id-ID")}
          </span>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 dark:border-amber-900 dark:bg-amber-950/30">
          <span className="text-[10px] text-amber-600">
            DE 90H: {nearBatches.length} batch — Rp {Math.round(totalNearValue).toLocaleString("id-ID")}
          </span>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="mb-4 flex gap-3 flex-wrap">
        <div className="flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
          {([
            { label: "Semua", value: "all" as const },
            { label: "EXPIRED", value: "expired" as const },
            { label: "DE 90H", value: "near" as const },
          ]).map((f) => (
            <button
              key={f.value}
              onClick={() => setViewMode(f.value)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                viewMode === f.value
                  ? f.value === "expired"
                    ? "bg-red-600 text-white"
                    : f.value === "near"
                      ? "bg-amber-600 text-white"
                      : "bg-brand-600 text-white"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari produk atau batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          />
        </div>
      </div>

      {/* Write-off button */}
      {canEditExpired && selectedIds.size > 0 && (
        <div className="mb-3">
          <button
            onClick={handleWriteOff}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Write-Off Selected ({selectedIds.size})
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="w-[5%] px-3 py-2.5 text-left" />
              <th className="w-[23%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Produk
              </th>
              <th className="w-[18%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Batch
              </th>
              <th className="w-[16%] hidden sm:table-cell px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                ED
              </th>
              <th className="w-[12%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Hari
              </th>
              <th className="w-[14%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Qty
              </th>
              <th className="w-[12%] hidden sm:table-cell px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Nilai
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-400">
                  <Clock className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  {viewMode === "expired"
                    ? "Tidak ada batch kadaluarsa"
                    : viewMode === "near"
                      ? "Tidak ada batch mendekati kadaluarsa (90 hari)"
                      : "Tidak ada batch bermasalah"}
                </td>
              </tr>
            ) : (
              filtered.map((b) => {
                const days = getDaysUntilExpiry(b.expiredDate);
                const isExpired = days < 0;

                return (
                  <tr
                    key={b.id}
                    className={cn(
                      "group",
                      isExpired && "bg-red-50/50 dark:bg-red-950/10",
                      !isExpired && days <= 30 && "bg-amber-50/50 dark:bg-amber-950/10",
                    )}
                  >
                    <td className="px-3 py-2.5">
                      {isExpired && b.quantity > 0 ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(b.id)}
                          onChange={() => toggleSelect(b.id)}
                          className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500 dark:border-neutral-600 dark:bg-neutral-800 dark:checked:bg-brand-600"
                        />
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate block">
                        {b.productName}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[11px] font-mono text-neutral-600 dark:text-neutral-400">
                        {b.batchNumber}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5 text-right">
                      <span className="text-xs tabular-nums text-neutral-500">
                        {new Date(b.expiredDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          isExpired
                            ? "text-red-600"
                            : days <= 30
                              ? "text-amber-600"
                              : "text-amber-500",
                        )}
                      >
                        {isExpired ? `+${Math.abs(days)}` : days}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-xs font-medium tabular-nums text-neutral-900 dark:text-neutral-50">
                        {b.quantity}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5 text-right">
                      <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
                        {(b.quantity * b.sellingPrice).toLocaleString("id-ID")}
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
