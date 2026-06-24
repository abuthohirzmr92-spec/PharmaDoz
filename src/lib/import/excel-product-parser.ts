// ---------------------------------------------------------------------------
// RC1 P0 — Master Product Excel Import Parser
// ---------------------------------------------------------------------------
// Pure functions. Zero side effects. No DB/repository.
// ---------------------------------------------------------------------------

export interface ImportedProductRow {
  rowNumber: number;
  namaProduk: string;
  kategori: string;
  barcode: string | null;
  baseUnit: string;
  middleUnit: string | null;
  middleQty: number | null;
  largeUnit: string | null;
  largeQty: number | null;
  hargaJualDasar: number | null;
  lokasiRak: string | null;
  nomorRak: string | null;
  minimalStok: number | null;
  manufacturer: string | null;
  strength: string | null;
  dosageForm: string | null;
}

export interface ParseError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ParseResult {
  rows: ImportedProductRow[];
  errors: ParseError[];
  totalRows: number;
}

const EXPECTED_HEADERS = [
  "nama_produk", "kategori", "barcode", "base_unit",
  "middle_unit", "middle_qty", "large_unit", "large_qty",
  "harga_jual_dasar", "lokasi_rak", "nomor_rak", "minimal_stok",
  "manufacturer", "strength", "dosage_form",
];

function trim(v: unknown): string {
  return String(v ?? "").trim();
}

function parseOptionalInt(v: string): number | null {
  if (!v) return null;
  const n = parseInt(v.replace(/[^\d.]/g, ""), 10);
  return isNaN(n) || n <= 0 ? null : n;
}

export function parseProductRows(data: (string | number | null | undefined)[][]): ParseResult {
  const errors: ParseError[] = [];
  const rows: ImportedProductRow[] = [];

  if (data.length < 2) {
    errors.push({ rowNumber: 0, field: "header", message: "File Excel kosong atau hanya header." });
    return { rows, errors, totalRows: 0 };
  }

  // Validate headers
  const header = data[0]!.map(h => trim(h).toLowerCase());
  for (const expected of EXPECTED_HEADERS) {
    if (!header.includes(expected)) {
      errors.push({ rowNumber: 0, field: "header", message: `Kolom "${expected}" tidak ditemukan.` });
    }
  }
  if (errors.length > 0) return { rows, errors, totalRows: data.length - 1 };

  // Build column index map
  const colIdx = new Map<string, number>();
  header.forEach((h, i) => colIdx.set(h, i));

  const get = (r: (string | number | null | undefined)[], col: string): string =>
    trim(r[colIdx.get(col) ?? -1]);

  // Parse each data row
  for (let i = 1; i < data.length; i++) {
    const row = data[i]!;
    const rowNum = i + 1;
    const namaProduk = get(row, "nama_produk");
    const kategori = get(row, "kategori");
    const baseUnit = get(row, "base_unit");

    // Required fields
    if (!namaProduk) {
      errors.push({ rowNumber: rowNum, field: "nama_produk", message: "Nama produk wajib diisi." });
      continue;
    }
    if (!kategori) {
      errors.push({ rowNumber: rowNum, field: "kategori", message: "Kategori wajib diisi." });
      continue;
    }
    if (!baseUnit) {
      errors.push({ rowNumber: rowNum, field: "base_unit", message: "Satuan dasar wajib diisi." });
      continue;
    }

    rows.push({
      rowNumber: rowNum,
      namaProduk,
      kategori,
      barcode: get(row, "barcode") || null,
      baseUnit,
      middleUnit: get(row, "middle_unit") || null,
      middleQty: parseOptionalInt(get(row, "middle_qty")),
      largeUnit: get(row, "large_unit") || null,
      largeQty: parseOptionalInt(get(row, "large_qty")),
      hargaJualDasar: parseOptionalInt(get(row, "harga_jual_dasar")),
      lokasiRak: get(row, "lokasi_rak") || null,
      nomorRak: get(row, "nomor_rak") || null,
      minimalStok: parseOptionalInt(get(row, "minimal_stok")),
      manufacturer: get(row, "manufacturer") || null,
      strength: get(row, "strength") || null,
      dosageForm: get(row, "dosage_form") || null,
    });
  }

  return { rows, errors, totalRows: data.length - 1 };
}

