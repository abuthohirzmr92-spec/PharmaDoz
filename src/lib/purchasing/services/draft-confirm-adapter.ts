/**
 * P0.8H — Draft Confirmation Adapter
 *
 * Converts PurchaseDraft → PurchaseInvoice and calls existing addPurchase().
 * NO inventory logic. NO stock movement logic. NO DB writes.
 * ONLY path to inventory is through existing addPurchase().
 */

import { useInventoryStore } from "@/store/inventory-store";
import { usePurchaseDraftStore } from "../draft-store";
import { validateDraft, calculateDraftTotals } from "../draft-engine";
import type { PurchaseDraft, PurchaseDraftItem } from "@/types/purchase-draft";
import type { PurchaseInvoice, PurchaseItem } from "@/types/inventory";

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

/**
 * Convert a single draft item to a PurchaseItem for addPurchase().
 */
function draftItemToPurchaseItem(item: PurchaseDraftItem): PurchaseItem {
  const now = new Date().toISOString();
  return {
    id: item.id,
    tenantId: "",                           // filled by addPurchase from context
    productId: item.matchedProductId ?? item.id,
    productName: item.rawProductName,
    batchNumber: item.batchNumber ?? "",
    expiredDate: item.expiredDate ?? now,
    quantity: item.quantity,
    unitPrice: item.enteredBuyPrice,
    sellingPrice: item.currentSellingPrice,
  };
}

/**
 * Convert a PurchaseDraft to a PurchaseInvoice for addPurchase().
 */
function draftToInvoice(draft: PurchaseDraft): PurchaseInvoice {
  const now = new Date().toISOString();
  const totals = calculateDraftTotals(draft);

  // Generate invoice number if not set
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date();
  const invoiceNumber =
    draft.invoiceNumber ??
    `INV-P-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;

  const activeItems = draft.items.filter(
    (i) => i.status !== "merged" && i.status !== "deleted",
  );

  return {
    id: draft.id,
    tenantId: draft.tenantId,
    invoiceNumber,
    supplierId: draft.supplierId ?? "",
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
// Confirmation
// ---------------------------------------------------------------------------

export interface ConfirmResult {
  success: boolean;
  invoiceNumber?: string;
  error?: string;
}

/**
 * Validate draft, convert to invoice, and call existing addPurchase().
 *
 * Returns:
 * - success: true → draft confirmed, inventory updated
 * - success: false → validation failed or addPurchase() threw
 */
export async function confirmDraft(draftId: string): Promise<ConfirmResult> {
  const draftStore = usePurchaseDraftStore.getState();
  const draft = draftStore.getDraft(draftId);

  if (!draft) {
    return { success: false, error: "Draft tidak ditemukan." };
  }

  // 1. Validate
  const validation = validateDraft(draft);
  if (!validation.canConfirm) {
    return {
      success: false,
      error: validation.confirmBlockerReason ?? "Draft belum siap dikonfirmasi.",
    };
  }

  // 2. Convert to invoice
  const invoice = draftToInvoice(draft);
  if (invoice.items.length === 0) {
    return { success: false, error: "Tidak ada item aktif dalam draft." };
  }

  // 3. Call existing addPurchase() — the ONLY path to inventory
  try {
    await useInventoryStore.getState().addPurchase(invoice);

    // 4. Mark draft as completed
    draftStore.updateDraftStatus(draftId, "completed");

    return { success: true, invoiceNumber: invoice.invoiceNumber };
  } catch (err) {
    // addPurchase() failed — mark draft as has_error for retry
    draftStore.updateDraftStatus(draftId, "has_error");
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan pembelian.",
    };
  }
}

/**
 * Pre-flight check: returns whether draft can be confirmed without executing.
 */
export function canConfirm(draftId: string): {
  ready: boolean;
  reason: string | null;
  itemCount: number;
} {
  const draftStore = usePurchaseDraftStore.getState();
  const draft = draftStore.getDraft(draftId);

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
