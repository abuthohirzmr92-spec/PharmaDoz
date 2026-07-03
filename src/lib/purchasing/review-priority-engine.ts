// =================================================================
// Review Priority Engine v2 — reusable pure-function engine for
// purchase item review across Excel, OCR, PDF, and API imports.
//
// Zero side effects. Zero UI. Zero DB. Follows the existing
// engine pattern: match-engine, warning-engine, draft-engine.
//
// MEDISYNC STANDARD ENGINE — shared by all import methods.
// =================================================================

// ─── Public Types ───

/**
 * Main review status — determines filter group and priority band.
 *
 *   Band P1 (Belum Match)  — unmatched
 *   Band P2 (Perlu Review) — need_review, warning
 *   Band P3 (Sudah Match)  — matched
 *   Band P4 (hidden)       — empty (blank rows)
 */
export type ReviewStatus = "unmatched" | "need_review" | "warning" | "matched" | "empty" | "ocr_error" | "data_changed" | "new_product" | "not_purchased" | "ready_to_post";

/**
 * Fine-grained sub-status for detailed classification and debugging.
 * Determined during classifyReviewStatus() and surfaced in UI badge tooltips.
 */
export type ReviewSubStatus =
  // P1 — Belum Match (no productId assigned)
  | "unmatched"            // generic: no match found
  | "barcode_not_found"    // barcode provided but not in master
  | "multiple_candidates"  // match engine found multiple possibilities
  | "ambiguous_match"      // match result is ambiguous
  | "missing_product"      // product name exists but not in master
  // P2 — Perlu Review (product assigned but needs attention)
  | "need_review"          // generic: needs review
  | "fuzzy_match"          // matched via fuzzy/token algorithm
  | "manual_match"         // user manually selected product
  | "low_confidence"       // confidence below threshold
  | "has_warnings"         // active warnings from warning-engine
  // P3 — Sudah Match (clean auto-match)
  | "auto_match"           // automatic high-confidence match
  | "valid"                // all validations passed
  | "ready";               // ready for posting

/**
 * Numeric priority band for sorting.
 *
 *   P1 = unmatched (most urgent — user must act)
 *   P2 = need_review | warning (needs attention)
 *   P3 = matched (ready to post)
 *   P4 = empty (blank rows, sort to bottom)
 */
export type PriorityLevel = 1 | 2 | 3 | 4;

/**
 * Minimal contract for any item that participates in review.
 * PurchaseFormItem, PurchaseDraftItem, OcrParsedItem — all satisfy this
 * by providing at minimum { id, productId, productName }.
 */
export interface ReviewItemMeta {
  id: string;
  productId: string;
  productName: string;
  /** 0–100 from match engine. Undefined = N/A (manual entry). */
  matchConfidence?: number;
  /** barcode | product_code | exact_name | token | fuzzy | manual | unmatched */
  matchMethod?: string;
  /** matched | fuzzy_match | unmatched | warning | error | pending | merged | deleted */
  draftStatus?: string;
  /** Warnings attached by warning-engine. */
  warnings?: Array<{ code: string; message: string; level: string }>;
  /** Original row number from Excel/CSV import (0-based). */
  originalRowIndex?: number;
  /** SPR-INV-REVIEW-001A: Human review checkbox for need_review items */
  humanReviewed?: boolean;
}

/** A reviewable item with its computed review status, sub-status, and priority. */
export interface ReviewedItem<T extends ReviewItemMeta = ReviewItemMeta> {
  item: T;
  reviewStatus: ReviewStatus;
  reviewSubStatus: ReviewSubStatus;
  priority: PriorityLevel;
  /** Numeric sub-priority within the same band for fine-grained sorting. */
  prioritySub: number;
}

/** Aggregate review statistics. */
export interface ReviewStats {
  total: number;
  matched: number;
  needReview: number;
  unmatched: number;
  /** Items with a productId assigned (matched + needReview + warning). */
  progress: number;
  /** Progress percentage (0–100). */
  progressPercent: number;
  /** True when all items are resolved and ready for posting. */
  canPost: boolean;
}

/** Full review result — sorted items + stats. */
export interface ReviewResult<T extends ReviewItemMeta = ReviewItemMeta> {
  items: ReviewedItem<T>[];
  stats: ReviewStats;
}

