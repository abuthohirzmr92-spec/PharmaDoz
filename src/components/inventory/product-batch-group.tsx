// ---------------------------------------------------------------------------
// RC1 — ProductBatchGroup + WorkspaceBar (Reusable)
// ---------------------------------------------------------------------------
// Product-centric FEFO workspace for Stock Opname.
// Used by: Session Stock Opname (editable) + Detail Laporan (readonly).
//
// Architecture: Presentation layer only — zero impact on posting engine,
// adjustment engine, repository, or database.
// ---------------------------------------------------------------------------

"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

// ============================================================================
// Types
// ============================================================================

export interface BatchItem {
  key: string;
  productId: string;
  batchId: string;
  productName: string;
  batchNumber: string;
  systemQty: number;
  physicalQty: number;
  status: "pending" | "counted" | "skipped";
  note: string;
  expiredDate?: string;
  rackLocation?: string | null;
}

export interface ProductGroup {
  productId: string;
  productName: string;
  batches: BatchItem[];
  totalSystemQty: number;
  totalBatch: number;
}

export type BatchGroupMode = "editable" | "readonly";

export interface WorkspaceFilters {
  searchTerm: string;
  locationFilter: string;     // "" = all
  statusFilter: "all" | "pending" | "partial" | "done";
}

// ============================================================================
// Grouping Engine (pure function)
// ============================================================================

export function groupBatchesByProduct(
  items: BatchItem[],
  filters?: WorkspaceFilters,
): ProductGroup[] {
  const grouped = new Map<string, ProductGroup>();

  for (const item of items) {
    // ── Search filter ──
    if (filters?.searchTerm) {
      const q = filters.searchTerm.toLowerCase();
      if (!item.productName.toLowerCase().includes(q) &&
          !item.batchNumber.toLowerCase().includes(q)) continue;
    }

    // ── Location filter ──
    if (filters?.locationFilter) {
      const loc = (item.rackLocation ?? "").trim().toLowerCase();
      const target = filters.locationFilter.toLowerCase();
      if (loc !== target) continue;
    }

    // ── Group by product ──
    const key = item.productId || item.productName;
    if (!grouped.has(key)) {
      grouped.set(key, {
        productId: item.productId,
        productName: item.productName,
        batches: [],
        totalSystemQty: 0,
        totalBatch: 0,
      });
    }
    const group = grouped.get(key)!;
    group.batches.push(item);
    group.totalSystemQty += item.systemQty;
    group.totalBatch = group.batches.length;
  }

  // ── Status filter (post-grouping) ──
  let result = Array.from(grouped.values());
  if (filters?.statusFilter && filters.statusFilter !== "all") {
    result = result.filter((g) => {
      const done = g.batches.filter(b => b.status === "counted" || b.status === "skipped").length;
      if (filters.statusFilter === "done") return done === g.totalBatch;
      if (filters.statusFilter === "pending") return done === 0;
      if (filters.statusFilter === "partial") return done > 0 && done < g.totalBatch;
      return true;
    });
  }

  // ── FEFO sort within each group ──
  for (const group of result) {
    group.batches.sort((a, b) => {
      const expA = a.expiredDate ? new Date(a.expiredDate).getTime() : Infinity;
      const expB = b.expiredDate ? new Date(b.expiredDate).getTime() : Infinity;
      if (expA !== expB) return expA - expB;
      return a.batchNumber.localeCompare(b.batchNumber);
    });
  }

  return result.sort((a, b) => a.productName.localeCompare(b.productName));
}

// ============================================================================
// WorkspaceBar Component
// ============================================================================

interface WorkspaceBarProps {
  filters: WorkspaceFilters;
  onFiltersChange: (f: WorkspaceFilters) => void;
  locations: string[];
  totalProducts: number;
  totalBatches: number;
  progressPercent: number;
  completedBatches: number;
}

