// ---------------------------------------------------------------------------
// RC1.5 P1F.1 — Dosage Form Single Source of Truth
// ---------------------------------------------------------------------------
// Used by: Product Form, Excel Import, MPKB, OCR (future)
// NO HARDCODED LISTS ELSEWHERE
// ---------------------------------------------------------------------------

export const DOSAGE_FORM_OPTIONS = [
  "Tablet",
  "Kapsul",
  "Kaplet",
  "Sirup",
  "Salep",
  "Injeksi",
  "Drop",
  "Suppositoria",
  "Ampul",
  "Vial",
  "Serbuk",
  "Suspensi",
] as const;

export type DosageFormOption = typeof DOSAGE_FORM_OPTIONS[number];
