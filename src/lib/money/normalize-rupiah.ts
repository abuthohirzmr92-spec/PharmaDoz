// =================================================================
// MEDISYNC MONEY POLICY — Single Source of Truth for Rupiah
// 🔒 SPR-MONEY-003 — Architecture Locked
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
// FLOW (REQUIRED):
//   Raw Value → validateRupiah() → normalizeRupiah() → Database
//
// PROHIBITED:
//   ❌ normalizeRupiah() without validateRupiah() first
//   ❌ Math.round() on monetary values outside this helper
//   ❌ Silent failure (NaN → 0, Inf → 0, Negative → 0)
//   ❌ Decimal prices in database
//
// ONE MONEY POLICY — VALIDATION ≠ NORMALIZATION — NO SILENT FAILURE
// =================================================================

// ─── Types ───

export interface RupiahValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Validation ───

/**
 * Validate a raw monetary value BEFORE normalization.
 *
 * PURE FUNCTION — no side effects.
 * Returns structured result. Caller decides how to handle errors.
 * NEVER throws. NEVER silently converts to 0.
 *
 * @param value — Raw monetary value to validate
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

// ─── Normalization ───

/**
 * Normalize a VALID monetary value to integer Rupiah.
 *
 * PURE FUNCTION — assumes input has been validated.
 * Call validateRupiah() FIRST, then call this.
 *
 * Business Rule: Math.round() — nearest integer Rupiah.
 *
 * @param value — VALID monetary value (non-NaN, finite, ≥0)
 * @returns Integer Rupiah
 */
export function normalizeRupiah(value: number): number {
  return Math.round(value);
}

// ─── Convenience ───

/**
 * Validate THEN normalize in one call.
 * Convenience for callers that want both in one step.
 * Returns 0 if invalid (for backward compatibility).
 */
export function validateAndNormalizeRupiah(value: number): number {
  const result = validateRupiah(value);
  if (!result.valid) return 0;
  return normalizeRupiah(value);
}

/**
 * Normalize an array of valid monetary values.
 */
export function normalizeRupiahAll(values: number[]): number[] {
  return values.map(normalizeRupiah);
}

/**
 * Format a monetary value for display.
 * Validates internally, defaults to 0 on invalid.
 */
export function formatRupiah(value: number): string {
  const safe = validateAndNormalizeRupiah(value);
  return `Rp ${safe.toLocaleString("id-ID")}`;
}

// ─── Backward Compatible Alias ───
// Callers that previously used normalizeRupiah() which handled
// NaN/Inf/negative → 0 can use this for zero-risk migration.
// New code should use validateRupiah() → normalizeRupiah().
export { validateAndNormalizeRupiah as normalizeRupiahSafe };
