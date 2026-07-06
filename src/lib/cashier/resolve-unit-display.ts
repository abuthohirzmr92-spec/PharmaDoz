// =================================================================
// resolveUnitDisplay — Pure runtime display computation
// 🔒 Cart V8 — Architecture Locked
//
// Resolves display quantities and prices from canonical CartItem data.
// PURE FUNCTION — receives ALL data as parameters. Zero lookups.
//
// Responsibility: Canonical → Display computation only
// NEVER: store, repository, inventory, formatting, mutation, network
//
// Used by: Cart Sidebar (Sprint 1), Receipt (Sprint 2),
//          Payment Preview (Sprint 3), Hold Cart (Sprint 4)
// =================================================================

import type { UnitLevel } from "@/types/unit";

// ─── Types ───

export interface DisplayContext {
  baseUnit: string;
  unitLevels: UnitLevel[];
}

export interface DisplayResult {
  displayQuantity: number;
  displayUnit: string;
  displayPrice: number;
  displaySubtotal: number;
  multiplier: number;
}

// ─── Resolver ───

/**
 * Compute cumulative multiplier for a unit at a given level.
 * Level 1 (base) = 1. Level 2 = contains(2). Level 3 = contains(2) × contains(3).
 */
function getMultiplier(level: number, unitLevels: UnitLevel[]): number {
  return unitLevels
    .filter((ul) => ul.level <= level)
    .reduce((m, ul) => m * ul.contains, 1);
}

/**
 * Find the unit name for a given level. Level 1 = baseUnit.
 */
function getUnitName(unitName: string | undefined, baseUnit: string): string {
  return unitName || baseUnit;
}

/**
 * Resolve display values from canonical CartItem data.
 *
 * @param baseQuantity      — Canonical quantity in base unit (e.g., 200 Tablet)
 * @param baseUnitPrice     — Canonical price per base unit (e.g., 1500/Tablet)
 * @param selectedUnitCode  — Stable business code of selected display unit (e.g., "DUS")
 * @param context           — Product Definition from caller (baseUnit + unitLevels)
 * @returns DisplayResult with display quantity, unit, price, subtotal, multiplier
 */
export function resolveUnitDisplay(
  baseQuantity: number,
  baseUnitPrice: number,
  selectedUnitCode: string | undefined,
  context: DisplayContext,
): DisplayResult {
  const { baseUnit, unitLevels } = context;

  // No multi-unit or base unit selected → display = canonical
  if (!selectedUnitCode || unitLevels.length === 0) {
    return {
      displayQuantity: baseQuantity,
      displayUnit: baseUnit,
      displayPrice: baseUnitPrice,
      displaySubtotal: baseQuantity * baseUnitPrice,
      multiplier: 1,
    };
  }

  // Find the matching unit level
  const level = unitLevels.find(
    (ul) => ul.unitName.trim().toLowerCase() === selectedUnitCode.trim().toLowerCase(),
  );

  // Not found → fall back to base unit
  if (!level) {
    return {
      displayQuantity: baseQuantity,
      displayUnit: baseUnit,
      displayPrice: baseUnitPrice,
      displaySubtotal: baseQuantity * baseUnitPrice,
      multiplier: 1,
    };
  }

  const multiplier = getMultiplier(level.level, unitLevels);
  const displayQuantity = baseQuantity / multiplier;
  const displayPrice = baseUnitPrice * multiplier;
  const displaySubtotal = displayQuantity * displayPrice;
  const displayUnit = getUnitName(level.unitName, baseUnit);

  return {
    displayQuantity,
    displayUnit,
    displayPrice,
    displaySubtotal,
    multiplier,
  };
}
