/**
 * P0.8H.1 — Draft Confirmation Adapter (Hardened)
 *
 * Converts PurchaseDraft → PurchaseInvoice and calls existing addPurchase().
 * Pure orchestration — accepts store functions as parameters.
 * NO direct store imports. NO inventory logic. NO DB writes.
 */

import { validateDraft, calculateDraftTotals } from "../draft-engine";
import type { PurchaseDraft, PurchaseDraftItem } from "@/types/purchase-draft";
import type { PurchaseInvoice, PurchaseItem } from "@/types/inventory";

// ---------------------------------------------------------------------------
// Mapping (no fallbacks — validation must have passed)
// ---------------------------------------------------------------------------

/**
 * Convert a single draft item to a PurchaseItem.
 * Assumes draft has passed validation — all required fields are present.
 */
function draftItemToPurchaseItem(item: PurchaseDraftItem): PurchaseItem {
  if (!item.matchedProductId) {
    throw new Error(`Item "${item.rawProductName}" belum dicocokkan dengan produk.`);
  }
  if (!item.expiredDate) {
    throw new Error(`Item "${item.rawProductName}" tidak memiliki tanggal kadaluarsa.`);
  }
  if (item.enteredBuyPrice <= 0) {
    throw new Error(`Item "${item.rawProductName}" tidak memiliki harga beli.`);
  }

  return {
    id: item.id,
    tenantId: "",                     // filled by addPurchase from repository context
    productId: item.matchedProductId,
    productName: item.rawProductName,
    batchNumber: item.batchNumber || "",
    expiredDate: item.expiredDate,
    quantity: item.quantity,
    unitPrice: item.enteredBuyPrice,
    sellingPrice: item.currentSellingPrice,
  };
}

/**
 * Convert a PurchaseDraft to a PurchaseInvoice.
 * Invoice gets its own ID (separate from draft ID).
 */
function draftToInvoice(draft: PurchaseDraft): PurchaseInvoice {
  if (!draft.supplierId) {
    throw new Error("Supplier belum dipilih.");
  }

  const totals = calculateDraftTotals(draft);

  // Generate invoice number
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date();
  const invoiceNumber =
    draft.invoiceNumber ||
    `INV-P-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;

  const activeItems = draft.items.filter(
    (i) => i.status !== "merged" && i.status !== "deleted",
  );

  // Invoice gets a separate ID — preserves draft identity for retry/reference
  const invoiceId = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${draft.id}-inv`;

  return {
    id: invoiceId,
    tenantId: draft.tenantId,
    invoiceNumber,
    supplierId: draft.supplierId,
    supplierName: draft.supplierName ?? "",
    purchaseDate: draft.purchaseDate,
    dueDate: draft.dueDate ?? undefined,
    status: "unpaid",
    totalAmount: totals.grandTotal,
    paidAmount: 0,
    items: activeItems.map(draftItemToPurchaseItem),
  };
}

// ---------------------------------------------------------------------------
// Confirmation (pure orchestration — accepts store functions as params)
// ---------------------------------------------------------------------------

export interface ConfirmResult {
  success: boolean;
  invoiceNumber?: string;
  invoiceId?: string;
  error?: string;
  stage?: "validating" | "confirming" | "completed";
}

interface ConfirmDeps {
  /** Get draft by ID */
  getDraft: (id: string) => PurchaseDraft | undefined;
  /** Update draft status */
  updateDraftStatus: (id: string, status: "confirming" | "completed" | "has_error") => void;
  /** Existing addPurchase — the ONLY path to inventory */
  addPurchase: (invoice: PurchaseInvoice) => Promise<void>;
}

/**
 * Validate draft, convert to invoice, call addPurchase().
 *
 * Double-submit prevention:
 * - Sets status to "confirming" before addPurchase() call
 * - Returns early if draft is already in "confirming" state
 */
export async function confirmDraft(
  draftId: string,
  deps: ConfirmDeps,
): Promise<ConfirmResult> {
  const draft = deps.getDraft(draftId);
  if (!draft) {
    return { success: false, error: "Draft tidak ditemukan." };
  }

  // Double-submit guard
  if (draft.status === "confirming") {
    return { success: false, error: "Pembelian sedang diproses. Harap tunggu.", stage: "confirming" };
  }
  if (draft.status === "completed") {
    return { success: true, invoiceNumber: draft.invoiceNumber ?? undefined, stage: "completed" };
  }

  // 1. Validate
  const validation = validateDraft(draft);
  if (!validation.canConfirm) {
    return {
      success: false,
      error: validation.confirmBlockerReason ?? "Draft belum siap dikonfirmasi.",
      stage: "validating",
    };
  }

  // 2. Set confirming state (prevents double-submit)
  deps.updateDraftStatus(draftId, "confirming");

  // 3. Convert to invoice (will throw if mapping fails)
  let invoice: PurchaseInvoice;
  try {
    invoice = draftToInvoice(draft);
  } catch (err) {
    deps.updateDraftStatus(draftId, "has_error");
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal membuat invoice dari draft.",
      stage: "validating",
    };
  }

  if (invoice.items.length === 0) {
    deps.updateDraftStatus(draftId, "has_error");
    return { success: false, error: "Tidak ada item aktif dalam draft.", stage: "validating" };
  }

  // 4. Call existing addPurchase() — the ONLY path to inventory
  try {
    await deps.addPurchase(invoice);
    deps.updateDraftStatus(draftId, "completed");
    return {
      success: true,
      invoiceNumber: invoice.invoiceNumber,
      invoiceId: invoice.id,
      stage: "completed",
    };
  } catch (err) {
    deps.updateDraftStatus(draftId, "has_error");
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan pembelian.",
      stage: "confirming",
    };
  }
}

/**
 * Pre-flight check: returns whether draft can be confirmed without executing.
 */
export function canConfirm(draft: PurchaseDraft | undefined): {
  ready: boolean;
  reason: string | null;
  itemCount: number;
} {
  if (!draft) {
    return { ready: false, reason: "Draft tidak ditemukan.", itemCount: 0 };
  }

  const validation = validateDraft(draft);
  const activeItems = draft.items.filter(
    (i) => i.status !== "merged" && i.status !== "deleted",
  );

  return {
    ready: validation.canConfirm,
    reason: validation.confirmBlockerReason,
    itemCount: activeItems.length,
  };
}
