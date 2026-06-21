/**
 * P0.9A.2 — CSV Parser (Architecture Hardened)
 *
 * Pure functions only. NO store. NO side effects. NO DB.
 * Uses shared IMPORT_COLUMNS from import/import-types.
 */

import { IMPORT_COLUMNS, EXPECTED_HEADER } from "../import/import-types";
import type { ImportRow, ImportParseResult, ImportParseError } from "../import/import-types";

/**
 * Parse CSV text into structured import rows.
 *
 * Expected format:
 *   nama_produk,qty,harga_beli,batch_number,expired_date
 *   Paracetamol 500mg,10,15000,BATCH-001,2027-06-19
 */
export function parseCsv(text: string): ImportParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      rows: [],
      totalRows: 0,
      invalidRows: 0,
      errors: [{ rowNumber: 0, field: "file", message: "File CSV kosong atau hanya berisi header." }],
    };
  }

  // Validate header — array-based comparison (SSOT: IMPORT_COLUMNS)
  const headerErrors = validateHeader(lines[0]!);
  if (headerErrors.length > 0) {
    return { rows: [], totalRows: 0, invalidRows: 0, errors: headerErrors };
  }

  // Parse data rows (skip header)
  const dataLines = lines.slice(1);
  const rows: ImportRow[] = [];
  const errors: ImportParseError[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i]!;
    const rowNumber = i + 2; // 1 = header, data starts at line 2
    const result = parseLine(line, rowNumber);

    if (result.error) {
      errors.push(result.error);
      continue;
    }

    rows.push(result.row!);
  }

  return {
    rows,
    totalRows: dataLines.length,
    invalidRows: errors.length,
    errors,
  };
}

/**
 * Validate CSV header against IMPORT_COLUMNS.
 * Array-based comparison — robust, reusable by Excel importer.
 */
function validateHeader(headerLine: string): ImportParseError[] {
  const actualColumns = normalizeHeader(headerLine);

  if (actualColumns.length !== IMPORT_COLUMNS.length) {
    return [
      {
        rowNumber: 1,
        field: "header",
        message: `Jumlah kolom tidak sesuai. Diharapkan ${IMPORT_COLUMNS.length} kolom: "${EXPECTED_HEADER}". Diterima: ${actualColumns.length} kolom.`,
      },
    ];
  }

  for (let i = 0; i < IMPORT_COLUMNS.length; i++) {
    if (actualColumns[i] !== IMPORT_COLUMNS[i]) {
      return [
        {
          rowNumber: 1,
          field: "header",
          message: `Kolom ke-${i + 1} tidak sesuai. Diharapkan: "${IMPORT_COLUMNS[i]}". Diterima: "${actualColumns[i]}".`,
        },
      ];
    }
  }

  return [];
}

/**
 * Normalize header: lowercase, trim whitespace around each column.
 * Supports: "nama_produk, qty , harga_beli" → ["nama_produk","qty","harga_beli"]
 * Shared by CSV and Excel importers.
 */
export function normalizeHeader(headerLine: string): string[] {
  return splitCsvLine(headerLine)
    .map((col) => col.trim().toLowerCase());
}

// ---------------------------------------------------------------------------
// Line parsing
// ---------------------------------------------------------------------------

function parseLine(
  line: string,
  rowNumber: number,
): { row: ImportRow | null; error: ImportParseError | null } {
  const values = splitCsvLine(line);
  if (values.length < 5) {
    return {
      row: null,
      error: { rowNumber, field: "line", message: `Hanya ${values.length} kolom, minimal 5 (nama_produk, qty, satuan, harga_beli, harga_jual).` },
    };
  }

  const productName = trimValue(values[0]);
  if (!productName || productName.length < 2) {
    return {
      row: null,
      error: { rowNumber, field: "nama_produk", message: "Nama produk wajib diisi (min 2 karakter)." },
    };
  }

  const qty = parseInt(trimValue(values[1]), 10);
  if (isNaN(qty) || qty < 1) {
    return {
      row: null,
      error: { rowNumber, field: "qty", message: "Qty harus angka bulat minimal 1." },
    };
  }

  const unit = trimValue(values[2]) || "Pcs";

  const buyPrice = parseFloat(trimValue(values[3]));
  if (isNaN(buyPrice) || buyPrice < 0) {
    return {
      row: null,
      error: { rowNumber, field: "harga_beli", message: "Harga beli harus angka >= 0." },
    };
  }

  // Optional: selling price (harga_jual)
  const sellingPriceRaw = trimValue(values[4]);
  const sellingPrice = sellingPriceRaw ? parseFloat(sellingPriceRaw) : undefined;

  const row: ImportRow = {
    rowNumber,
    productName,
    quantity: qty,
    unit,
    buyPrice,
    sellingPrice: sellingPrice && !isNaN(sellingPrice) ? sellingPrice : undefined,
    batchNumber: trimValue(values[5]) || undefined,
    expiredDate: trimValue(values[6]) || undefined,
  };

  return { row, error: null };
}

function trimValue(val: string | undefined): string {
  return (val ?? "").trim().replace(/^"|"$/g, "");
}

/**
 * Split a CSV line respecting basic quoting.
 * Handles: "Quoted, Value",10,15000 → ["Quoted, Value", "10", "15000"]
 *
 * Limitations (documented in P0.9A.2-parser-contract.md):
 * - No multiline quoted fields
 * - No escaped quotes ("" → ")
 * - Semicolon separator not supported
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
