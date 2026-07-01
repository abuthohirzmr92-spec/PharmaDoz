// =================================================================
// useUUCE Hook — React integration for Universal Unit Conversion Engine
// EEOS Business Core — Layer 0 Foundation
//
// Provides a React-friendly wrapper around UUCE for components.
// Handles tree caching, loading states, and error boundaries.
// =================================================================

"use client";

import { useMemo, useCallback } from "react";
import type { UnitTree } from "@/lib/uuce/uuce-types";
import {
  normalize,
  format,
  convert,
  breakdown,
  compare,
  sum,
  snapshot,
} from "@/lib/uuce/uuce-engine";
import { buildTree } from "@/lib/uuce/uuce-tree";
import { getTree } from "@/lib/uuce/uuce-registry";
import type { RoundingMode, ConvertResult, UnitBreakdown, CompareResult } from "@/lib/uuce/uuce-types";

interface UseUUCEOptions {
  productId: string;
  baseUnit: string;
  unitLevels?: Array<{
    id?: string;
    level: number;
    unitName: string;
    contains: number;
    parentUnitName?: string;
  }>;
  treeVersion?: number;
}

export function useUUCE(options: UseUUCEOptions) {
  const { productId, baseUnit, unitLevels } = options;

  // Build or retrieve the tree (memoized)
  const tree: UnitTree | null = useMemo(() => {
    if (!unitLevels || unitLevels.length === 0) return null;
    try {
      // Try cache first
      const cached = getTree(productId);
      if (cached) return cached;
      // Build and cache
      return buildTree({
        productId,
        baseUnit,
        unitLevels: unitLevels.map((ul) => ({
          ...ul,
          parentUnitName: ul.level === 2 ? baseUnit : unitLevels.find((l) => l.level === ul.level - 1)?.unitName,
        })),
      });
    } catch {
      return null;
    }
  }, [productId, baseUnit, unitLevels]);

  // ── Conversion methods ──

  const toCanonical = useCallback(
    (qty: number, unitName: string): number => {
      if (!tree) return qty;
      return normalize(qty, unitName, tree);
    },
    [tree],
  );

  const toDisplay = useCallback(
    (canonicalQty: number, unitName: string, mode: RoundingMode = "floor"): ConvertResult => {
      if (!tree) return { value: canonicalQty, unit: unitName, mode, hasPrecisionLoss: false };
      return format(canonicalQty, unitName, tree, mode);
    },
    [tree],
  );

  const toUnit = useCallback(
    (qty: number, fromUnit: string, toUnit: string): ConvertResult => {
      if (!tree) return { value: qty, unit: toUnit, mode: "exact", hasPrecisionLoss: false };
      return convert(qty, fromUnit, toUnit, tree);
    },
    [tree],
  );

  const toBreakdown = useCallback(
    (canonicalQty: number): UnitBreakdown[] => {
      if (!tree) return [{ unitName: baseUnit, quantity: canonicalQty, remainder: 0 }];
      return breakdown(canonicalQty, tree);
    },
    [tree, baseUnit],
  );

  const compareQty = useCallback(
    (qtyA: number, unitA: string, qtyB: number, unitB: string): CompareResult | null => {
      if (!tree) return null;
      return compare(qtyA, unitA, qtyB, unitB, tree);
    },
    [tree],
  );

  const sumItems = useCallback(
    (items: Array<{ quantity: number; unit: string }>): number => {
      if (!tree) return items.reduce((t, i) => t + i.quantity, 0);
      return sum(items, tree);
    },
    [tree],
  );

  const takeSnapshot = useCallback(
    (unitName: string, snapshotId: string) => {
      if (!tree) return null;
      return snapshot(tree, unitName, snapshotId);
    },
    [tree],
  );

  return {
    tree,
    hasTree: tree !== null,
    toCanonical,
    toDisplay,
    toUnit,
    toBreakdown,
    compareQty,
    sumItems,
    takeSnapshot,
  };
}
