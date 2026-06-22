// ---------------------------------------------------------------------------
// V2 Phase 1E — Unit Category Options
// ---------------------------------------------------------------------------
// Satuan dikelompokkan berdasarkan level kemasan.
// Digunakan oleh product form dan multi-unit editor.
//
// BASE:   satuan dasar yang bisa dihitung per butir
// MIDDLE: kemasan menengah (isi beberapa base unit)
// LARGE:  kemasan besar (isi beberapa middle unit)
// ---------------------------------------------------------------------------

export const BASE_UNITS = [
  "Tablet",
  "Kapsul",
  "Kaplet",
  "Pil",
  "Ampul",
  "Vial",
  "Botol",
  "Tube",
  "Pcs",
  "Sachet",
  "Ml",
  "Suppositoria",
];

export const MIDDLE_UNITS = [
  "Strip",
  "Blister",
  "Pack",
  "Pouch",
];

export const LARGE_UNITS = [
  "Dus",
  "Box",
  "Karton",
];
