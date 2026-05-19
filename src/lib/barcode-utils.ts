/* ------------------------------------------------------------------ */
/*  Barcode & Product Code Utilities                                   */
/* ------------------------------------------------------------------ */

/**
 * Regex pattern for valid barcodes: alphanumeric characters and dashes,
 * 1 to 100 characters long.
 */
export const BARCODE_PATTERN = /^[A-Za-z0-9-]{1,100}$/;

/**
 * Generate a unique product code for auto-fill.
 * Format: PRD-{YYYYMMDD}{HHmm}-{random4hex}
 *
 * Example output: PRD-202605191430-a3f2
 */
export function generateProductCode(): string {
  const now = new Date();

  const yyyy = now.getFullYear().toString();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  const randomHex = Math.floor(Math.random() * 0x10000)
    .toString(16)
    .padStart(4, "0");

  return `PRD-${yyyy}${mm}${dd}${hh}${min}-${randomHex}`;
}

export interface BarcodeValidation {
  valid: boolean;
  message?: string;
}

/**
 * Validate a barcode string against the format rules:
 * alphanumeric + dashes only, 1-100 characters.
 */
export function validateBarcode(barcode: string): BarcodeValidation {
  if (!barcode || barcode.trim().length === 0) {
    return { valid: false, message: "Barcode cannot be empty" };
  }

  const trimmed = barcode.trim();

  if (trimmed.length > 100) {
    return { valid: false, message: "Barcode must be at most 100 characters" };
  }

  if (!BARCODE_PATTERN.test(trimmed)) {
    return {
      valid: false,
      message:
        "Barcode may only contain letters, numbers, and dashes",
    };
  }

  return { valid: true };
}

/**
 * Check whether a barcode is unique among the given list of existing products.
 */
export function isBarcodeUnique(
  barcode: string,
  existingProducts: Array<{ barcode: string | null }>,
): boolean {
  const trimmed = barcode.trim().toLowerCase();
  return !existingProducts.some(
    (p) => p.barcode !== null && p.barcode.toLowerCase() === trimmed,
  );
}

/**
 * Normalize a search query for barcode lookup:
 * trim whitespace and convert to uppercase.
 */
export function formatBarcodeForSearch(query: string): string {
  return query.trim().toUpperCase();
}
