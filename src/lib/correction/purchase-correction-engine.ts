// =================================================================
// Purchase Correction Engine — ICorrectionEngine<PurchaseInvoice>
// EEOS V5 — Healthcare Architect Approved
// =================================================================

import type { PurchaseInvoice, PurchaseItem } from "@/types/inventory";
import type {
  ICorrectionEngine,
  ValidationResult,
  BatchConflictResult,
  ApplyResult,
  RollbackResult,
  CorrectionDetail,
  TransactionCorrection,
} from "./correction-types";
import { canBeCorrected } from "./correction-engine";
import { PurchaseInvoiceMetadataContract } from "./metadata-contracts";
import type { PurchaseInvoiceMetadata } from "./metadata-contracts";

// ─── Revisable Fields ───

export const PURCHASE_REVISABLE_FIELDS = [
  { value: "quantity", label: "Qty", dataType: "number" as const },
  { value: "unit_price", label: "Harga Beli", dataType: "number" as const },
  { value: "selling_price", label: "Harga Jual", dataType: "number" as const },
  { value: "discount", label: "Diskon", dataType: "number" as const },
  { value: "tax", label: "Pajak", dataType: "number" as const },
  { value: "expired_date", label: "Expired Date", dataType: "date" as const },
  { value: "batch_number", label: "Batch Number", dataType: "text" as const },
  { value: "storage_area", label: "Storage Area", dataType: "select" as const },
  { value: "notes", label: "Catatan", dataType: "text" as const },
];

export function getRevisableFields(): typeof PURCHASE_REVISABLE_FIELDS {
  return PURCHASE_REVISABLE_FIELDS;
}

// ─── Engine Implementation ───

export class PurchaseCorrectionEngine implements ICorrectionEngine<PurchaseInvoice, CorrectionDetail> {
  readonly module = "purchase_invoice" as const;

  validatePermission(user: { role: string }): ValidationResult {
    const allowedRoles = ["tenant_owner", "admin", "pharmacist"];
    if (!allowedRoles.includes(user.role)) {
      return {
        valid: false,
        reason: "Hanya Owner, Manager, atau Purchasing Supervisor yang dapat merevisi invoice.",
      };
    }
    return { valid: true };
  }

  validateResource(invoice: PurchaseInvoice): ValidationResult {
    if (!invoice) {
      return { valid: false, reason: "Invoice tidak ditemukan." };
    }

    const postedAt = invoice.postedAt ?? invoice.purchaseDate;
    const window = canBeCorrected(postedAt);
    if (!window.allowed) {
      return { valid: false, reason: window.reason };
    }

    return { valid: true, details: { remainingHours: window.remainingHours } };
  }

  validateStock(invoice: PurchaseInvoice, details: CorrectionDetail[]): ValidationResult {
    const qtyChanges = details.filter((d) => d.fieldName === "quantity");
    if (qtyChanges.length === 0) return { valid: true };

    for (const change of qtyChanges) {
      const oldQty = parseInt(change.oldValue, 10);
      const newQty = parseInt(change.newValue, 10);

      if (newQty <= 0) {
        return { valid: false, reason: `Qty tidak boleh 0 atau negatif untuk ${change.productName}.` };
      }

      // Stock validation will be done at apply time with actual batch data
      // Here we only validate the numbers make sense
      if (isNaN(oldQty) || isNaN(newQty)) {
        return { valid: false, reason: `Nilai qty tidak valid untuk ${change.productName}.` };
      }
    }

    return { valid: true };
  }

  validatePayment(invoice: PurchaseInvoice, details: CorrectionDetail[]): ValidationResult {
    // Compute new total
    let newTotal = invoice.totalAmount;

    const qtyChanges = details.filter((d) => d.fieldName === "quantity");
    const priceChanges = details.filter((d) => d.fieldName === "unit_price");

    for (const change of qtyChanges) {
      const item = invoice.items.find((i) => i.id === change.resourceItemId);
      if (item) {
        newTotal = newTotal - item.quantity * item.unitPrice + parseInt(change.newValue, 10) * item.unitPrice;
      }
    }
    for (const change of priceChanges) {
      const item = invoice.items.find((i) => i.id === change.resourceItemId);
      if (item) {
        const qty = item.quantity; // Use original qty (price changes don't include qty)
        newTotal = newTotal - qty * item.unitPrice + qty * parseInt(change.newValue, 10);
      }
    }

    // Check overpayment
    if (newTotal < invoice.paidAmount) {
      const overpayment = invoice.paidAmount - newTotal;
      return {
        valid: true, // Allow but flag
        details: {
          overpayment,
          warning: `Perhatian: Total baru (Rp ${newTotal.toLocaleString("id-ID")}) lebih kecil dari yang sudah dibayar (Rp ${invoice.paidAmount.toLocaleString("id-ID")}). Selisih Rp ${overpayment.toLocaleString("id-ID")} akan menjadi supplier credit.`,
        },
      };
    }

    return { valid: true };
  }

  validateBatchConflict(invoice: PurchaseInvoice, details: CorrectionDetail[]): BatchConflictResult {
    // In production: query sale_batch_allocations for each batch
    // For V1: assume no conflicts (batches can be safely adjusted)
    return { hasConflict: false, strategy: "allow", conflicts: [] };
  }

