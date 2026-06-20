/**
 * P0.8I — OCR Service (STUB)
 *
 * Orchestration layer for OCR → Purchase Draft pipeline.
 * Currently throws "OCR Coming Soon" for all operations.
 *
 * Future flow:
 *   Image → OCR Provider → OcrResult → AI Parser → OcrParsedResult
 *   → PurchaseDraft → Match Engine → Warning Engine → Review → Confirm
 *   → addPurchase()
 *
 * NEVER bypasses: match-engine, warning-engine, draft-service, addPurchase()
 */

import type { OcrProvider } from "./provider.interface";
import type { OcrResult, OcrParsedResult, OcrSession } from "./types";

export class OcrService {
  private provider: OcrProvider | null = null;

  /** Set the OCR provider (Google Vision, Gemini, etc.) */
  setProvider(provider: OcrProvider): void {
    this.provider = provider;
  }

  /** Extract raw text from an invoice image */
  async recognizeImage(imageFile: File): Promise<OcrResult> {
    if (!this.provider) {
      throw new Error("OCR provider not configured.");
    }
    return this.provider.recognizeText(imageFile);
  }

  /** Parse raw OCR text into structured items (AI parser) */
  async parseToItems(_rawText: string): Promise<OcrParsedResult> {
    throw new Error("OCR Coming Soon — AI parsing will be available in the next update.");
  }

  /** Create a Purchase Draft from parsed OCR items */
  async createDraftFromOcr(_session: OcrSession): Promise<string> {
    throw new Error("OCR Coming Soon — Draft creation from OCR will be available in the next update.");
  }

  /** Generate image hash for deduplication */
  async hashImage(_imageFile: File): Promise<string> {
    throw new Error("OCR Coming Soon — Image deduplication will be available in the next update.");
  }
}
