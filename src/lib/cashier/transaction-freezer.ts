// =================================================================
// TransactionFreezer — Pure Domain Service (V10.4)
// 🔒 Architecture Baseline v1.0 (LOCKED)
//
// Generates immutable TransactionSnapshot from cart + session data.
// PURE FUNCTION — receives ALL data as parameters.
//
// Responsibility: Freeze → TransactionSnapshot (immutable)
// NEVER: inventory access, DB write, store mutation, React, Zustand
//
// Architecture Rules:
//   ADR-001  — CheckoutSession Aggregate Root (Freezer is its final step)
//   Inv-5    — Transaction immutable setelah freeze
//   Inv-17   — Frozen transaction tidak boleh dimodifikasi
//   Princ-3  — Pure Domain Services
//   Princ-4  — Stateless Domain Logic
// =================================================================

import type {
  TransactionSnapshot,
  FrozenTransactionItem,
  FrozenBatchAllocation,
  FrozenPayment,
  FreezeInput,
} from "./types";
import { normalizeRupiah } from "@/lib/money/normalize-rupiah";

// ─── Helpers ───

let _seq = 0;
function generateSnapshotId(): string {
  _seq++;
  return `snap-${Date.now()}-${_seq}`;
}

// ─── Freezer ───

/**
 * Freeze cart items into an immutable TransactionSnapshot.
 *
 * Pure function — deterministic, zero side effects.
 * After this call, the returned snapshot CANNOT be modified.
 * Inventory deduction and DB persistence are handler concerns,
 * NOT Freezer concerns.
 *
 * @param input — FreezeInput (cart items, payments, metadata)
 * @returns TransactionSnapshot — immutable, all monetary values integer
 *
 * @example
 * const snapshot = freeze({
 *   cartItems: [...],
 *   payments: [...],
 *   transactionId: "tx-123",
 *   invoiceNumber: "INV-001",
 *   cashierName: "Kasir A",
 *   pharmacyId: "branch-1",
 *   cashierId: "user-1",
 * });
 * // snapshot.total = sum of all subtotals - discount + tax
 * // snapshot CANNOT be modified after this call
 */
export function freeze(input: FreezeInput): TransactionSnapshot {
  const {
    cartItems,
    payments,
    transactionId,
    invoiceNumber,
    cashierName,
    pharmacyId,
    cashierId,
  } = input;

  // 1. Freeze each cart item
  const items: FrozenTransactionItem[] = cartItems.map((item) => {
    // Build batch allocations from allocation + pricing data
    const batchAllocations: FrozenBatchAllocation[] = [];
    if (item.allocationDraft && item.priceSnapshot) {
      for (const allocEntry of item.allocationDraft.entries) {
        const priceEntry = item.priceSnapshot.entries.find(
          (p) => p.batchId === allocEntry.batchId,
        );
        if (priceEntry && allocEntry.allocatedQty > 0) {
          batchAllocations.push({
            batchId: allocEntry.batchId,
            batchNumber: priceEntry.batchNumber,
            allocatedQty: allocEntry.allocatedQty,
            sellingPrice: priceEntry.sellingPrice,
            costPrice: priceEntry.costPrice,
          });
        }
      }
    }

    const subtotal = normalizeRupiah(item.baseQuantity * item.baseUnitPrice);

    return {
      productId: item.productId,
      productName: item.productName,
      baseQuantity: item.baseQuantity,
      baseUnitPrice: item.baseUnitPrice,
      selectedUnitCode: item.selectedUnitCode,
      batchAllocations,
      subtotal,
    };
  });

  // 2. Freeze payments
  const frozenPayments: FrozenPayment[] = payments.map((p) => ({
    amount: normalizeRupiah(p.amount),
    method: p.method as FrozenPayment["method"],
    ref: p.ref,
    walletId: p.walletId,
  }));

  // 3. Compute aggregates
  const subtotal = normalizeRupiah(items.reduce((sum, i) => sum + i.subtotal, 0));
  const discount = normalizeRupiah(0);
  const tax = normalizeRupiah(0);
  const total = normalizeRupiah(subtotal - discount + tax);

  // 4. Build immutable snapshot
  const snapshot: TransactionSnapshot = {
    snapshotId: generateSnapshotId(),
    transactionId,
    invoiceNumber,
    items,
    payments: frozenPayments,
    subtotal,
    discount,
    tax,
    total,
    cashierName,
    pharmacyId,
    cashierId,
    frozenAt: new Date().toISOString(),
  };

  return snapshot;
}