// ─── Review Status Classification ───

/**
 * Classify a single item into its review status and sub-status.
 *
 * Priority band classification (per BUSINESS RULE):
 *
 *   P1 — BELUM MATCH
 *     - No productId + has productName → unmatched
 *     - barcode_not_found: barcode was provided but match engine found nothing
 *     - multiple_candidates: match engine returned multiple candidates
 *     - ambiguous_match: match confidence too low to decide
 *     - missing_product: product name provided but not in master catalog
 *
 *   P2 — PERLU REVIEW
 *     - Has productId BUT:
 *       - fuzzy_match status or fuzzy method
 *       - manual match (user selected, not auto)
 *       - low confidence (< 90%)
 *       - has active warnings from warning-engine
 *       - warning/error draft status
 *
 *   P3 — SUD MATCH
 *     - Has productId + clean auto-match (high confidence, no warnings)
 *
 *   P4 — EMPTY
 *     - No productId AND no productName (blank row)
 */
export function classifyReviewStatus(meta: ReviewItemMeta): {
  status: ReviewStatus;
  subStatus: ReviewSubStatus;
} {
  const hasProduct = meta.productId.length > 0;
  const hasName = meta.productName.length > 0;

  // ── P4: Blank row ──
  if (!hasProduct && !hasName) {
    return { status: "empty", subStatus: "unmatched" };
  }

  // ── User-set status overrides (check metadata) ──
  const userStatus = (meta as any).reviewStatus as ReviewStatus | undefined;
  if (userStatus === "data_changed") return { status: "data_changed", subStatus: "manual_match" };
  if (userStatus === "new_product") return { status: "new_product", subStatus: "manual_match" };
  if (userStatus === "not_purchased") return { status: "not_purchased", subStatus: "unmatched" };
  if (userStatus === "ready_to_post") return { status: "ready_to_post", subStatus: "ready" };

  // ── OCR Error: has name but missing critical fields (only when NOT matched) ──
  if (hasName && !hasProduct) {
    const qty = (meta as any).quantity as number | undefined;
    const price = (meta as any).unitPrice as number | undefined;
    if ((qty === undefined || qty <= 0) || (price === undefined || price <= 0)) {
      return { status: "ocr_error", subStatus: "unmatched" };
    }
  }

  // ── P1: Belum Match (no product assigned) ──

  if (!hasProduct && hasName) {
    // Determine WHY it's unmatched for sub-status
    const method = meta.matchMethod;
    if (method === "unmatched") {
      // Check if barcode was used
      const barcode = (meta as any).barcode as string | undefined;
      if (barcode && barcode.trim().length > 0) {
        return { status: "unmatched", subStatus: "barcode_not_found" };
      }
      return { status: "unmatched", subStatus: "missing_product" };
    }
    if (method === "fuzzy") {
      return { status: "unmatched", subStatus: "ambiguous_match" };
    }
    // Generic unmatched
    return { status: "unmatched", subStatus: "unmatched" };
  }

  // ── Has productId — classify into P2 or P3 ──

  const conf = meta.matchConfidence;
  const method = meta.matchMethod;
  const status = meta.draftStatus;
  // Only count active (non-resolved) warnings — user action can resolve warnings
  const hasWarnings = (meta.warnings?.filter((w) => !(w as any).resolved).length ?? 0) > 0;

  // Check each P2 trigger condition and return appropriate sub-status

  // Draft status signals
  if (status === "error") {
    return { status: "need_review", subStatus: "need_review" };
  }
  if (status === "warning") {
    return { status: "warning", subStatus: "has_warnings" };
  }
  if (status === "fuzzy_match") {
    return { status: "need_review", subStatus: "fuzzy_match" };
  }

  // ── SPR-INV-REVIEW-001A: humanReviewed gates all P2 checks ──
  // When user has reviewed, fuzzy match / low confidence / warnings are ACCEPTED.
  // Skip P2 classification entirely — proceed to P3 (matched/ready_to_post).
  if (hasProduct && meta.humanReviewed) {
    return { status: "ready_to_post", subStatus: "ready" };
  }

  // Match method signals
  if (method === "fuzzy") {
    return { status: "need_review", subStatus: "fuzzy_match" };
  }
  if (method === "manual") {
    return { status: "need_review", subStatus: "manual_match" };
  }

  // Low confidence
  if (conf != null && conf < 90) {
    return { status: "need_review", subStatus: "low_confidence" };
  }

  // Active warnings
  if (hasWarnings) {
    return { status: "warning", subStatus: "has_warnings" };
  }

  // ── P3: Sudah Match (clean) ──
  return { status: "matched", subStatus: "auto_match" };
}

