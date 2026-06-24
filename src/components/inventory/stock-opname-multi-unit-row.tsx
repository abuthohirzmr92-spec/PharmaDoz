"use client";

// ---------------------------------------------------------------------------
// V3 P3B — Multi Unit Stock Opname Level-3 UX
// ---------------------------------------------------------------------------
// Pure presentational component. Uses P3A engine for real-time calculation.
// Backward compatible — single unit products keep existing simple input.
// ---------------------------------------------------------------------------

import { useMemo, useCallback } from "react";
import type { UnitLevel } from "@/types/unit";
import {
  buildDefaultCounts,
  computeMultiUnitOpname,
  type MultiUnitCount,
} from "@/lib/unit-opname";

export interface StockOpnameMultiUnitRowProps {
  /** Base unit name, e.g. "Tablet" */
  baseUnit: string;
  /** Unit levels from product master */
  unitLevels?: UnitLevel[];
  /** System quantity (base unit) */
  systemQty: number;
  /** Current multi-unit counts (or undefined for initial) */
  counts: MultiUnitCount[];
  /** Callback when any qty changes */
  onChange: (counts: MultiUnitCount[], physicalBaseQty: number, variance: number) => void;
}

export function StockOpnameMultiUnitRow({
  baseUnit,
  unitLevels,
  systemQty,
  counts,
  onChange,
}: StockOpnameMultiUnitRowProps) {
  const levels = unitLevels ?? [];

  // If no multi-unit, don't render additional rows — parent handles single input
  if (levels.length === 0) return null;

  // Real-time recompute on every counts change
  const result = useMemo(
    () => computeMultiUnitOpname(levels, counts, systemQty),
    [levels, counts, systemQty],
  );

  const handleQtyChange = useCallback(
    (index: number, raw: string) => {
      const cleaned = raw.replace(/\D/g, "").replace(/^0+/, "") || "0";
      const qty = parseInt(cleaned, 10) || 0;
      const next = counts.map((c, i) => (i === index ? { ...c, qty } : c));
      const { counts: updated, physicalBaseQty, variance } =
        computeMultiUnitOpname(levels, next, systemQty);
      onChange(updated, physicalBaseQty, variance);
    },
    [counts, levels, systemQty, onChange],
  );

  return (
    <div className="mt-2 space-y-1.5">
      {/* Multi-unit counting rows */}
      {result.counts.map((c, i) => (
        <div key={c.unit} className="flex items-center gap-2 text-xs">
          <span className="w-16 shrink-0 text-neutral-500">{c.unit}</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={c.qty === 0 ? "" : String(c.qty)}
            onChange={(e) => handleQtyChange(i, e.target.value)}
            className="w-16 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-center text-xs tabular-nums focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
            placeholder="0"
          />
          <span className="text-[10px] text-neutral-400">
            = {c.baseQty.toLocaleString("id-ID")} {baseUnit}
          </span>
        </div>
      ))}

      {/* Physical total + variance */}
      <div className="flex items-center gap-3 border-t border-neutral-100 pt-1.5 dark:border-neutral-700">
        <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
          Total Fisik: {result.physicalBaseQty.toLocaleString("id-ID")} {baseUnit}
        </span>
        <span
          className={`text-[11px] font-medium tabular-nums ${
            result.variance === 0
              ? "text-neutral-400"
              : result.variance > 0
                ? "text-green-600"
                : "text-red-600"
          }`}
        >
          {result.variance === 0 ? "✓" : result.variance > 0 ? `+${result.variance}` : `${result.variance}`}
          {" "}{baseUnit}
        </span>
      </div>
    </div>
  );
}

/**
 * Initialize counts for a product. Called once when modal opens.
 */
export function initMultiUnitCounts(
  unitLevels?: UnitLevel[],
  baseUnit?: string,
): MultiUnitCount[] {
  return buildDefaultCounts(unitLevels ?? [], baseUnit ?? "pcs");
}
