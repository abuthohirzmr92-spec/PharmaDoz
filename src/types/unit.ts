// ---------------------------------------------------------------------------
// V2 Phase 1A — Multi Unit Type Definitions
// ---------------------------------------------------------------------------
// Model satuan bertingkat ala Vmedis.
// Semua field additive — tidak ada yang menggantikan existing type.
// ---------------------------------------------------------------------------

/**
 * Satu level satuan dalam Multi Unit System.
 *
 * Level 1 (base unit) TIDAK disimpan sebagai UnitLevel —
 * ia adalah `products.unit` dengan contains implisit = 1.
 * Hanya level > 1 yang direpresentasikan oleh interface ini.
 *
 * @example
 * // Level 2: Strip isi 10 Tablet
 * { level: 2, unitName: "Strip", contains: 10 }
 *
 * @example
 * // Level 3: Dus isi 20 Strip
 * { level: 3, unitName: "Dus", contains: 20 }
 */
export interface UnitLevel {
  /** UUID — optional karena form state mungkin belum punya ID */
  id?: string;

  /** Level satuan: 2 atau 3 (Level 1 = base unit di products.unit) */
  level: number;

  /** Nama satuan, e.g. "Strip", "Dus" */
  unitName: string;

  /**
   * Jumlah satuan dari level di bawahnya yang dikandung oleh 1 unit level ini.
   *
   * - Level 2: contains = jumlah base unit (Level 1) dalam 1 unit Level 2
   * - Level 3: contains = jumlah Level 2 dalam 1 unit Level 3
   *
   * Contoh: Strip contains=10, Dus contains=20
   *   → 1 Dus = 20 Strip = 200 Tablet (recursive)
   */
  contains: number;
}
