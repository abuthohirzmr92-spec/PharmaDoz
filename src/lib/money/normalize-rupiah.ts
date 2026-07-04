// =================================================================
// MEDISYNC MONEY POLICY — Single Source of Truth for Rupiah
// 🔒 SPR-MONEY-002 — Architecture Locked
//
// BUSINESS RULE:
//   Rupiah (IDR) has no sub-unit. Sen is obsolete since the 1960s.
//   ALL monetary values MUST be stored as integers in the database.
//   ALL price entry points MUST use this helper.
//   NO module may perform its own money normalization.
//
// ENTRY POINTS REQUIRED TO USE THIS HELPER:
//   Purchase Manual  | CSV Import  | Excel Import  | OCR Import
//   Inventory Correction | Cashier | Reports | Repository | Database
//
// PROHIBITED:
//   ❌ Math.round() on monetary values outside this helper
//   ❌ Math.floor() / Math.ceil() on monetary values
//   ❌ parseInt() / parseFloat() for price normalization
//   ❌ Direct float-to-int conversion in parsers
//   ❌ Decimal prices in database
//
// ONE MONEY POLICY — ONE SOURCE OF TRUTH — ZERO DUPLICATION
// =================================================================

/**
 * Normalize a monetary value to integer Rupiah.
 *
 * Handles:
 *   ✅ Float → Integer  (Math.round)
 *   ✅ NaN → 0           (safe default)
 *   ✅ Infinity → 0      (bounds protection)
 *   ✅ Negative → 0      (price cannot be negative)
 *
 * @param value — Raw monetary value (may be float, NaN, or Infinity)
 * @returns Integer Rupiah (always ≥ 0)
 */
export function normalizeRupiah(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  return Math.round(value);
}

/**
 * Normalize an array of monetary values. Convenience for batch operations.
 */
export function normalizeRupiahAll(values: number[]): number[] {
  return values.map(normalizeRupiah);
}

/**
 * Format a monetary value for display.
 * Uses normalizeRupiah internally for consistency, then formats with locale.
 */
export function formatRupiah(value: number): string {
  return `Rp ${normalizeRupiah(value).toLocaleString("id-ID")}`;
}
