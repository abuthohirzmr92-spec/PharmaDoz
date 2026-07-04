// =================================================================
// MEDISYNC MONEY POLICY — Single Source of Truth for Rupiah
// 🔒 ARCHITECTURE LOCKED — SPR-MONEY-003A
//
// Owner:     EEOS Architecture Board
// Lifecycle: Permanent — all monetary values flow through here
// Thread:    Safe — pure functions, no shared state
// SideFX:    None — no store, repository, network, or mutation
//
// BUSINESS RULE:
//   Rupiah (IDR) has no sub-unit. Sen is obsolete since the 1960s.
//   ALL monetary values MUST be stored as integers in the database.
//   VALIDATION and NORMALIZATION are SEPARATE responsibilities.
//
// PUBLIC API (3 functions only):
//   validateRupiah()  — Validation only
//   normalizeRupiah() — Normalization only (pure Math.round)
//   formatRupiah()    — Display formatting only
//
// REQUIRED FLOW:
//   Raw Value → validateRupiah() → normalizeRupiah() → Database
//
// PROHIBITED:
//   ❌ Shortcut APIs (validateAndNormalize, Safe variants)
//   ❌ normalizeRupiah() without validateRupiah() first
//   ❌ Math.round() on monetary values outside this helper
//   ❌ Silent failure (NaN → 0, Inf → 0, Negative → 0)
//   ❌ Decimal prices in database
//
// MINIMAL PUBLIC SURFACE — NO SHORTCUT API — VALIDATION ≠ NORMALIZATION
// =================================================================

// ─── Types ───

/** Structured validation result. Caller decides how to handle errors. */
export interface RupiahValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Public API ───

/**
 * validateRupiah — Validation only.
 *
 * Responsibility: Check that a raw value is a valid Rupiah amount.
 * Returns structured result. NEVER throws. NEVER converts to 0.
 *
 * @param value — Raw value to validate
 * @param label — Optional field name for error messages
 */
export function validateRupiah(value: unknown, label?: string): RupiahValidationResult {
  const field = label ?? "Nilai";
  const errors: string[] = [];

  if (value === null || value === undefined) {
    errors.push(`${field} tidak boleh kosong.`);
    return { valid: false, errors };
  }

  if (typeof value !== "number") {
    errors.push(`${field} harus berupa angka.`);
    return { valid: false, errors };
  }

  if (!Number.isFinite(value)) {
    errors.push(`${field} tidak valid (NaN atau Infinity).`);
    return { valid: false, errors };
  }

  if (value < 0) {
    errors.push(`${field} tidak boleh negatif.`);
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * normalizeRupiah — Normalization only.
 *
 * Responsibility: Convert a VALID float to integer Rupiah.
 * Assumes input has been validated by validateRupiah().
 * Pure Math.round() — nothing else.
 *
 * @param value — VALID monetary value (non-NaN, finite, ≥0)
 */
export function normalizeRupiah(value: number): number {
  return Math.round(value);
}

/**
 * formatRupiah — Display formatting only.
 *
 * Responsibility: Format an integer Rupiah value for display.
 * Uses explicit validate → normalize flow internally.
 * Falls back to "Rp 0" on invalid input.
 */
export function formatRupiah(value: number): string {
  const validation = validateRupiah(value);
  if (!validation.valid) return "Rp 0";
  return `Rp ${normalizeRupiah(value).toLocaleString("id-ID")}`;
}
