/**
 * P0.8E — Purchase Draft Engine
 *
 * Pure functions for validation, status calculation, and totals.
 * NO side effects. NO DB access. NO Supabase calls.
 */

import type {
  PurchaseDraft,
  PurchaseDraftItem,
  DraftStatus,
  DraftItemStatus,
  DraftWarning,
} from "@/types/purchase-draft";

// ---------------------------------------------------------------------------
// Item Validation
// ---------------------------------------------------------------------------

export function validateItem(
  item: PurchaseDraftItem,
  today: Date = new Date(),
): { valid: boolean; errors: DraftWarning[]; status: DraftItemStatus } {
  const errors: DraftWarning[] = [];

  // Required: product match
  if (!item.matchedProductId || item.matchMethod === "unmatched") {
    errors.push({
      level: "critical",
      itemId: item.id,
      code: "NO_MATCH",
      message: `Produk "${item.rawProductName}" belum dicocokkan.`,
    });
  }

  // Required: low confidence
  if (item.matchedProductId && item.matchConfidence > 0 && item.matchConfidence < 70) {
    errors.push({
      level: "warning",
      itemId: item.id,
      code: "LOW_CONFIDENCE",
      message: `Match confidence rendah: ${item.matchConfidence}%. Verifikasi manual disarankan.`,
      detail: `Matched via ${item.matchMethod}`,
    });
  }

  // Required: quantity
  if (item.quantity <= 0) {
    errors.push({
      level: "critical",
      itemId: item.id,
      code: "INVALID_QTY",
      message: "Qty harus lebih dari 0.",
    });
  }

  // Required: buy price
  if (item.enteredBuyPrice <= 0) {
    errors.push({
      level: "critical",
      itemId: item.id,
      code: "MISSING_PRICE",
      message: "Harga beli harus lebih dari 0.",
    });
  }

  // Required: expired date
  if (!item.expiredDate) {
    errors.push({
      level: "critical",
      itemId: item.id,
      code: "MISSING_EXPIRED",
      message: "Tanggal kadaluarsa wajib diisi.",
    });
  } else {
    const expDate = new Date(item.expiredDate);
    if (isNaN(expDate.getTime())) {
      errors.push({
        level: "critical",
        itemId: item.id,
        code: "INVALID_DATE",
        message: `Format tanggal tidak valid: "${item.expiredDate}".`,
      });
    } else if (expDate <= today) {
      errors.push({
        level: "critical",
        itemId: item.id,
        code: "EXPIRED_PAST",
        message: "Tanggal kadaluarsa sudah lewat.",
      });
    } else {
      const daysUntilExpiry = Math.ceil(
        (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntilExpiry < 90) {
        errors.push({
          level: "warning",
          itemId: item.id,
          code: "EXPIRED_NEAR",
          message: `Expired dalam ${daysUntilExpiry} hari. Pertimbangkan untuk menolak.`,
        });
      }
    }
  }

  // Warning: price change
  if (
    item.previousBuyPrice != null &&
    item.previousBuyPrice > 0 &&
    item.enteredBuyPrice > 0
  ) {
    const change =
      ((item.enteredBuyPrice - item.previousBuyPrice) / item.previousBuyPrice) *
      100;
    if (change > 15) {
      errors.push({
        level: "warning",
        itemId: item.id,
        code: "PRICE_INCREASE",
        message: `Harga naik ${change.toFixed(0)}% dari pembelian terakhir (Rp ${item.previousBuyPrice.toLocaleString("id-ID")}).`,
      });
    } else if (change < -20) {
      errors.push({
        level: "info",
        itemId: item.id,
        code: "PRICE_DECREASE",
        message: `Harga turun ${Math.abs(change).toFixed(0)}% dari pembelian terakhir.`,
      });
    }
  }

  const hasCritical = errors.some((e) => e.level === "critical");
  const status: DraftItemStatus = hasCritical
    ? "error"
    : errors.length > 0
      ? "warning"
      : "matched";

  return { valid: !hasCritical, errors, status };
}

// ---------------------------------------------------------------------------
// Draft Validation
// ---------------------------------------------------------------------------

export function validateDraft(draft: PurchaseDraft): {
  status: DraftStatus;
  itemsValid: boolean;
  errors: DraftWarning[];
  canConfirm: boolean;
  confirmBlockerReason: string | null;
} {
  const allErrors: DraftWarning[] = [];
  let allItemsValid = true;
  const today = new Date();

  // Validate each active item
  const activeItems = draft.items.filter(
    (i) => i.status !== "merged" && i.status !== "deleted",
  );

  for (const item of activeItems) {
    const result = validateItem(item, today);
    allErrors.push(...result.errors);
    if (!result.valid) allItemsValid = false;
  }

  // Draft-level checks
  let canConfirm = allItemsValid;
  let confirmBlockerReason: string | null = null;

  // Must have at least 1 active item
  if (activeItems.length === 0) {
    canConfirm = false;
    confirmBlockerReason = "Tidak ada item dalam draft.";
    allErrors.push({
      level: "critical",
      itemId: "",
      code: "NO_ITEMS",
      message: confirmBlockerReason,
    });
  }

  // Must have a supplier
  if (!draft.supplierId && !draft.supplierName) {
    canConfirm = false;
    confirmBlockerReason = confirmBlockerReason || "Supplier belum dipilih.";
    allErrors.push({
      level: "critical",
      itemId: "",
      code: "NO_SUPPLIER",
      message: "Supplier belum dipilih.",
    });
  }

  // Determine status
  const hasCritical = allErrors.some((e) => e.level === "critical");
  const hasWarning = allErrors.some((e) => e.level === "warning");

  let status: DraftStatus;
  if (draft.status === "confirmed" || draft.status === "completed") {
    status = draft.status;
  } else if (hasCritical) {
    status = "has_error";
  } else if (hasWarning) {
    status = "has_warning";
  } else if (activeItems.length > 0 && allItemsValid) {
    status = "ready";
  } else {
    status = "draft";
  }

  return { status, itemsValid: allItemsValid, errors: allErrors, canConfirm, confirmBlockerReason };
}

// ---------------------------------------------------------------------------
// Confirmation Gate
// ---------------------------------------------------------------------------

export function canConfirmDraft(draft: PurchaseDraft): {
  canConfirm: boolean;
  errors: string[];
} {
  const { canConfirm, confirmBlockerReason } = validateDraft(draft);
  const errors: string[] = [];
  if (!canConfirm && confirmBlockerReason) {
    errors.push(confirmBlockerReason);
  }
  return { canConfirm, errors };
}

// ---------------------------------------------------------------------------
// Totals Calculation
// ---------------------------------------------------------------------------

export function calculateDraftTotals(draft: PurchaseDraft): {
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  itemCount: number;
} {
  const activeItems = draft.items.filter(
    (i) => i.status !== "merged" && i.status !== "deleted",
  );

  let subtotal = 0;
  let discountTotal = 0;
  let itemCount = 0;

  for (const item of activeItems) {
    const lineTotal = item.quantity * item.enteredBuyPrice;
    const lineDiscount = lineTotal * (item.discountPercent / 100);
    subtotal += lineTotal;
    discountTotal += lineDiscount;
    itemCount++;
  }

  const grandTotal = subtotal - discountTotal;

  return { subtotal, discountTotal, grandTotal, itemCount };
}

// ---------------------------------------------------------------------------
// Warning / Error Counters
// ---------------------------------------------------------------------------

export function countWarnings(draft: PurchaseDraft): { info: number; warning: number; critical: number } {
  const counts = { info: 0, warning: 0, critical: 0 };
  const { errors } = validateDraft(draft);
  for (const e of errors) {
    if (e.level === "info") counts.info++;
    else if (e.level === "warning") counts.warning++;
    else counts.critical++;
  }
  return counts;
}

export function countErrors(draft: PurchaseDraft): number {
  return countWarnings(draft).critical;
}

// ---------------------------------------------------------------------------
// Status transition helpers
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<DraftStatus, DraftStatus[]> = {
  draft: ["ready", "has_warning", "has_error", "cancelled"],
  ready: ["confirmed", "cancelled", "has_error"],
  has_warning: ["confirmed", "cancelled", "has_error", "ready"],
  has_error: ["ready", "has_warning", "cancelled"],
  confirmed: ["completed", "has_error"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: DraftStatus, to: DraftStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

export function transitionStatus(
  draft: PurchaseDraft,
  to: DraftStatus,
): { success: boolean; error?: string } {
  if (!canTransition(draft.status, to)) {
    return {
      success: false,
      error: `Invalid transition: ${draft.status} → ${to}`,
    };
  }
  return { success: true };
}
