/**
 * P0.9A.1 — CSV Parser (Hardened)
 *
 * Pure functions only. NO store. NO side effects. NO DB.
 */

import type { CsvRow, CsvParseResult, CsvParseError } from "./types";

// Expected CSV header columns (must match exactly after trim)
const EXPECTED_HEADER = "nama_produk,qty,harga_beli,batch_number,expired_date";

/**
 * Parse CSV text into structured rows.
 *
 * Expected format:
 *   nama_produk,qty,harga_beli,batch_number,expired_date
 *   Paracetamol 500mg,10,15000,BATCH-001,2027-06-19
 *
 * Rules:
 * - First row MUST match expected header (case-insensitive, trimmed)
 * - Empty lines are skipped
 * - productName, qty, buyPrice are required
 * - batchNumber and expiredDate are optional
 */
export function parseCsv(text: string): CsvParseResult {
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

  // Validate header
  const headerErrors = validateHeader(lines[0]!);
  if (headerErrors.length > 0) {
    return { rows: [], totalRows: 0, invalidRows: 0, errors: headerErrors };
  }

  // Parse data rows (skip header)
  const dataLines = lines.slice(1);
  const rows: CsvRow[] = [];
  const errors: CsvParseError[] = [];

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
 * Validate CSV header against expected columns.
 * Case-insensitive comparison after trimming.
 */
function validateHeader(headerLine: string): CsvParseError[] {
  const actual = headerLine.toLowerCase().replace(/\s+/g, ""); // normalize
  const expected = EXPECTED_HEADER.toLowerCase().replace(/\s+/g, "");

  if (actual !== expected) {
    return [
      {
        rowNumber: 1,
        field: "header",
        message: `Header tidak sesuai. Diharapkan: "${EXPECTED_HEADER}". Diterima: "${headerLine}".`,
      },
    ];
  }
  return [];
}

/**
 * Parse a single CSV line into a CsvRow.
 */
function parseLine(
  line: string,
  rowNumber: number,
): { row: CsvRow | null; error: CsvParseError | null } {
  const values = splitCsvLine(line);
  if (values.length < 3) {
    return {
      row: null,
      error: { rowNumber, field: "line", message: `Hanya ${values.length} kolom, minimal 3 (nama_produk, qty, harga_beli).` },
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

  const buyPrice = parseFloat(trimValue(values[2]));
  if (isNaN(buyPrice) || buyPrice < 0) {
    return {
      row: null,
      error: { rowNumber, field: "harga_beli", message: "Harga beli harus angka >= 0." },
    };
  }

  const row: CsvRow = {
    rowNumber,
    productName,
    quantity: qty,
    buyPrice,
    batchNumber: trimValue(values[3]) || undefined,
    expiredDate: trimValue(values[4]) || undefined,
  };

  return { row, error: null };
}

function trimValue(val: string | undefined): string {
  return (val ?? "").trim().replace(/^"|"$/g, "");
}

/**
 * Split a CSV line respecting basic quoting.
 * Handles: "Quoted, Value",10,15000 → ["Quoted, Value", "10", "15000"]
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
