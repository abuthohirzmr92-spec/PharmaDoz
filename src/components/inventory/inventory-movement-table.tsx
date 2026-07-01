"use client";

import { useState, useMemo, useEffect, memo, useCallback } from "react";
import { Search, TrendingUp, TrendingDown, RotateCcw, AlertTriangle, Clipboard, Settings } from "lucide-react";
import { useInventoryStore } from "@/store/inventory-store";
import type { MovementType, StockMovement } from "@/types/inventory";
import { cn } from "@/lib/cn";

const TYPE_CONFIG: Record<MovementType, { icon: typeof TrendingUp; cls: string; label: string }> = {
  purchase: { icon: TrendingUp, cls: "text-green-600 bg-green-50 dark:bg-green-950/30", label: "Masuk" },
  sale: { icon: TrendingDown, cls: "text-blue-600 bg-blue-50 dark:bg-blue-950/30", label: "Jual" },
  refund: { icon: RotateCcw, cls: "text-purple-600 bg-purple-50 dark:bg-purple-950/30", label: "Retur" },
  expired: { icon: AlertTriangle, cls: "text-red-600 bg-red-50 dark:bg-red-950/30", label: "Expired" },
  opname: { icon: Clipboard, cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", label: "Opname" },
  adjustment: { icon: Settings, cls: "text-neutral-600 bg-neutral-100 dark:bg-neutral-800", label: "Adjust" },
  transfer: { icon: TrendingUp, cls: "text-purple-600 bg-purple-50 dark:bg-purple-950/30", label: "Transfer" },
  revision_reversal: { icon: RotateCcw, cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", label: "Rev-Reversal" },
  revision: { icon: TrendingUp, cls: "text-green-600 bg-green-50 dark:bg-green-950/30", label: "Revisi" },
};

const TYPE_FILTERS: { label: string; value: MovementType | "all" }[] = [
  { label: "Semua", value: "all" },
  { label: "Masuk", value: "purchase" },
  { label: "Jual", value: "sale" },
  { label: "Retur", value: "refund" },
  { label: "Expired", value: "expired" },
  { label: "Opname", value: "opname" },
  { label: "Transfer", value: "transfer" },
  { label: "Adjust", value: "adjustment" },
  { label: "Revisi", value: "revision" },
  { label: "Rev-Reversal", value: "revision_reversal" },
];

/* ------------------------------------------------------------------ */
/*  Movement Row (memoized)                                            */
/* ------------------------------------------------------------------ */

const MovementRow = memo(function MovementRow({
  movement,
}: {
  movement: StockMovement;
}) {
  const cfg = TYPE_CONFIG[movement.type];
  const Icon = cfg.icon;
  const isNegative = movement.qtyChange < 0;

  return (
    <tr className="group">
      <td className="hidden md:table-cell px-3 py-2.5">
        <span className="text-[11px] text-neutral-500">
          {new Date(movement.timestamp).toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium", cfg.cls)}>
          <Icon className="h-3 w-3" />
          {cfg.label}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate block">
          {movement.productName}
        </span>
      </td>
      <td className="hidden sm:table-cell px-3 py-2.5">
        <span className="text-[11px] font-mono text-neutral-500">
          {movement.batchNumber || "—"}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className="text-xs tabular-nums text-neutral-500">{movement.qtyBefore}</span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className={cn(
          "text-xs font-semibold tabular-nums",
          isNegative ? "text-red-600" : "text-green-600",
        )}>
          {isNegative ? movement.qtyChange : `+${movement.qtyChange}`}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className="text-xs font-medium tabular-nums text-neutral-900 dark:text-neutral-50">
          {movement.qtyAfter}
        </span>
      </td>
      <td className="hidden lg:table-cell px-3 py-2.5">
        <span className="text-[11px] font-mono text-neutral-400">
          {movement.referenceNumber || "—"}
        </span>
      </td>
    </tr>
  );
});

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function InventoryMovementTable() {
  const searchQuery = useInventoryStore((s) => s.searchQuery);
  const setSearchQuery = useInventoryStore((s) => s.setSearchQuery);
  const loadDemoData = useInventoryStore((s) => s.loadDemoData);
  const movements = useInventoryStore((s) => s.stockMovements);
  const batches = useInventoryStore((s) => s.batches);

  useEffect(() => {
    if (batches.length === 0) loadDemoData();
  }, [batches.length, loadDemoData]);

  const [typeFilter, setTypeFilter] = useState<MovementType | "all">("all");

  const filtered = useMemo(() => {
    let result = movements;
    if (typeFilter !== "all") result = result.filter((m) => m.type === typeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.productName.toLowerCase().includes(q) ||
          m.batchNumber.toLowerCase().includes(q) ||
          m.referenceNumber.toLowerCase().includes(q),
      );
    }
    // Newest first
    return [...result].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [movements, typeFilter, searchQuery]);

  return (
    <div>
      {/* Filters + Search */}
      <div className="mb-4 flex gap-3 flex-wrap">
        <div className="flex flex-wrap rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={cn(
                "px-2 py-1 text-[11px] font-medium rounded-md transition-colors",
                typeFilter === f.value
                  ? "bg-brand-600 text-white"
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
            placeholder="Cari produk, batch, atau ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="w-[14%] hidden md:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Waktu
              </th>
              <th className="w-[11%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Tipe
              </th>
              <th className="w-[21%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Produk
              </th>
              <th className="w-[13%] hidden sm:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Batch
              </th>
              <th className="w-[9%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Awal
              </th>
              <th className="w-[9%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                +/-
              </th>
              <th className="w-[9%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Akhir
              </th>
              <th className="w-[14%] hidden lg:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Ref
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-neutral-400">
                  <TrendingUp className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Tidak ada riwayat mutasi stok
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <MovementRow key={m.id} movement={m} />
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[10px] text-neutral-400">
        {filtered.length} mutasi — data demo
      </p>
    </div>
  );
}
