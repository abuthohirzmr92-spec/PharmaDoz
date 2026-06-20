/**
 * P0.9A — CSV Parser
 *
 * Pure functions only. NO store. NO side effects. NO DB.
 */

import type { CsvRow, CsvParseResult, CsvParseError } from "./types";

// Expected CSV columns
const COLUMNS = ["nama_produk", "qty", "harga_beli", "batch_number", "expired_date"] as const;

/**
 * Parse CSV text into structured rows.
 *
 * Expected format:
 *   nama_produk,qty,harga_beli,batch_number,expired_date
 *   Paracetamol 500mg,10,15000,BATCH-001,2027-06-19
 *
 * Rules:
 * - First row is treated as header and skipped
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

  // Skip header row
  const dataLines = lines.slice(1);
  const rows: CsvRow[] = [];
  const errors: CsvParseError[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i]!;
    const rowNumber = i + 1; // 1-based, excluding header
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

  const productName = (values[0] ?? "").trim();
  if (!productName || productName.length < 2) {
    return {
      row: null,
      error: { rowNumber, field: "nama_produk", message: "Nama produk wajib diisi (min 2 karakter)." },
    };
  }

  const qty = parseInt((values[1] ?? "").trim(), 10);
  if (isNaN(qty) || qty < 1) {
    return {
      row: null,
      error: { rowNumber, field: "qty", message: "Qty harus angka bulat minimal 1." },
    };
  }

  const buyPrice = parseFloat((values[2] ?? "").trim());
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
    batchNumber: (values[3] ?? "").trim() || undefined,
    expiredDate: (values[4] ?? "").trim() || undefined,
  };

  return { row, error: null };
}

/**
 * Split a CSV line respecting basic quoting.
 * Simple implementation — for full RFC 4180 use papaparse in production.
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
