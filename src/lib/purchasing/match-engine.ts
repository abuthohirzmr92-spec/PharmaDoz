/**
 * P0.8F — Product Match Engine
 *
 * Pure functions for matching raw product names to database products.
 * Used by: OCR, Excel, CSV, Manual Draft, Future API imports.
 *
 * NO side effects. NO store. NO DB. NO Supabase. NO repositories.
 * NO imports from other engines, services, or UI.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MatchMethod =
  | "barcode"
  | "product_code"
  | "exact_name"
  | "token"
  | "fuzzy"
  | "manual"
  | "unmatched";

export interface MatchCandidate {
  productId: string;
  productName: string;
  confidence: number;       // 0–100
  method: MatchMethod;
}

export interface MatchResult {
  matchedProductId: string | null;
  matchedProductName: string | null;
  confidence: number;
  method: MatchMethod;
  candidates: MatchCandidate[];  // top 5, sorted by confidence desc
}

export interface ProductReference {
  id: string;
  name: string;
  code?: string | null;
  barcode?: string | null;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize product name for comparison.
 * Lowercase, trim, collapse whitespace, remove punctuation.
 */
export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")   // punctuation → space
    .replace(/\s+/g, " ")            // collapse spaces
    .trim();
}

/**
 * Tokenize normalized name into word array.
 * Only meaningful tokens (skip very short tokens except digits).
 */
export function tokenizeProductName(name: string): string[] {
  const normalized = normalizeProductName(name);
  return normalized
    .split(" ")
    .filter((t) => t.length > 0);
}

// ---------------------------------------------------------------------------
// Levenshtein Distance (lightweight, no external packages)
// ---------------------------------------------------------------------------

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // Use single-row optimization for memory
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1]! + 1,        // insertion
        prev[j]! + 1,            // deletion
        prev[j - 1]! + cost,     // substitution
      );
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }

  return prev[n]!;
}

// ---------------------------------------------------------------------------
// Matching Functions (priority order)
// ---------------------------------------------------------------------------

/**
 * 1. Barcode exact match — confidence 100
 */
function matchByBarcode(
  barcode: string,
  products: ProductReference[],
): MatchResult | null {
  if (!barcode) return null;
  const match = products.find((p) => p.barcode === barcode);
  if (match) {
    return {
      matchedProductId: match.id,
      matchedProductName: match.name,
      confidence: 100,
      method: "barcode",
      candidates: [
        {
          productId: match.id,
          productName: match.name,
          confidence: 100,
          method: "barcode",
        },
      ],
    };
  }
  return null;
}

/**
 * 2. Product code exact match — confidence 100
 */
function matchByCode(
  code: string,
  products: ProductReference[],
): MatchResult | null {
  if (!code) return null;
  const match = products.find(
    (p) => p.code && p.code.toLowerCase() === code.toLowerCase(),
  );
  if (match) {
    return {
      matchedProductId: match.id,
      matchedProductName: match.name,
      confidence: 100,
      method: "product_code",
      candidates: [
        {
          productId: match.id,
          productName: match.name,
          confidence: 100,
          method: "product_code",
        },
      ],
    };
  }
  return null;
}

/**
 * 3. Exact normalized name match — confidence 100
 */
function matchByExactName(
  rawName: string,
  products: ProductReference[],
): MatchResult | null {
  const normalized = normalizeProductName(rawName);
  const match = products.find(
    (p) => normalizeProductName(p.name) === normalized,
  );
  if (match) {
    return {
      matchedProductId: match.id,
      matchedProductName: match.name,
      confidence: 100,
      method: "exact_name",
      candidates: [
        {
          productId: match.id,
          productName: match.name,
          confidence: 100,
          method: "exact_name",
        },
      ],
    };
  }
  return null;
}

/**
 * 4. Token overlap match — confidence 80–95
 *
 * Calculates token overlap ratio.
 * All raw tokens must appear in product tokens (or vice versa).
 * Confidence = (matched tokens / max tokens) * 95 capped.
 */
