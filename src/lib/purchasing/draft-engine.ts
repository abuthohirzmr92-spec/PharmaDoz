/**
 * P0.8E — Purchase Draft Engine
 *
 * Pure functions for draft validation, totals, and state transitions.
 * Delegates item-level warnings to warning-engine.
 * NO side effects. NO DB access. NO Supabase calls.
 */

import type {
  PurchaseDraft,
  DraftStatus,
  DraftWarning,
} from "@/types/purchase-draft";
import { generateWarnings, hasCriticalWarnings } from "./warning-engine";

// ---------------------------------------------------------------------------
// Draft Validation
// ---------------------------------------------------------------------------

export function validateDraft(draft: PurchaseDraft, today: Date = new Date()): {
  status: DraftStatus;
  errors: DraftWarning[];
  canConfirm: boolean;
  confirmBlockerReason: string | null;
} {
  const allErrors: DraftWarning[] = [];
  let allItemsValid = true;

  // Validate each active item
  const activeItems = draft.items.filter(
    (i) => i.status !== "merged" && i.status !== "deleted",
  );

  for (const item of activeItems) {
    const warnings = generateWarnings(item, today);
    allErrors.push(...warnings);
    if (hasCriticalWarnings(warnings)) {
      allItemsValid = false;
    }
  }

  // Draft-level checks
  let canConfirm = allItemsValid;
  let confirmBlockerReason: string | null = null;

  if (activeItems.length === 0) {
    canConfirm = false;
    confirmBlockerReason = "Tidak ada item dalam draft.";
    allErrors.push({
      id: `warning--NO_ITEMS`,
      level: "critical",
      itemId: "",
      code: "NO_ITEMS",
      message: confirmBlockerReason,
    });
  }

  if (!draft.supplierId && !draft.supplierName) {
    canConfirm = false;
    confirmBlockerReason = confirmBlockerReason || "Supplier belum dipilih.";
    allErrors.push({
      id: `warning--NO_SUPPLIER`,
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

  return {
    status,
    errors: allErrors,
    canConfirm,
    confirmBlockerReason,
  };
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
// Status Transition Helpers
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
