/**
 * P0.8I — OCR Provider Interface
 *
 * All OCR providers implement this interface.
 * Future: Google Vision, Gemini, Mistral, Azure.
 * Currently: stub only — throws "OCR Coming Soon".
 */

import type { OcrResult } from "./types";

export interface OcrProvider {
  /** Provider name for logging/selection */
  readonly name: string;

  /**
   * Extract raw text from an image file.
   * @param imageFile — JPG, PNG, or PDF
   * @returns Raw OCR result with text + confidence
   */
  recognizeText(imageFile: File): Promise<OcrResult>;
}
