// =================================================================
// Money Normalization — Single Source of Truth for Rupiah
// 🔒 SPR-MONEY-001 — Architecture Locked
//
// Rupiah (IDR) has no sub-unit (sen is obsolete since 1960s).
// ALL monetary values MUST be stored as integers.
// ALL price entry points MUST use this helper.
// =================================================================

/**
 * Normalize a monetary value to integer Rupiah.
 *
 * Business Rule:
 *   - Rupiah has no decimal places
 *   - All prices stored in database must be integers
 *   - This is the SINGLE entry point for Rupiah normalization
 *
 * Usage (ALL price entry points):
 *   import { normalizeRupiah } from "@/lib/money/normalize-rupiah"
 *   sellingPrice: normalizeRupiah(rawValue)
 *
 * PROHIBITED:
 *   ❌ Math.round() on prices outside this helper
 *   ❌ Direct float-to-int conversion in parsers
 *   ❌ Decimal prices in database
 */
export function normalizeRupiah(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

/**
 * Normalize an array of price values. Convenience for batch operations.
 */
export function normalizeRupiahAll(values: number[]): number[] {
  return values.map(normalizeRupiah);
}
