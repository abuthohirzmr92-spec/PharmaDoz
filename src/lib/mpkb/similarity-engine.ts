// ---------------------------------------------------------------------------
// RC1.5 P1B — Zero Duplicate Similarity Engine
// ---------------------------------------------------------------------------
// Pure functions. Zero AI. Zero side effects.
// False positive is FORBIDDEN. False negative is ACCEPTABLE.
// ---------------------------------------------------------------------------

/**
 * Compute similarity score between two product entries.
 * Range: 0-100. Higher = more similar.
 */
export interface ProductIdentity {
  name: string;
  barcode?: string | null;
  manufacturer?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  baseUnit?: string | null;
  unitLevels?: Array<{ unitName: string; contains: number }> | null;
}

import { normalizeIdentity, type NormalizedIdentity } from "./identity-normalizer";

export function computeSimilarityScore(
  candidate: ProductIdentity,
  existing: ProductIdentity,
): number {
  let score = 0;

  // Barcode: definitive match
  if (candidate.barcode && existing.barcode && candidate.barcode.trim() === existing.barcode.trim()) {
    return 100;
  }

  // Name: exact normalized match
  const cName = normalizeForComparison(candidate.name);
  const eName = normalizeForComparison(existing.name);
  if (cName === eName) score += 30;

  // RC1.5 P1D — Use normalized identity for comparison
  const cNorm = normalizeIdentity({ manufacturer: candidate.manufacturer, strength: candidate.strength, dosageForm: candidate.dosageForm });
  const eNorm = normalizeIdentity({ manufacturer: existing.manufacturer, strength: existing.strength, dosageForm: existing.dosageForm });

  if (cNorm.strengthNormalized && eNorm.strengthNormalized && cNorm.strengthNormalized === eNorm.strengthNormalized) score += 20;
  if (cNorm.dosageFormCode && eNorm.dosageFormCode && cNorm.dosageFormCode === eNorm.dosageFormCode) score += 15;
  if (cNorm.manufacturerNormalized && eNorm.manufacturerNormalized && cNorm.manufacturerNormalized === eNorm.manufacturerNormalized) score += 15;
  if (candidate.baseUnit && existing.baseUnit && normalizeForComparison(candidate.baseUnit) === normalizeForComparison(existing.baseUnit)) score += 5;

  // Multi unit: same structure
  const cUnits = candidate.unitLevels?.map(u => `${u.unitName}:${u.contains}`).sort().join(",") || "";
  const eUnits = existing.unitLevels?.map(u => `${u.unitName}:${u.contains}`).sort().join(",") || "";
  if (cUnits && eUnits && cUnits === eUnits) score += 10;

  // Word overlap (bonus, max 20)
  const cWords = new Set(cName.split(" ").filter(w => w.length > 2));
  const eWords = new Set(eName.split(" ").filter(w => w.length > 2));
  const shared = [...cWords].filter(w => eWords.has(w)).length;
  const total = Math.max(cWords.size, eWords.size);
  if (total > 0) {
    const overlapRatio = shared / total;
    if (overlapRatio > 0.8) score += 20;
    else if (overlapRatio > 0.6) score += 15;
    else if (overlapRatio > 0.4) score += 10;
    else if (overlapRatio > 0.2) score += 5;
  }

  return Math.min(100, score);
}

/**
 * Batch evaluate: compare candidate against all existing products.
 * Returns the best match.
 */
export function evaluateSimilarity(
  candidate: ProductIdentity,
  existingProducts: Array<{ id: string } & ProductIdentity>,
): SimilarityResult | null {
  let best: SimilarityResult | null = null;
  for (const existing of existingProducts) {
    const score = computeSimilarityScore(candidate, existing);
    if (best === null || score > best.score) {
      const level: SafetyLevel = score >= 95 ? "block" : score >= 80 ? "warn" : "safe";
      best = { score, level, matchedProduct: existing };
    }
    if (best.score >= 95) break;
  }
  return best;
}

/**
 * Normalize product name for comparison.
 * Lowercase, trim, collapse spaces, remove punctuation.
 */
export function normalizeForComparison(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // remove special chars
    .replace(/\s+/g, " ")        // collapse spaces
    .trim();
}

/**
 * Safety level for approval decision.
 */
export type SafetyLevel = "block" | "warn" | "safe";

export interface SimilarityResult {
  score: number;
  level: SafetyLevel;
  matchedProduct: { id: string; name: string; barcode?: string | null };
}