/**
 * Generate template Excel workbook as Uint8Array.
 * Uses xlsx library (already in project dependencies).
 */
export async function generateTemplateWorkbook(): Promise<BlobPart> {
  const { utils, write } = await import("xlsx");

  const header = EXPECTED_HEADERS;
  // RC1 P0A — Hardened: more samples + REFERENSI sheet
  const sampleData: (string | number)[][] = [
    header,
    ["Paracetamol 500mg", "Analgesik", "899001", "Tablet", "Strip", "10", "Dus", "100", "4000", "Rak 1", "A12", "50"],
    ["OBH Syrup", "Sirup", "899002", "Botol", "", "", "", "", "15000", "Rak 2", "B05", "10"],
    ["Salep Mata", "Salep", "899003", "Tube", "", "", "", "", "25000", "Kulkas Depan", "K01", "5"],
    ["Amoxicillin 500mg", "Antibiotik", "899004", "Tablet", "Strip", "10", "", "", "8000", "Rak 3", "C03", "30"],
    ["Insulin Pen", "Diabetes", "899005", "Vial", "", "", "", "", "85000", "Kulkas Depan", "K02", "5"],
    ["Masker 3Ply", "Alkes", "", "Pcs", "", "", "Box", "50", "5000", "Rak 4", "D01", "100"],
    ["Vitamin C 1000mg", "Vitamin", "899006", "Tablet", "Strip", "10", "Dus", "100", "5000", "", "", "20"],
    ["Antasida Syrup", "Sirup", "899007", "Botol", "", "", "", "", "12000", "Rak 2", "B06", "15"],
  ];

  const referensi = [
    ["REFERENSI UNIT (base_unit, middle_unit, large_unit)"],
    [""],
    ["BASE_UNITS: Tablet, Kapsul, Kaplet, Pil, Ampul, Vial, Botol, Tube, Pcs, Sachet, Ml, Suppositoria"],
    [""],
    ["MIDDLE_UNITS: Strip, Blister, Pack, Pouch"],
    [""],
    ["LARGE_UNITS: Dus, Box, Karton"],
    [""],
    ["REFERENSI KATEGORI (contoh): Analgesik, Antibiotik, Sirup, Vitamin, Salep, Alkes, Diabetes, Obat Bebas"],
    [""],
    ["REFERENSI LOKASI RAK (contoh): Rak 1, Rak 2, Rak 3, Kulkas Depan"],
  ];
  const readme = [
    ["MEDISYNC PRODUCT IMPORT TEMPLATE v1"],
    [""],
    ["Kolom wajib (harus diisi):"],
    ["  nama_produk      - Nama produk/obat"],
    ["  kategori         - Kategori produk"],
    ["  base_unit        - Satuan dasar (Tablet, Botol, Pcs, dll)"],
    [""],
    ["Kolom opsional:"],
    ["  barcode          - Kode barcode"],
    ["  middle_unit      - Satuan kemasan menengah (Strip, Blister)"],
    ["  middle_qty       - Isi kemasan menengah (angka)"],
    ["  large_unit       - Satuan kemasan besar (Dus, Box)"],
    ["  large_qty        - Isi kemasan besar (angka)"],
    ["  harga_jual_dasar - Harga jual per satuan dasar"],
    ["  lokasi_rak       - Nama area/lokasi rak"],
    ["  nomor_rak        - Nomor rak"],
    ["  minimal_stok     - Batas stok minimum"],
  ];

  const wb = utils.book_new();
  const wsData = [header, ...sampleData];
  const ws = utils.aoa_to_sheet(wsData);
  utils.book_append_sheet(wb, ws, "MASTER_PRODUK");

  const wsReadme = utils.aoa_to_sheet(readme);
  utils.book_append_sheet(wb, wsReadme, "README");

  const buf = write(wb, { type: "array", bookType: "xlsx" });
  return buf as unknown as BlobPart;
}
