// ---------------------------------------------------------------------------
// V3 P3A — Multi Unit Stock Opname Engine (Level 3)
// ---------------------------------------------------------------------------
// Pure functions. Zero side effects. Zero DB/repository/API.
// Uses existing toBaseUnit from unit-converter (Phase 3A).
// ---------------------------------------------------------------------------

import type { UnitLevel } from "@/types/unit";
import { toBaseUnit } from "./unit-converter";

// ============================================================================
// Types
// ============================================================================

/** Satu entri counting dalam Multi Unit Opname */
export interface MultiUnitCount {
  /** Nama satuan, e.g. "Dus", "Strip", "Tablet" */
  unit: string;
  /** Jumlah yang dihitung user dalam satuan ini */
  qty: number;
  /** Hasil konversi ke base unit */
  baseQty: number;
}

export interface OpnameVariance {
  /** Total physical dalam base unit (sum of all baseQty) */
  physicalBaseQty: number;
  /** Selisih dengan system qty */
  variance: number;
}

// ============================================================================
// Engine
// ============================================================================

/**
 * Generate baris counting default untuk satu produk berdasarkan unitLevels.
 * Semua qty awal = 0.
 *
 * @param unitLevels  Array UnitLevel dari produk
 * @param baseUnitName Nama satuan dasar
 * @returns Array MultiUnitCount dengan qty=0
 */
export function buildDefaultCounts(
  unitLevels: UnitLevel[],
  baseUnitName: string,
): MultiUnitCount[] {
  const counts: MultiUnitCount[] = [];
  const sorted = [...unitLevels].sort((a, b) => b.level - a.level); // largest first

  for (const ul of sorted) {
    counts.push({ unit: ul.unitName, qty: 0, baseQty: 0 });
  }
  counts.push({ unit: baseUnitName, qty: 0, baseQty: 0 });
  return counts;
}

/**
 * Hitung ulang baseQty untuk setiap count berdasarkan qty yang diinput user.
 *
 * @param counts  Array MultiUnitCount dengan qty diisi user
 * @param unitLevels  Array UnitLevel dari produk
 * @returns Array MultiUnitCount dengan baseQty dikalkulasi ulang
 */
export function recomputeCounts(
  counts: MultiUnitCount[],
  unitLevels: UnitLevel[],
): MultiUnitCount[] {
  return counts.map((c) => ({
    ...c,
    baseQty: c.qty > 0 ? toBaseUnit(c.qty, c.unit, unitLevels) : 0,
  }));
}

/**
 * Hitung total physical dalam base unit dari semua multi-unit counts.
 *
 * @param counts  Array MultiUnitCount dengan baseQty valid
 * @returns Total base quantity
 */
export function computePhysicalBaseQty(counts: MultiUnitCount[]): number {
  return counts.reduce((sum, c) => sum + c.baseQty, 0);
}

/**
 * Hitung variance antara system qty dan physical base qty.
 *
 * @param systemQty  Jumlah sistem saat ini (base unit)
 * @param physicalBaseQty  Jumlah fisik hasil counting (base unit)
 * @returns OpnameVariance
 */
export function computeVariance(
  systemQty: number,
  physicalBaseQty: number,
): OpnameVariance {
  return {
    physicalBaseQty,
    variance: physicalBaseQty - systemQty,
  };
}

/**
 * End-to-end: hitung physical base quantity dari multi-unit inputs.
 *
 * @param unitLevels    Array UnitLevel dari produk
 * @param multiUnitCounts Array MultiUnitCount dengan qty user
 * @param systemQty     Jumlah sistem saat ini (base unit)
 * @returns OpnameVariance
 */
export interface MultiUnitOpnameResult {
  counts: MultiUnitCount[];
  physicalBaseQty: number;
  variance: number;
}

export function computeMultiUnitOpname(
  unitLevels: UnitLevel[],
  multiUnitCounts: MultiUnitCount[],
  systemQty: number,
): MultiUnitOpnameResult {
  const counts = recomputeCounts(multiUnitCounts, unitLevels);
  const physicalBaseQty = computePhysicalBaseQty(counts);
  const { variance } = computeVariance(systemQty, physicalBaseQty);
  return { counts, physicalBaseQty, variance };
}

/**
 * Build human-readable summary from multi-unit counts.
 * Skips entries with qty=0.
 *
 * Example:
 *   [{ unit:"Dus", qty:2 }, { unit:"Strip", qty:3 }, { unit:"Tablet", qty:7 }]
 *   → "2 Dus + 3 Strip + 7 Tablet"
 *
 *   [{ unit:"Dus", qty:0 }, { unit:"Tablet", qty:20 }]
 *   → "20 Tablet"
 *
 *   [] or all zero → uses defaultLabel
 */
export function buildMultiUnitSummary(
  counts: MultiUnitCount[] | undefined,
  defaultLabel: string = "Tablet",
): string {
  if (!counts || counts.length === 0) return `0 ${defaultLabel}`;
  const nonZero = counts.filter((c) => c.qty > 0);
  if (nonZero.length === 0) return `0 ${defaultLabel}`;
  return nonZero.map((c) => `${c.qty} ${c.unit}`).join(" + ");
}
