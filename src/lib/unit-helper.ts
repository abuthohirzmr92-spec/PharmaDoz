// ---------------------------------------------------------------------------
// V2 Phase 1A — Multi Unit Helper (Pure Functions)
// ---------------------------------------------------------------------------
// Semua fungsi pure — tidak ada side effect, DB call, atau store import.
// Bisa di-test secara terisolasi.
//
// Model:
//   Level 1 (base): Tablet   — implicit, dari products.unit, multiplier = 1
//   Level 2:         Strip   — contains = 10  → 1 Strip = 10 Tablet
//   Level 3:         Dus     — contains = 20  → 1 Dus   = 20 Strip = 200 Tablet
//
// Multiplier recursive:
//   multiplier(level) = contains × multiplier(level - 1)
// ---------------------------------------------------------------------------

import type { UnitLevel } from "@/types/unit";

// ============================================================================
// Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validasi array UnitLevel sebelum disimpan.
 *
 * Aturan:
 * - level harus > 1 (Level 1 = base unit, bukan bagian dari array ini)
 * - contains harus > 0
 * - tidak boleh ada unitName duplikat (case-insensitive)
 * - tidak boleh ada level duplikat
 */
export function validateUnitLevels(unitLevels: UnitLevel[]): ValidationResult {
  const errors: string[] = [];

  if (unitLevels.length === 0) {
    return { valid: true, errors: [] };
  }

  const seenNames = new Set<string>();
  const seenLevels = new Set<number>();

  for (const ul of unitLevels) {
    // --- level harus > 1 ---
    if (ul.level <= 1) {
      errors.push(`Level ${ul.level} tidak valid. Level harus > 1 (Level 1 adalah satuan dasar).`);
    }

    // --- contains harus > 0 ---
    if (ul.contains <= 0) {
      errors.push(
        `"${ul.unitName}" (Level ${ul.level}): isi harus lebih dari 0.`,
      );
    }

    // --- unitName tidak boleh kosong ---
    if (!ul.unitName || ul.unitName.trim().length === 0) {
      errors.push(`Level ${ul.level}: nama satuan tidak boleh kosong.`);
    }

    // --- unitName tidak boleh duplikat ---
    const normalized = ul.unitName?.trim().toLowerCase() ?? "";
    if (normalized) {
      if (seenNames.has(normalized)) {
        errors.push(`Satuan "${ul.unitName}" duplikat.`);
      }
      seenNames.add(normalized);
    }

    // --- level tidak boleh duplikat ---
    if (seenLevels.has(ul.level)) {
      errors.push(`Level ${ul.level} duplikat.`);
    }
    seenLevels.add(ul.level);
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Multiplier Calculation (Recursive)
// ============================================================================

/**
 * Hitung total multiplier suatu level relatif terhadap base unit (Level 1).
 *
 * Rumus:
 *   multiplier(1) = 1
 *   multiplier(n) = contains(level_n) × multiplier(n - 1)
 *
 * Contoh:
 *   Level 1: Tablet  (multiplier = 1)
 *   Level 2: Strip   contains=10  (multiplier = 10)
 *   Level 3: Dus     contains=20  (multiplier = 20 × 10 = 200)
 *
 * @param unitLevels  Array UnitLevel (hanya level > 1)
 * @param targetLevel Level yang ingin dihitung multiplier-nya
 * @returns Total multiplier (minimal 1)
 */
export function getTotalMultiplier(
  unitLevels: UnitLevel[],
  targetLevel: number,
): number {
  // Level 1 selalu multiplier = 1
  if (targetLevel <= 1) return 1;

  // Cari unit untuk level ini
  const unit = unitLevels.find((ul) => ul.level === targetLevel);
  if (!unit) return 1;

  // Rekursif: contains × multiplier level di bawahnya
  return unit.contains * getTotalMultiplier(unitLevels, targetLevel - 1);
}

// ============================================================================
// Conversion: Display Unit → Base Unit
// ============================================================================

/**
 * Konversi quantity dari satuan display ke satuan dasar (base unit).
 *
 * Contoh:
 *   1 Strip → 10 Tablet   (convertToBaseUnit(1, 2, unitLevels) = 10)
 *   1 Dus   → 200 Tablet  (convertToBaseUnit(1, 3, unitLevels) = 200)
 *   5 Tablet → 5 Tablet   (convertToBaseUnit(5, 1, unitLevels) = 5)
 *
 * @param quantity   Jumlah dalam satuan asal
 * @param fromLevel  Level satuan asal (1 = base)
 * @param unitLevels Array UnitLevel (hanya level > 1)
 * @returns Jumlah dalam satuan dasar (base unit)
 */
export function convertToBaseUnit(
  quantity: number,
  fromLevel: number,
  unitLevels: UnitLevel[],
): number {
  if (fromLevel <= 1) return quantity;
  const multiplier = getTotalMultiplier(unitLevels, fromLevel);
  return quantity * multiplier;
}

// ============================================================================
// Conversion: Base Unit → Display Unit
// ============================================================================

/**
 * Konversi quantity dari satuan dasar ke satuan display.
 *
 * Mengembalikan nilai integer (pembulatan ke bawah) karena obat
 * tidak bisa dijual dalam pecahan tablet.
 *
 * Contoh:
 *   10 Tablet  → 1 Strip   (convertFromBaseUnit(10, 2, unitLevels) = 1)
 *   200 Tablet → 1 Dus     (convertFromBaseUnit(200, 3, unitLevels) = 1)
 *   25 Tablet  → 2 Strip   (convertFromBaseUnit(25, 2, unitLevels) = 2)
 *
 * @param baseQuantity  Jumlah dalam satuan dasar
 * @param toLevel       Level satuan tujuan (1 = base, tidak ada konversi)
 * @param unitLevels    Array UnitLevel (hanya level > 1)
 * @returns Jumlah dalam satuan tujuan (integer, pembulatan ke bawah)
 */
export function convertFromBaseUnit(
  baseQuantity: number,
  toLevel: number,
  unitLevels: UnitLevel[],
): number {
  if (toLevel <= 1) return baseQuantity;
  const multiplier = getTotalMultiplier(unitLevels, toLevel);
  return Math.floor(baseQuantity / multiplier);
}

// ============================================================================
// Display Formatting
// ============================================================================

/**
 * Menghasilkan array string untuk menampilkan semua level satuan.
 *
 * Format:
 *   Level 1: "Tablet"              (base unit, tanpa angka)
 *   Level 2: "Strip (10)"          (isi dalam base unit)
 *   Level 3: "Dus (20)"            (isi dalam level di bawahnya)
 *
 * Level diurutkan dari 1 ke 3.
 *
 * @param baseUnitName  Nama satuan dasar dari products.unit
 * @param unitLevels    Array UnitLevel (hanya level > 1)
 * @returns Array string untuk display
 *
 * @example
 * getUnitLevelDisplay("Tablet", [{ level: 2, unitName: "Strip", contains: 10 }, { level: 3, unitName: "Dus", contains: 20 }])
 * // → ["Tablet", "Strip (10)", "Dus (20)"]
 */
export function getUnitLevelDisplay(
  baseUnitName: string,
  unitLevels: UnitLevel[],
): string[] {
  const display: string[] = [baseUnitName];

  // Urutkan level ascending
  const sorted = [...unitLevels].sort((a, b) => a.level - b.level);

  for (const ul of sorted) {
    display.push(`${ul.unitName} (${ul.contains})`);
  }

  return display;
}