export function WorkspaceBar({
  filters,
  onFiltersChange,
  locations,
  totalProducts,
  totalBatches,
  progressPercent,
  completedBatches,
}: WorkspaceBarProps) {
  return (
    <div className="space-y-2 px-5 py-3 border-b dark:border-neutral-800 shrink-0">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
        <input
          type="text"
          value={filters.searchTerm}
          onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
          placeholder="Cari produk, batch, atau barcode..."
          className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Location dropdown (ADR-016: Master Lokasi Produk = source of truth) */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-neutral-400">📍</span>
          <select
            value={filters.locationFilter}
            onChange={(e) => onFiltersChange({ ...filters, locationFilter: e.target.value })}
            className="rounded border border-neutral-200 bg-white px-2 py-1.5 text-[10px] text-neutral-600 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          >
            <option value="">Semua Lokasi</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Status + Stats row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status filter */}
        {(["all", "pending", "partial", "done"] as const).map((s) => (
          <button
            key={s}
            onClick={() => onFiltersChange({ ...filters, statusFilter: s })}
            className={cn(
              "rounded px-2.5 py-1 text-[10px] font-medium transition-colors",
              filters.statusFilter === s
                ? "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-400"
                : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            )}
          >
            {s === "all" ? "Semua" : s === "pending" ? "Belum Dihitung" : s === "partial" ? "Sebagian" : "Selesai"}
          </button>
        ))}

        <span className="text-[10px] text-neutral-300 dark:text-neutral-600">|</span>

        {/* Stats */}
        <span className="text-[10px] text-neutral-400">Produk <strong className="text-neutral-600 dark:text-neutral-300">{totalProducts}</strong></span>
        <span className="text-[10px] text-neutral-400">Batch <strong className="text-neutral-600 dark:text-neutral-300">{totalBatches}</strong></span>
        <span className="text-[10px] text-neutral-400">Progress <strong className="text-neutral-600 dark:text-neutral-300">{progressPercent}%</strong></span>
      </div>
    </div>
  );
}

// ============================================================================
// ProductBatchGroup Component
// ============================================================================

interface ProductBatchGroupProps {
  groups: ProductGroup[];
  mode: BatchGroupMode;
  showWorkspace?: boolean;
  workspaceProps?: {
    filters: WorkspaceFilters;
    onFiltersChange: (f: WorkspaceFilters) => void;
    locations: string[];
    totalProducts: number;
    totalBatches: number;
    progressPercent: number;
    completedBatches: number;
  };
  /** Editable callbacks */
  onSaveItem?: (key: string, qty: number) => void;
  onSkipItem?: (key: string) => void;
  onStartEdit?: (key: string, currentQty: number) => void;
  editingKey?: string | null;
  editValue?: string;
  onEditChange?: (value: string) => void;
  onEditConfirm?: (key: string) => void;
  onEditCancel?: () => void;
}

