// ---------------------------------------------------------------------------
// V2 Phase 3A — Unit Converter Engine (Facade over Phase 1A)
// ⚠️ DEPRECATED — Use UUCE (src/lib/uuce/) instead.
//    This file is maintained for backward compatibility during migration.
//    New code should use: import { normalize, format, breakdown } from "@/lib/uuce"
//    Migration: SPR-CORE-001B Phase 3 (module-by-module adoption)
// ---------------------------------------------------------------------------
// Pure functions. Zero side effects. Zero DB/repository/API.
//
// Design:
//   Phase 1A helper = source of truth (recursive engine).
//   Phase 3A = human-friendly API — lookup by unitName instead of level number.
// ---------------------------------------------------------------------------

import type { UnitLevel } from "@/types/unit";
import {
  convertToBaseUnit,
  convertFromBaseUnit,
  getTotalMultiplier,
} from "./unit-helper";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Cari UnitLevel berdasarkan unitName (case-insensitive).
 * Returns undefined jika tidak ditemukan — artinya ini base unit.
 */
function findLevelByName(
  unitName: string,
  unitLevels: UnitLevel[],
): UnitLevel | undefined {
  const normalized = unitName.trim().toLowerCase();
  return unitLevels.find((ul) => ul.unitName.trim().toLowerCase() === normalized);
}

// ============================================================================
// toBaseUnit — Display Unit → Base Unit (by name)
// ============================================================================

/**
 * Konversi quantity dari satuan display ke satuan dasar.
 * Lookup by unitName, delegate ke Phase 1A `convertToBaseUnit`.
 *
 * Contoh:
 *   toBaseUnit(2, "Dus", unitLevels)     → 400
 *   toBaseUnit(3, "Strip", unitLevels)   → 30
 *   toBaseUnit(5, "Tablet", unitLevels)  → 5
 *
 * @param qty         Jumlah dalam satuan asal
 * @param unitName    Nama satuan asal (e.g. "Dus", "Strip", atau base unit)
 * @param unitLevels  Array UnitLevel dari produk
 * @returns Jumlah dalam satuan dasar
 */
export function toBaseUnit(
  qty: number,
  unitName: string,
  unitLevels: UnitLevel[],
): number {
  const found = findLevelByName(unitName, unitLevels);
  if (!found) return qty; // base unit — no conversion needed
  return convertToBaseUnit(qty, found.level, unitLevels);
}

// ============================================================================
// fromBaseUnit — Base Unit → Display Unit (by name)
// ============================================================================

/**
 * Konversi quantity dari satuan dasar ke satuan display.
 * Lookup by unitName, delegate ke Phase 1A `convertFromBaseUnit`.
 *
 * Contoh:
 *   fromBaseUnit(400, "Dus", unitLevels)     → 2
 *   fromBaseUnit(30, "Strip", unitLevels)    → 3
 *   fromBaseUnit(5, "Tablet", unitLevels)    → 5
 *
 * @param baseQty     Jumlah dalam satuan dasar
 * @param unitName    Nama satuan tujuan (e.g. "Dus", "Strip", atau base unit)
 * @param unitLevels  Array UnitLevel dari produk
 * @returns Jumlah dalam satuan tujuan (integer, pembulatan ke bawah)
 */
export function fromBaseUnit(
  baseQty: number,
  unitName: string,
  unitLevels: UnitLevel[],
): number {
  const found = findLevelByName(unitName, unitLevels);
  if (!found) return baseQty; // base unit — no conversion needed
  return convertFromBaseUnit(baseQty, found.level, unitLevels);
}

// ============================================================================
// Breakdown
// ============================================================================

export interface UnitBreakdown {
  /** Nama satuan, e.g. "Dus", "Strip", "Tablet" */
  unitName: string;
  /** Jumlah dalam satuan ini */
  quantity: number;
}

/**
 * Pecah quantity satuan dasar menjadi representasi bertingkat.
 * Greedy: mulai dari level terbesar → menengah → base unit.
 *
 * Contoh:
 *   breakdownBaseUnit(427, [{ level:2, unitName:"Strip", contains:10 }, { level:3, unitName:"Dus", contains:20 }], "Tablet")
 *   → [
 *       { unitName: "Dus", quantity: 2 },
 *       { unitName: "Strip", quantity: 2 },
 *       { unitName: "Tablet", quantity: 7 },
 *     ]
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
  const result: UnitBreakdown[] = [];
  let remaining = baseQty;

  // Urutkan dari level terbesar ke terkecil
  const sorted = [...unitLevels].sort((a, b) => b.level - a.level);

  for (const ul of sorted) {
    const multiplier = getTotalMultiplier(unitLevels, ul.level);
    const count = Math.floor(remaining / multiplier);
    if (count > 0) {
      result.push({ unitName: ul.unitName, quantity: count });
      remaining -= count * multiplier;
    }
  }

  // Sisa = base unit
  if (remaining > 0 || result.length === 0) {
    result.push({ unitName: baseUnitName, quantity: remaining });
  }

  return result;
}