  computeNewState(invoice: PurchaseInvoice, details: CorrectionDetail[]): PurchaseInvoice {
    const newItems = invoice.items.map((item) => {
      const itemDetail = details.find((d) => d.resourceItemId === item.id);
      if (!itemDetail) return item;

      switch (itemDetail.fieldName) {
        case "quantity":
          return { ...item, quantity: parseInt(itemDetail.newValue, 10) };
        case "unit_price":
          return { ...item, unitPrice: parseInt(itemDetail.newValue, 10) };
        case "selling_price":
          return { ...item, sellingPrice: parseInt(itemDetail.newValue, 10) };
        case "batch_number":
          return { ...item, batchNumber: itemDetail.newValue };
        case "expired_date":
          return { ...item, expiredDate: itemDetail.newValue };
        default:
          return item;
      }
    });

    const newTotal = newItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    return {
      ...invoice,
      items: newItems,
      totalAmount: newTotal,
    };
  }

  /**
   * Apply the correction — ALL business logic lives here.
   * Store only orchestrates: calls this method, then updates UI state.
   *
   * Constitution Article 2: Business Logic Separation
   * Constitution Article 7: No Business Logic In Store
   */
  async applyCorrection(
    invoice: PurchaseInvoice,
    newState: PurchaseInvoice,
    correlationId: string,
  ): Promise<ApplyResult> {
    const correctionId = crypto.randomUUID();
    const nextRevisionNumber = (invoice.revisionNumber ?? 0) + 1;

    // Build metadata per contract
    const changedFields = newState.items
      .map((newItem, i) => {
        const oldItem = invoice.items[i];
        if (!oldItem) return null;
        const fields: string[] = [];
        if (newItem.quantity !== oldItem.quantity) fields.push("quantity");
        if (newItem.unitPrice !== oldItem.unitPrice) fields.push("unit_price");
        if (newItem.sellingPrice !== oldItem.sellingPrice) fields.push("selling_price");
        if (newItem.batchNumber !== oldItem.batchNumber) fields.push("batch_number");
        if (newItem.expiredDate !== oldItem.expiredDate) fields.push("expired_date");
        return fields;
      })
      .flat()
      .filter((f): f is string => f !== null);

    const metadata: PurchaseInvoiceMetadata = {
      invoice_number: invoice.invoiceNumber,
      supplier_id: invoice.supplierId,
      supplier_name: invoice.supplierName,
      total_before: invoice.totalAmount,
      total_after: newState.totalAmount,
      item_count: invoice.items.length,
      changed_fields: [...new Set(changedFields)],
      overpayment_amount: newState.totalAmount < invoice.paidAmount ? invoice.paidAmount - newState.totalAmount : undefined,
      outstanding_amount: newState.totalAmount > invoice.paidAmount ? newState.totalAmount - invoice.paidAmount : undefined,
      contract_version: 1,
    };

    // Validate metadata contract
    PurchaseInvoiceMetadataContract.parse(metadata);

    // Compute batch quantity changes for stock movements
    const batchChanges: Array<{
      batchNumber: string;
      productId: string;
      productName: string;
      qtyChange: number;
    }> = [];

    for (let i = 0; i < newState.items.length; i++) {
      const oldItem = invoice.items[i];
      const newItem = newState.items[i];
      if (!oldItem || !newItem || oldItem.quantity === newItem.quantity) continue;
      batchChanges.push({
        batchNumber: oldItem.batchNumber,
        productId: oldItem.productId,
        productName: oldItem.productName,
        qtyChange: newItem.quantity - oldItem.quantity,
      });
    }

    // Payment validation result
    let paymentAdjustment: { type: string; amount: number } | null = null;
    if (newState.totalAmount < invoice.paidAmount) {
      paymentAdjustment = { type: "supplier_credit", amount: invoice.paidAmount - newState.totalAmount };
    } else if (newState.totalAmount > invoice.paidAmount && invoice.paidAmount > 0) {
      paymentAdjustment = { type: "outstanding", amount: newState.totalAmount - invoice.paidAmount };
    }

    // In V1 demo mode: all business logic computed, return result
    // In production: atomic DB transaction with hooks
    return {
      success: true,
      correctionId,
      newState: {
        ...newState,
        revisionNumber: nextRevisionNumber,
        totalAmount: newState.totalAmount,
      },
      stockMovements: batchChanges.map((bc) =>
        `${bc.productName}: ${bc.qtyChange > 0 ? "+" : ""}${bc.qtyChange}`,
      ),
    };
  }

  async rollbackCorrection(
    invoice: PurchaseInvoice,
    targetCorrection: TransactionCorrection,
  ): Promise<RollbackResult> {
    return {
      success: true,
      correctionId: targetCorrection.id,
      restoredCorrectionNumber: targetCorrection.correctionNumber,
    };
  }
}

// Auto-register
import { registerCorrectionEngine } from "./correction-engine";
registerCorrectionEngine("purchase_invoice", new PurchaseCorrectionEngine());
