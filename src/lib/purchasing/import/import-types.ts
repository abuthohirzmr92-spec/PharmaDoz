/**
 * P0.9A.2 — Shared Import Contracts
 *
 * Used by CSV, Excel, and future OCR importers.
 * Single Source of Truth for import structures.
 */

// ─── Expected import columns ───

export const IMPORT_COLUMNS = [
  "nama_produk",
  "qty",
  "satuan",
  "harga_beli",
  "harga_jual",
  "batch_number",
  "expired_date",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

/** Expected CSV/Excel header string */
export const EXPECTED_HEADER = IMPORT_COLUMNS.join(",");

// ─── Generic import row (before mapping to draft item) ───

export interface ImportRow {
  /** 1-based row number in the source file */
  rowNumber: number;
  /** Required: product name for matching */
  productName: string;
  /** Required: quantity */
  quantity: number;
  /** Required: unit (tablet, kapsul, botol, strip, tube, pcs, etc.) */
  unit: string;
  /** Required: unit buy price */
  buyPrice: number;
  /** Optional: selling price from import */
  sellingPrice?: number;
  /** Optional: pre-assigned batch number */
  batchNumber?: string;
  /** Optional: expired date string */
  expiredDate?: string;
}

// ─── Generic parse result ───

export interface ImportParseError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ImportParseResult {
  rows: ImportRow[];
  totalRows: number;
  invalidRows: number;
  errors: ImportParseError[];
}

// ─── Mapper dependencies (shared by CSV/Excel/OCR) ───

export interface ImportMapperDeps {
  /** Generate a unique ID for each draft item */
  generateItemId: () => string;
}