/**
 * Map review status to numeric priority band for sorting.
 *
 *   P1 = unmatched              (Belum Match — user must act)
 *   P2 = need_review | warning  (Perlu Review — needs attention)
 *   P3 = matched                (Sudah Match — ready)
 *   P4 = empty                  (blank rows, sort to bottom)
 */
export function classifyPriority(status: ReviewStatus): PriorityLevel {
  switch (status) {
    case "ocr_error":
    case "unmatched":
      return 1;
    case "need_review":
    case "warning":
    case "data_changed":
      return 2;
    case "matched":
    case "new_product":
    case "ready_to_post":
      return 3;
    case "empty":
    case "not_purchased":
      return 4;
  }
}

/**
 * Numeric sub-priority within the same priority band for fine-grained sort.
 * Lower = more urgent. Determined by sub-status.
 *
 *   P1 sub-order: missing_product(1) → barcode_not_found(2) → ambiguous_match(3) → multiple_candidates(4) → unmatched(5)
 *   P2 sub-order: need_review(1) → fuzzy_match(2) → low_confidence(3) → manual_match(4) → has_warnings(5) → warning(6)
 *   P3 sub-order: auto_match(1) → valid(2) → ready(3)
 */
export function classifySubPriority(subStatus: ReviewSubStatus): number {
  // P1 sub-order
  const p1Map: Record<string, number> = {
    missing_product: 1,
    barcode_not_found: 2,
    ambiguous_match: 3,
    multiple_candidates: 4,
    unmatched: 5,
  };
  // P2 sub-order
  const p2Map: Record<string, number> = {
    need_review: 1,
    fuzzy_match: 2,
    low_confidence: 3,
    manual_match: 4,
    has_warnings: 5,
    warning: 6,
  };
  // P3 sub-order
  const p3Map: Record<string, number> = {
    auto_match: 1,
    valid: 2,
    ready: 3,
  };

  return p1Map[subStatus] ?? p2Map[subStatus] ?? p3Map[subStatus] ?? 99;
}

// ─── Review Computation ───

/**
 * Compute full review result: classify every item, sort by priority,
 * and aggregate statistics.
 *
 * Sort order (per BUSINESS RULE):
 *   1. Priority band ASC  (P1 unresolved first, P4 blank last)
 *   2. Sub-priority ASC   (within same band, more urgent first)
 *   3. Product name ASC   (alphabetical within same sub-priority)
 *   4. Original row index ASC  (preserve import order within same name)
 *
 * @param items            - Items to review (must satisfy ReviewItemMeta)
 * @param supplierSelected - Whether a supplier has been selected (for canPost)
 */
