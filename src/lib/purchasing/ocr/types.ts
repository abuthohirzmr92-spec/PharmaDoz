/**
 * P0.8I — OCR Types
 *
 * Architecture skeleton. No implementation yet.
 * OCR is an input source that feeds Purchase Draft pipeline.
 */

// ─── OCR Result from provider ───

export interface OcrResult {
  /** Raw text extracted from image */
  rawText: string;
  /** Provider that processed the image */
  provider: OcrProviderName;
  /** Overall confidence from OCR engine (0–100) */
  confidence: number;
  /** When OCR was processed */
  processedAt: string;
}

export type OcrProviderName = "google_vision" | "gemini" | "mistral" | "azure";

// ─── Parsed item from OCR text (AI parser output) ───

export interface OcrParsedItem {
  /** Raw product name from invoice */
  name: string;
  /** Quantity */
  qty: number;
  /** Unit price on invoice */
  price: number;
  /** Batch number if visible */
  batch?: string;
  /** Expired date if visible */
  expiredDate?: string;
  /** Supplier name if detected */
  supplier?: string;
  /** AI confidence per item (0–100) */
  confidence: number;
}

export interface OcrParsedResult {
  /** Supplier name extracted from invoice */
  supplier: string | null;
  /** Invoice date extracted */
  invoiceDate: string | null;
  /** Parsed line items */
  items: OcrParsedItem[];
  /** AI parser confidence (0–100) */
  confidence: number;
}

// ─── OCR Session ───

export type OcrSessionStatus =
  | "uploaded"
  | "ocr_done"
  | "parsed"
  | "reviewed"
  | "confirmed";

export interface OcrSession {
  id: string;
  status: OcrSessionStatus;
  /** Original file name */
  fileName: string;
  /** SHA-256 hash for dedup */
  imageHash: string;
  /** OCR provider used */
  ocrProvider: OcrProviderName;
  /** Raw OCR text (cached) */
  rawOcrText: string | null;
  /** Parsed JSON result */
  parsedResult: OcrParsedResult | null;
  /** AI parser used */
  aiProvider: string | null;
  /** Linked draft ID after confirmation */
  draftId: string | null;
}
