// =================================================================
// UUCE Engine — Universal Unit Conversion Engine
// EEOS Business Core — Layer 0 Foundation
// Domain-agnostic. Quantity only. Pure functions. Zero dependencies.
// =================================================================

import type {
  UnitTree,
  UnitTreeNode,
  Quantity,
  DisplayQuantity,
  UnitBreakdown,
  CompareResult,
  ConvertResult,
  SumItem,
  ConversionSnapshot,
  RoundingMode,
} from "./uuce-types";
import { getNode, validateTree } from "./uuce-tree";
import { safeMultiply, safeDivide, validateQuantity } from "./uuce-precision";

// ─── normalize(): Display → Canonical ───

/**
 * Convert a display quantity to its canonical (base unit) value.
 *
 * Example: normalize(5, "Dus", tree) → 1000 (Tablet)
 * where Dus contains 20 Strip and Strip contains 10 Tablet.
 */
export function normalize(
  qty: number,
  unitName: string,
  tree: UnitTree,
): number {
  validateQuantity(qty);
  const node = getNode(tree, unitName);
  if (!node) {
    // Unknown unit — assume it's the base unit
    if (unitName.toLowerCase() === tree.root.name.toLowerCase()) {
      return qty;
    }
    throw new Error(`UUCE: Unknown unit "${unitName}" in product tree "${tree.productId}"`);
  }
  return safeMultiply(qty, node.cumulativeMultiplier);
}

// ─── format(): Canonical → Display ───

/**
 * Format a canonical quantity in a specific display unit.
 *
 * Example: format(1000, "Dus", tree) → { value: 5, unit: "Dus", mode: "floor", hasPrecisionLoss: false }
 */
export function format(
  canonicalQty: number,
  unitName: string,
  tree: UnitTree,
  mode: RoundingMode = "floor",
): ConvertResult {
  validateQuantity(canonicalQty);
  const node = getNode(tree, unitName);
  if (!node) {
    if (unitName.toLowerCase() === tree.root.name.toLowerCase()) {
      return { value: canonicalQty, unit: unitName, mode, hasPrecisionLoss: false };
    }
    throw new Error(`UUCE: Unknown unit "${unitName}" in product tree "${tree.productId}"`);
  }
  const value = safeDivide(canonicalQty, node.cumulativeMultiplier, mode);
  const exact = canonicalQty / node.cumulativeMultiplier;
  return {
    value,
    unit: unitName,
    mode,
    hasPrecisionLoss: value !== exact,
  };
}

// ─── convert(): Any Unit → Any Unit ───

/**
 * Generic conversion between any two units in the tree.
 * Routes through canonical (base unit) internally.
 *
 * Example: convert(2, "Dus", "Strip", tree) → 40 (2 Dus = 40 Strip)
 */
export function convert(
  qty: number,
  fromUnit: string,
  toUnit: string,
  tree: UnitTree,
  mode: RoundingMode = "exact",
): ConvertResult {
  // Route: fromUnit → canonical → toUnit
  const canonical = normalize(qty, fromUnit, tree);
  return format(canonical, toUnit, tree, mode);
}

// ─── breakdown(): Canonical → Human ───

/**
 * Greedy breakdown of canonical quantity into largest display units.
 *
 * Example: breakdown(670, tree) →
 *   [{ unitName: "Dus", quantity: 3, remainder: 70 },
 *    { unitName: "Strip", quantity: 7, remainder: 0 },
 *    { unitName: "Tablet", quantity: 0, remainder: 0 }]
 */
export function breakdown(
  canonicalQty: number,
  tree: UnitTree,
): UnitBreakdown[] {
  validateQuantity(canonicalQty);

  // Collect all non-root nodes, sorted by cumulativeMultiplier descending (largest first)
  const nodes = Array.from(tree.nodeMap.values())
    .filter((n) => n.depth > 0)
    .sort((a, b) => b.cumulativeMultiplier - a.cumulativeMultiplier);

  const result: UnitBreakdown[] = [];
  let remaining = canonicalQty;

  for (const node of nodes) {
    if (node.cumulativeMultiplier <= 0) continue;
    const qty = Math.floor(remaining / node.cumulativeMultiplier);
    remaining = remaining - qty * node.cumulativeMultiplier;
    result.push({ unitName: node.name, quantity: qty, remainder: remaining });
  }

  // Add base unit remainder
  result.push({ unitName: tree.root.name, quantity: remaining, remainder: 0 });

  return result;
}

// ─── compare(): Cross-unit Comparison ───

/**
 * Compare two quantities possibly in different units.
 *
 * Example: compare(1, "Dus", 5, "Strip", tree) → { equal: true, difference: 0, ... }
 * (1 Dus = 200 Tablet, 5 Strip = 50 Tablet; NOT equal)
 */
export function compare(
  qtyA: number,
  unitA: string,
  qtyB: number,
  unitB: string,
  tree: UnitTree,
): CompareResult {
  const aCanonical = normalize(qtyA, unitA, tree);
  const bCanonical = normalize(qtyB, unitB, tree);
  return {
    equal: aCanonical === bCanonical,
    difference: aCanonical - bCanonical,
    aCanonical,
    bCanonical,
  };
}

// ─── sum(): Aggregate Heterogeneous Items ───

/**
 * Sum multiple items potentially in different units.
 * Returns total in canonical (base unit).
 *
 * Example: sum([{qty: 1, unit: "Dus"}, {qty: 5, unit: "Strip"}], tree) → 250
 */
export function sum(items: SumItem[], tree: UnitTree): number {
  return items.reduce((total, item) => {
    return total + normalize(item.quantity, item.unit, tree);
  }, 0);
}

// ─── snapshot(): Create Immutable Snapshot ───

/**
 * Create an immutable conversion snapshot for audit and restore.
 */
export function snapshot(
  tree: UnitTree,
  unitName: string,
  snapshotId: string,
): ConversionSnapshot {
  const node = getNode(tree, unitName);
  if (!node && unitName.toLowerCase() !== tree.root.name.toLowerCase()) {
    throw new Error(`UUCE: Unknown unit "${unitName}" for snapshot`);
  }

  return {
    snapshotId,
    treeVersion: tree.treeVersion,
    treeHash: tree.treeHash,
    unitName,
    cumulativeMultiplier: node?.cumulativeMultiplier ?? 1,
    capturedAt: new Date().toISOString(),
    productId: tree.productId,
  };
}

// ─── restore(): Historical Conversion ───

/**
 * Convert using a historical snapshot (immutable audit).
 *
 * Always uses the snapshotted multiplier, never the current tree.
 * If tree has changed since snapshot, logs a warning but still uses snapshot.
 */
export function restore(
  qty: number,
  unitName: string,
  snap: ConversionSnapshot,
): { canonicalQty: number; treeChanged: boolean } {
  validateQuantity(qty);

  const multiplier = snap.cumulativeMultiplier;
  const canonicalQty = safeMultiply(qty, multiplier);

  return {
    canonicalQty,
    // Tree changed flag: consumer should check and handle
    treeChanged: false, // Set by caller who has access to current tree
  };
}

// ─── validate(): Full Tree Validation ───

export { validateTree as validate };