export function computeReview<T extends ReviewItemMeta>(
  items: T[],
  supplierSelected: boolean = false,
): ReviewResult<T> {
  const reviewed: ReviewedItem<T>[] = items.map((item) => {
    const { status, subStatus } = classifyReviewStatus(item);
    const priority = classifyPriority(status);
    const prioritySub = classifySubPriority(subStatus);
    return { item, reviewStatus: status, reviewSubStatus: subStatus, priority, prioritySub };
  });

  // Sort: priority ASC → sub-priority ASC → name ASC → originalRow ASC
  reviewed.sort((a, b) => {
    // 1. Priority band (lower = more urgent)
    if (a.priority !== b.priority) return a.priority - b.priority;

    // 2. Sub-priority within band
    if (a.prioritySub !== b.prioritySub) return a.prioritySub - b.prioritySub;

    // 3. Product name alphabetically
    const nameA = (a.item.productName || "").toLowerCase();
    const nameB = (b.item.productName || "").toLowerCase();
    if (nameA !== nameB) return nameA.localeCompare(nameB);

    // 4. Original row index (preserve import order)
    const rowA = a.item.originalRowIndex ?? Number.MAX_SAFE_INTEGER;
    const rowB = b.item.originalRowIndex ?? Number.MAX_SAFE_INTEGER;
    return rowA - rowB;
  });

  // Aggregate stats
  const matched = reviewed.filter((r) => r.reviewStatus === "matched" || r.reviewStatus === "ready_to_post").length;
  const needReview = reviewed.filter((r) => r.reviewStatus === "need_review" || r.reviewStatus === "warning" || r.reviewStatus === "data_changed").length;
  const unmatched = reviewed.filter((r) => r.reviewStatus === "unmatched").length;
  const ocrErrors = reviewed.filter((r) => r.reviewStatus === "ocr_error").length;

  const stats: ReviewStats = {
    total: items.length,
    matched,
    needReview,
    unmatched,
    progress: matched + needReview,
    progressPercent: items.length > 0 ? Math.round(((matched + needReview) / items.length) * 100) : 0,
    canPost:
      unmatched === 0 &&
      needReview === 0 &&
      ocrErrors === 0 &&
      items.length > 0 &&
      supplierSelected,
  };

  return { items: reviewed, stats };
}

// ─── Filtering ───

/**
 * Filter reviewed items by review status.
 *
 * @param result - Full review result from computeReview()
 * @param status - Status to filter by, or "all" for no filter
 */
export function filterByStatus<T extends ReviewItemMeta>(
  result: ReviewResult<T>,
  status: ReviewStatus | "all",
): ReviewedItem<T>[] {
  if (status === "all") return result.items;
  return result.items.filter((r) => r.reviewStatus === status);
}

/**
 * Filter by priority group (used for UI filter tabs).
 *
 *   "all"          — all items
 *   "belum_match"  — P1 only (unmatched)
 *   "perlu_review" — P2 only (need_review + warning)
 *   "sudah_match"  — P3 only (matched)
 */
export function filterByPriorityGroup<T extends ReviewItemMeta>(
  result: ReviewResult<T>,
  group: "all" | "belum_match" | "perlu_review" | "sudah_match" | "ocr_error" | "new_product" | "ready_to_post",
): ReviewedItem<T>[] {
  switch (group) {
    case "all":
      return result.items;
    case "belum_match":
      return result.items.filter((r) => r.priority === 1);
    case "perlu_review":
      return result.items.filter((r) => r.priority === 2);
    case "sudah_match":
      return result.items.filter((r) => r.priority === 3 && r.reviewStatus !== "new_product" && r.reviewStatus !== "ready_to_post");
    case "ocr_error":
      return result.items.filter((r) => r.reviewStatus === "ocr_error");
    case "new_product":
      return result.items.filter((r) => r.reviewStatus === "new_product");
    case "ready_to_post":
      return result.items.filter((r) => r.reviewStatus === "ready_to_post");
  }
}

// ─── Search ───

/**
 * Search across ALL items regardless of current filter group.
 * Matches against productName, barcode, and supplierName.
 *
 * IMPORTANT: This searches the FULL dataset, not a pre-filtered subset.
 * Per spec: "Search WAJIB mencari pada SELURUH dataset review."
 *
 * @param items - Complete flat array of reviewable items
 * @param query - Search query string
 * @returns Items matching the query (preserves original order)
 */
export function searchItems<T extends ReviewItemMeta>(
  items: T[],
  query: string,
): T[] {
  if (!query.trim()) return items;

  const q = query.toLowerCase().trim();

  return items.filter((item) => {
    // Primary: product name
    if (item.productName.toLowerCase().includes(q)) return true;
    // Secondary: product ID
    if (item.productId && item.productId.toLowerCase().includes(q)) return true;
    // Tertiary: barcode (if available on the item)
    const barcode = (item as any).barcode as string | undefined;
    if (barcode && barcode.toLowerCase().includes(q)) return true;
    // Quaternary: supplier name (if available)
    const supplierName = (item as any).supplierName as string | undefined;
    if (supplierName && supplierName.toLowerCase().includes(q)) return true;
    return false;
  });
}

// ─── Export aliases (for convenience) ───

export { classifyReviewStatus as classifyItem };
