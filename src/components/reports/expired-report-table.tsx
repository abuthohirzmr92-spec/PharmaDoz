"use client";

import { useState, useMemo, useEffect } from "react";
import { Search } from "lucide-react";
import { useInventoryStore } from "@/store/inventory-store";
import { getDaysUntilExpiry, getExpiredBatches, getNearExpiryBatches } from "@/lib/inventory-demo";
import { cn } from "@/lib/cn";

type ViewMode = "expired" | "h30" | "h14" | "all";

const VIEWS: { key: ViewMode; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "expired", label: "Expired" },
  { key: "h30", label: "H-30" },
  { key: "h14", label: "H-14" },
];

export function ExpiredReportTable() {
  const isLoading = useInventoryStore((s) => s.isLoading);
  const load = useInventoryStore((s) => s.loadDemoData);
  const batches = useInventoryStore((s) => s.batches);

  useEffect(() => {
    if (batches.length === 0) load();
  }, [batches.length, load]);

  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const expiredBatches = useMemo(() => getExpiredBatches(batches), [batches]);
  const nearH30 = useMemo(() => getNearExpiryBatches(batches, 30), [batches]);
  const nearH14 = useMemo(() => getNearExpiryBatches(batches, 14), [batches]);

  const filtered = useMemo(() => {
    let result = batches.filter((b) => b.quantity > 0);

    switch (viewMode) {
      case "expired":
        result = expiredBatches;
        break;
      case "h30":
        result = getNearExpiryBatches(batches, 30);
        break;
      case "h14":
        result = getNearExpiryBatches(batches, 14);
        break;
      default:
        result = [...expiredBatches, ...nearH30];
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
      (a, b) => new Date(a.expiredDate).getTime() - new Date(b.expiredDate).getTime(),
    );
  }, [batches, viewMode, searchQuery, expiredBatches, nearH30]);

  // Summary
  const expiredValue = useMemo(
    () => expiredBatches.reduce((s, b) => s + b.quantity * b.sellingPrice, 0),
    [expiredBatches],
  );
  const h30Value = useMemo(
    () => nearH30.reduce((s, b) => s + b.quantity * b.sellingPrice, 0),
    [nearH30],
  );
  const h14Value = useMemo(
    () => nearH14.reduce((s, b) => s + b.quantity * b.sellingPrice, 0),
    [nearH14],
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary bar */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([
          { label: "EXPIRED", count: expiredBatches.length, value: expiredValue, cls: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 text-red-700" },
          { label: "H-14", count: nearH14.length, value: h14Value, cls: "border-red-200 bg-red-50/70 dark:bg-red-950/10 text-red-600" },
          { label: "H-30", count: nearH30.length, value: h30Value, cls: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 text-amber-700" },
        ]).map((s) => (
          <div
            key={s.label}
            className={cn("rounded-xl border px-3 py-2", s.cls)}
          >
            <span className="text-[10px] font-medium uppercase">{s.label}</span>
            <p className="mt-0.5 text-xs font-bold">
              {s.count} batch · Rp {Math.round(s.value).toLocaleString("id-ID")}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                viewMode === v.key
                  ? "bg-brand-600 text-white"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
              )}
            >
              {v.label}
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

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="w-[28%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Produk</th>
              <th className="w-[18%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Batch</th>
              <th className="w-[16%] hidden sm:table-cell px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">ED</th>
              <th className="w-[12%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Hari</th>
              <th className="w-[14%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Qty</th>
              <th className="w-[12%] hidden sm:table-cell px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Nilai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-neutral-400">
                  {viewMode === "expired" ? "Tidak ada batch kadaluarsa" : "Tidak ada batch mendekati ED"}
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
                      isExpired ? "bg-red-50/50 dark:bg-red-950/10" : days <= 14 ? "bg-red-50/30 dark:bg-red-950/5" : days <= 30 && "bg-amber-50/50 dark:bg-amber-950/10",
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate block">
                        {b.productName}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[11px] font-mono text-neutral-600 dark:text-neutral-400">{b.batchNumber}</span>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5 text-right">
                      <span className="text-xs tabular-nums text-neutral-500">
                        {new Date(b.expiredDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={cn("text-xs font-semibold tabular-nums", isExpired ? "text-red-600" : days <= 14 ? "text-red-500" : "text-amber-600")}>
                        {isExpired ? `+${Math.abs(days)}` : days}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-xs font-medium tabular-nums text-neutral-900 dark:text-neutral-50">{b.quantity}</span>
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
