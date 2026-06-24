// ---------------------------------------------------------------------------
// RC1 P0E.3 — Feature Flags (Centralized)
// ---------------------------------------------------------------------------
// Single source of truth for all feature toggles.
// Future: read from app_settings table for dynamic control.
// ---------------------------------------------------------------------------

export const FEATURES = {
  /** RC1 P0E.2 — Show legacy "Buat Manual" opname button */
  legacyOpname: false,

  /** P0 — Excel Product Import */
  excelProductImport: true,
} as const;