export function ProductBatchGroup({
  groups,
  mode,
  showWorkspace,
  workspaceProps,
  onStartEdit, editingKey, editValue, onEditChange, onEditConfirm, onEditCancel, onSkipItem,
}: ProductBatchGroupProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (productId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
  };

  const computedGroups = useMemo(() => groups, [groups]);

  if (computedGroups.length === 0) {
    return (
      <>
        {showWorkspace && workspaceProps && (
          <WorkspaceBar {...workspaceProps} />
        )}
        <div className="py-12 text-center text-sm text-neutral-400">
          Tidak ada item untuk ditampilkan.
        </div>
      </>
    );
  }

  return (
    <>
      {showWorkspace && workspaceProps && (
        <WorkspaceBar {...workspaceProps} />
      )}

      <div className="divide-y dark:divide-neutral-800">
        {computedGroups.map((group) => {
          const isCollapsed = collapsed.has(group.productId);
          const counted = group.batches.filter(b => b.status === "counted" || b.status === "skipped").length;
          const pct = group.totalBatch > 0 ? Math.round((counted / group.totalBatch) * 100) : 0;
          const totalPhysical = group.batches.reduce((s, b) => s + (b.physicalQty || 0), 0);
          const totalDiff = totalPhysical - group.totalSystemQty;
          const isComplete = counted === group.totalBatch;

          return (
            <div key={group.productId}>
              {/* ── Product Header ── */}
              <button
                onClick={() => toggle(group.productId)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <span className="text-[10px] text-neutral-400 w-4 shrink-0">
                  {isCollapsed ? "▶" : "▼"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 truncate">
                      {group.productName}
                    </p>
                    {isComplete && counted > 0 && (
                      <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400">
                        ✔ Selesai
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-neutral-400">{group.totalBatch} Batch</span>
                    <span className="text-[10px] text-neutral-400">Sistem <strong className="text-neutral-600 dark:text-neutral-300">{group.totalSystemQty}</strong></span>
                    {mode === "editable" && totalPhysical > 0 && (
                      <>
                        <span className="text-[10px] text-neutral-400">Fisik <strong className="text-neutral-600 dark:text-neutral-300">{totalPhysical}</strong></span>
                        <span className={cn("text-[10px] font-medium",
                          totalDiff > 0 ? "text-green-600" : totalDiff < 0 ? "text-red-600" : "text-neutral-400")}>
                          Selisih {totalDiff > 0 ? "+" : ""}{totalDiff}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-1.5 w-16 rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <div className="h-1.5 rounded-full bg-brand-500 transition-all"
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] tabular-nums text-neutral-400">{counted}/{group.totalBatch}</span>
                </div>
              </button>

              {/* ── Batch Children ── */}
              {!isCollapsed && (
                <div className="border-t dark:border-neutral-800">
                  <div className="flex items-center gap-2 px-5 py-1.5 text-[10px] font-medium uppercase text-neutral-400 bg-neutral-50/50 dark:bg-neutral-900/30">
                    <span className="w-[18%]">Batch</span>
                    <span className="w-[11%]">Expired</span>
                    <span className="w-[10%] text-right">Sistem</span>
                    <span className="w-[10%] text-right">Fisik</span>
                    <span className="w-[10%] text-right">Selisih</span>
                    <span className="w-[10%] text-center">Status</span>
                    {mode === "editable" && <span className="flex-1 text-center">Aksi</span>}
                  </div>

                  {group.batches.map((item, idx) => {
                    const isEditing = editingKey === item.key;
                    const diff = item.physicalQty - item.systemQty;
                    const isFefo = idx === 0 && group.batches.length > 1 && item.expiredDate;

                    return (
                      <div key={item.key} className={cn(
                        "flex items-center gap-2 px-5 py-2 text-xs border-t dark:border-neutral-800",
                        item.status === "counted" && "bg-green-50/30 dark:bg-green-950/10",
                        item.status === "skipped" && "bg-neutral-50 dark:bg-neutral-900/50",
                      )}>
                        <span className="w-[18%]">
                          {isFefo && (
                            <span className="inline-block rounded bg-green-100 px-1 py-0.5 text-[8px] font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400 mr-1">
                              FEFO
                            </span>
                          )}
                          <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                            {item.batchNumber || "—"}
                          </span>
                        </span>
                        <span className="w-[11%] text-[11px] text-neutral-500">
                          {item.expiredDate
                            ? new Date(item.expiredDate).toLocaleDateString("id-ID", { month: "short", year: "numeric" })
                            : "—"}
                        </span>
                        <span className="w-[10%] text-right tabular-nums text-neutral-500">{item.systemQty}</span>
                        <span className="w-[10%] text-right">
                          {mode === "editable" && isEditing ? (
                            <input
                              type="text" inputMode="numeric" pattern="[0-9]*"
                              value={editValue}
                              onChange={(e) => onEditChange?.(e.target.value.replace(/\D/g, ""))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") onEditConfirm?.(item.key);
                                if (e.key === "Escape") onEditCancel?.();
                              }}
                              className="w-14 rounded border border-brand-300 bg-white px-1.5 py-0.5 text-right text-xs tabular-nums focus:border-brand-500 focus:outline-none dark:border-brand-700 dark:bg-neutral-800 dark:text-neutral-50"
                              placeholder="0" autoFocus
                            />
                          ) : (
                            <span className={cn("tabular-nums text-[11px]",
                              item.physicalQty > 0 ? "font-medium text-neutral-700 dark:text-neutral-300" : "text-neutral-400")}>
                              {item.physicalQty || "—"}
                            </span>
                          )}
                        </span>
                        <span className={cn("w-[10%] text-right tabular-nums text-[11px] font-medium",
                          diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-neutral-400")}>
                          {item.status === "pending" ? "—" : diff > 0 ? `+${diff}` : diff === 0 ? "0" : diff}
                        </span>
                        <span className="w-[10%] text-center">
                          <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium",
                            item.status === "counted" && "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
                            item.status === "skipped" && "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
                            item.status === "pending" && "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
                          )}>
                            {item.status === "counted" ? "Counted" : item.status === "skipped" ? "Skipped" : "Pending"}
                          </span>
                        </span>
                        {mode === "editable" && (
                          <span className="flex-1 text-center">
                            {isEditing ? (
                              <div className="flex gap-1 justify-center">
                                <button onClick={() => onEditConfirm?.(item.key)}
                                  className="rounded bg-green-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-green-700">Simpan</button>
                                <button onClick={() => onEditCancel?.()}
                                  className="rounded border px-2 py-1 text-[10px] text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700">Batal</button>
                              </div>
                            ) : (
                              <div className="flex gap-1 justify-center">
                                <button onClick={() => onStartEdit?.(item.key, item.physicalQty)}
                                  className="rounded bg-brand-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-brand-700">
                                  {item.status === "pending" ? "Hitung" : "Edit"}
                                </button>
                                {item.status === "pending" && (
                                  <button onClick={() => onSkipItem?.(item.key)}
                                    className="rounded border px-2 py-1 text-[10px] text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700">Skip</button>
                                )}
                              </div>
                            )}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
