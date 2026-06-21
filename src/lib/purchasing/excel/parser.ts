/**
 * P0.9B — Excel Parser
 *
 * Pure parser only. Reads .xlsx workbook → ImportRow[].
 * NO matching. NO warnings. NO status. NO draft. NO DB. NO store.
 * Uses SheetJS (xlsx) for workbook reading.
 */

import * as XLSX from "xlsx";
import { normalizeHeader } from "../csv/parser";
import { IMPORT_COLUMNS, EXPECTED_HEADER } from "../import/import-types";
import type { ImportRow, ImportParseResult, ImportParseError } from "../import/import-types";

/**
 * Parse an Excel file (.xlsx) into structured import rows.
 *
 * Expected columns (same as CSV):
 *   nama_produk | qty | harga_beli | batch_number | expired_date
 *
 * Rules:
 * - Reads first sheet only
 * - First row is header (must match IMPORT_COLUMNS)
 * - Empty rows are skipped
 * - Max 500 rows
 */
export function parseExcel(file: File): Promise<ImportParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          resolve({
            rows: [],
            totalRows: 0,
            invalidRows: 0,
            errors: [{ rowNumber: 0, field: "file", message: "File Excel kosong — tidak ada sheet." }],
          });
          return;
        }

        const sheet = workbook.Sheets[sheetName]!;
        const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];

        if (json.length < 2) {
          resolve({
            rows: [],
            totalRows: 0,
            invalidRows: 0,
            errors: [{ rowNumber: 0, field: "file", message: "File Excel kosong atau hanya berisi header." }],
          });
          return;
        }

        // Validate header
        const headerRow = json[0]!.map(String);
        const headerLine = headerRow.join(",");
        const headerErrors = validateExcelHeader(headerLine);
        if (headerErrors.length > 0) {
          resolve({ rows: [], totalRows: 0, invalidRows: 0, errors: headerErrors });
          return;
        }

        // Parse data rows (skip header, max 500)
        const dataRows = json.slice(1, 501);
        const rows: ImportRow[] = [];
        const errors: ImportParseError[] = [];

        for (let i = 0; i < dataRows.length; i++) {
          const rawRow = dataRows[i]!;
          const rowNumber = i + 2; // 1 = header
          const result = parseExcelRow(rawRow, rowNumber);

          if (result.error) {
            errors.push(result.error);
            continue;
          }
          if (!result.row) continue; // skip empty rows (both row and error are null)

          rows.push(result.row);
        }

        resolve({
          rows,
          totalRows: dataRows.length,
          invalidRows: errors.length,
          errors,
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Gagal membaca file Excel."));
      }
    };

    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsArrayBuffer(file);
  });
}

// ---------------------------------------------------------------------------
// Header validation (reuses normalizeHeader from CSV parser)
// ---------------------------------------------------------------------------

function validateExcelHeader(headerLine: string): ImportParseError[] {
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

// ---------------------------------------------------------------------------
// Row parsing
// ---------------------------------------------------------------------------

function parseExcelRow(
  rawRow: string[],
  rowNumber: number,
): { row: ImportRow | null; error: ImportParseError | null } {
  const values = rawRow.map((v) => String(v ?? "").trim());

  // Skip fully empty rows
  if (values.every((v) => v === "")) {
    return { row: null, error: null };
  }

  const productName = values[0] ?? "";
  if (!productName || productName.length < 2) {
    return {
      row: null,
      error: { rowNumber, field: "nama_produk", message: "Nama produk wajib diisi (min 2 karakter)." },
    };
  }

  const qty = parseInt(values[1] ?? "0", 10);
  if (isNaN(qty) || qty < 1) {
    return {
      row: null,
      error: { rowNumber, field: "qty", message: "Qty harus angka bulat minimal 1." },
    };
  }

  const unit = (values[2] ?? "").trim();
  if (!unit) {
    return {
      row: null,
      error: { rowNumber, field: "satuan", message: "Satuan wajib diisi." },
    };
  }

  const buyPrice = parseFloat((values[3] ?? "0").replace(/[^\d.]/g, ""));
  if (isNaN(buyPrice) || buyPrice < 0) {
    return {
      row: null,
      error: { rowNumber, field: "harga_beli", message: "Harga beli harus angka >= 0." },
    };
  }

  // Convert Excel serial date to ISO string if needed
  const expiredRaw = values[5] ?? "";
  let expiredDate: string | undefined;

  if (expiredRaw) {
    const serialNum = parseFloat(expiredRaw);
    if (!isNaN(serialNum) && serialNum > 30000 && serialNum < 80000) {
      // Excel serial date (days since 1900-01-01 with the 1900 bug)
      const jsDate = new Date((serialNum - 25569) * 86400 * 1000);
      if (!isNaN(jsDate.getTime())) {
        expiredDate = jsDate.toISOString().slice(0, 10);
      }
    } else {
      // Try parsing as string date
      const d = new Date(expiredRaw);
      if (!isNaN(d.getTime())) {
        expiredDate = d.toISOString().slice(0, 10);
      } else {
        expiredDate = expiredRaw; // preserve as-is, warning will catch it
      }
    }
  }

  const row: ImportRow = {
    rowNumber,
    productName,
    quantity: qty,
    unit,
    buyPrice,
    batchNumber: (values[4] ?? "") || undefined,
    expiredDate,
  };

  return { row, error: null };
}
