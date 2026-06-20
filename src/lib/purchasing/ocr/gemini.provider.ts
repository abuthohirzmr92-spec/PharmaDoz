/**
 * P0.8I — Gemini OCR Provider (STUB)
 *
 * Future: uses Google Gemini API for OCR + AI parsing.
 * Currently: throws "OCR Coming Soon".
 */

import type { OcrProvider } from "./provider.interface";
import type { OcrResult } from "./types";

export class GeminiProvider implements OcrProvider {
  readonly name = "gemini";

  async recognizeText(_imageFile: File): Promise<OcrResult> {
    throw new Error("OCR Coming Soon — Gemini integration will be available in the next update.");
  }
}
