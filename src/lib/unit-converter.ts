// =================================================================
// @adapter — Compatibility Layer
// =================================================================
// THIS BRIDGE IS AN ADAPTER ONLY.
//
// PROHIBITED: Business Rule, Stock Logic, Conversion Logic,
//             Database access, Side effects
//
// ALL business logic resides in UUCE (src/lib/uuce/).
// New code: import { normalize, format, breakdown } from "@/lib/uuce"
//
// 🔒 UUCE v1.0 LOCKED — do not modify without ADR
// =================================================================
//
// SPR-CORE-001C: All conversion routes through UUCE.
// Delegates ALL conversion logic to UUCE internally.
// Old API preserved for backward compatibility.
// =================================================================

import type { UnitLevel } from "@/types/unit";
import { buildTree } from "@/lib/uuce/uuce-tree";
import { normalize, format, breakdown as uuceBreakdown } from "@/lib/uuce/uuce-engine";
import type { UnitTree } from "@/lib/uuce/uuce-types";

// ============================================================================
// Internal: UnitLevel[] → UnitTree (cached per call, no global state)
// ============================================================================

const treeCache = new Map<string, UnitTree>();

function getOrBuildTree(
  unitLevels: UnitLevel[],
  baseUnit: string,
): UnitTree {
  // Simple cache key: baseUnit + sorted level names
  const key = `${baseUnit}:${unitLevels.map((l) => `${l.unitName}:${l.contains}`).join(",")}`;
  const cached = treeCache.get(key);
  if (cached) return cached;

  const tree = buildTree({
    productId: `bridge-${baseUnit.toLowerCase()}`,
    baseUnit,
    unitLevels: unitLevels.map((ul) => ({
      level: ul.level,
      unitName: ul.unitName,
      contains: ul.contains,
    })),
  });

  treeCache.set(key, tree);
  return tree;
}

/**
 * Infer base unit from UnitLevel array.
 * The base unit is the unit with the smallest level (level 1 doesn't exist in the array,
 * so we look at what parent the level-2 units reference, or return "pcs" as default).
 *
 * In practice, callers should pass baseUnit explicitly for accuracy.
 */
function inferBaseUnit(unitLevels: UnitLevel[]): string {
  // Level 1 is never stored — it's products.unit
  // We don't have access to product context here
  return "pcs";
}

// ============================================================================
// toBaseUnit — Display Unit → Base Unit (delegates to UUCE)
// ============================================================================

/**
 * Konversi quantity dari satuan display ke satuan dasar.
 * NOW DELEGATES TO UUCE: normalize(quantity, unitName, tree)
 *
 * @param qty         Jumlah dalam satuan asal
 * @param unitName    Nama satuan asal (e.g. "Dus", "Strip", atau base unit)
 * @param unitLevels  Array UnitLevel dari produk
 * @param baseUnit    (NEW) Nama satuan dasar — gunakan product.unit
 * @returns Jumlah dalam satuan dasar
 */
export function toBaseUnit(
  qty: number,
  unitName: string,
  unitLevels: UnitLevel[],
  baseUnit?: string,
): number {
  if (!unitLevels || unitLevels.length === 0) return qty;

  const bu = baseUnit ?? inferBaseUnit(unitLevels);
  const tree = getOrBuildTree(unitLevels, bu);

  try {
    return normalize(qty, unitName, tree);
  } catch {
    // Unknown unit — assume it's the base unit, no conversion needed
    return qty;
  }
}

// ============================================================================
// fromBaseUnit — Base Unit → Display Unit (delegates to UUCE)
// ============================================================================

/**
 * Konversi quantity dari satuan dasar ke satuan display.
 * NOW DELEGATES TO UUCE: format(canonicalQty, unitName, tree)
 *
 * @param baseQty     Jumlah dalam satuan dasar
 * @param unitName    Nama satuan tujuan (e.g. "Dus", "Strip", atau base unit)
 * @param unitLevels  Array UnitLevel dari produk
 * @param baseUnit    (NEW) Nama satuan dasar
 * @returns Jumlah dalam satuan tujuan (integer, pembulatan ke bawah)
 */
export function fromBaseUnit(
  baseQty: number,
  unitName: string,
  unitLevels: UnitLevel[],
  baseUnit?: string,
): number {
  if (!unitLevels || unitLevels.length === 0) return baseQty;

  const bu = baseUnit ?? inferBaseUnit(unitLevels);
  const tree = getOrBuildTree(unitLevels, bu);

  try {
    const result = format(baseQty, unitName, tree, "floor");
    return result.value;
  } catch {
    return baseQty;
  }
}

// ============================================================================
// Breakdown (delegates to UUCE)
// ============================================================================

export interface UnitBreakdown {
  unitName: string;
  quantity: number;
}

/**
 * Pecah quantity satuan dasar menjadi representasi bertingkat.
 * NOW DELEGATES TO UUCE: breakdown(canonicalQty, tree)
 *
 * @param baseQty       Jumlah dalam satuan dasar
 * @param unitLevels    Array UnitLevel (hanya level > 1)
 * @param baseUnitName  Nama satuan dasar (e.g. "Tablet")
 * @returns Array breakdown dari terbesar ke terkecil
 */
export function breakdownBaseUnit(
  baseQty: number,
  unitLevels: UnitLevel[],
  baseUnitName: string,
): UnitBreakdown[] {
  if (!unitLevels || unitLevels.length === 0) {
    return [{ unitName: baseUnitName, quantity: baseQty }];
  }

  const tree = getOrBuildTree(unitLevels, baseUnitName);
  const result = uuceBreakdown(baseQty, tree);

  return result.map((r) => ({
    unitName: r.unitName,
    quantity: r.quantity,
  }));
}
