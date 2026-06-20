/**
 * P0.9A — CSV Types
 *
 * CSV import is an input source for the Purchase Draft pipeline.
 * NO IDs here — IDs are assigned by the mapper when creating draft items.
 */

export interface CsvRow {
  /** 1-based row number in the CSV file */
  rowNumber: number;
  /** Required: product name for matching */
  productName: string;
  /** Required: quantity */
  quantity: number;
  /** Required: unit buy price */
  buyPrice: number;
  /** Optional: pre-assigned batch number */
  batchNumber?: string;
  /** Optional: expired date string (will be validated later) */
  expiredDate?: string;
}

export interface CsvParseResult {
  /** Successfully parsed rows */
  rows: CsvRow[];
  /** Total lines in file (excluding header) */
  totalRows: number;
  /** Rows that failed validation */
  invalidRows: number;
  /** Validation errors per failed row */
  errors: CsvParseError[];
}

export interface CsvParseError {
  rowNumber: number;
  field: string;
  message: string;
}