function matchByToken(
  rawName: string,
  products: ProductReference[],
): MatchCandidate[] {
  const rawTokens = tokenizeProductName(rawName);
  if (rawTokens.length === 0) return [];

  const candidates: MatchCandidate[] = [];

  for (const product of products) {
    const productTokens = tokenizeProductName(product.name);
    if (productTokens.length === 0) continue;

    const matchedRaw = rawTokens.filter((t) => productTokens.includes(t));
    const matchedProd = productTokens.filter((t) => rawTokens.includes(t));

    // Both directions: raw tokens in product AND product tokens in raw
    const rawRatio = matchedRaw.length / rawTokens.length;
    const prodRatio = matchedProd.length / productTokens.length;
    const overlapRatio = Math.min(rawRatio, prodRatio);

    if (overlapRatio >= 0.6) {
      const confidence = Math.round(overlapRatio * 95);
      if (confidence >= 80) {
        candidates.push({
          productId: product.id,
          productName: product.name,
          confidence,
          method: "token",
        });
      }
    }
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

/**
 * 5. Fuzzy (Levenshtein) match — confidence 70–84
 *
 * For names that are close but have minor spelling differences.
 */
function matchByFuzzy(
  rawName: string,
  products: ProductReference[],
): MatchCandidate[] {
  const normalized = normalizeProductName(rawName);
  if (normalized.length < 4) return [];   // too short for meaningful fuzzy

  const candidates: MatchCandidate[] = [];

  for (const product of products) {
    const productNorm = normalizeProductName(product.name);
    if (productNorm.length < 4) continue;

    const distance = levenshteinDistance(normalized, productNorm);
    const maxLen = Math.max(normalized.length, productNorm.length);
    const similarity = ((maxLen - distance) / maxLen) * 100;

    if (similarity >= 70) {
      candidates.push({
        productId: product.id,
        productName: product.name,
        confidence: Math.round(similarity),
        method: "fuzzy",
      });
    }
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

// ---------------------------------------------------------------------------
// Main Match Function
// ---------------------------------------------------------------------------

/**
 * Match a raw product name (and optional barcode/code) against a product list.
 *
 * Priority:
 *   1. Barcode exact → 100%
 *   2. Product code exact → 100%
 *   3. Exact name → 100%
 *   4. Token overlap → 80–95%
 *   5. Fuzzy Levenshtein → 70–84%
 *   6. Unmatched → 0%
 *
 * Stops early if confidence ≥ 95%.
 */
export function matchProduct(
  rawName: string,
  products: ProductReference[],
  barcode?: string | null,
  productCode?: string | null,
): MatchResult {
  if (products.length === 0) {
    return {
      matchedProductId: null,
      matchedProductName: null,
      confidence: 0,
      method: "unmatched",
      candidates: [],
    };
  }

  // 1. Barcode (100%)
  if (barcode) {
    const result = matchByBarcode(barcode, products);
    if (result) return result;
  }

  // 2. Product code (100%)
  if (productCode) {
    const result = matchByCode(productCode, products);
    if (result) return result;
  }

  // 3. Exact name (100%)
  const exactResult = matchByExactName(rawName, products);
  if (exactResult) return exactResult;

  // 4. Token overlap (80–95%)
  const tokenCandidates = matchByToken(rawName, products);
  if (tokenCandidates.length > 0 && tokenCandidates[0]!.confidence >= 95) {
    const best = tokenCandidates[0]!;
    return {
      matchedProductId: best.productId,
      matchedProductName: best.productName,
      confidence: best.confidence,
      method: "token",
      candidates: tokenCandidates.slice(0, 5),
    };
  }

  // 5. Fuzzy (70–84%)
  const fuzzyCandidates = matchByFuzzy(rawName, products);

  // Combine token + fuzzy candidates
  const allCandidates = [...tokenCandidates];
  for (const fc of fuzzyCandidates) {
    if (!allCandidates.some((c) => c.productId === fc.productId)) {
      allCandidates.push(fc);
    }
  }
  allCandidates.sort((a, b) => b.confidence - a.confidence);
  const top5 = allCandidates.slice(0, 5);

  if (top5.length === 0) {
    return {
      matchedProductId: null,
      matchedProductName: null,
      confidence: 0,
      method: "unmatched",
      candidates: [],
    };
  }

  const best = top5[0]!;
  return {
    matchedProductId: best.confidence >= 70 ? best.productId : null,
    matchedProductName: best.confidence >= 70 ? best.productName : null,
    confidence: best.confidence,
    method: best.confidence >= 70 ? best.method : "unmatched",
    candidates: top5,
  };
}
