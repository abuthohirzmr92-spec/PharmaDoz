/**
 * P0.8I — Google Vision OCR Provider (STUB)
 *
 * Future: uses Google Cloud Vision API for OCR.
 * Currently: throws "OCR Coming Soon".
 */

import type { OcrProvider } from "./provider.interface";
import type { OcrResult } from "./types";

export class GoogleVisionProvider implements OcrProvider {
  readonly name = "google_vision";

  async recognizeText(_imageFile: File): Promise<OcrResult> {
    throw new Error("OCR Coming Soon — Google Vision integration will be available in the next update.");
  }
}
