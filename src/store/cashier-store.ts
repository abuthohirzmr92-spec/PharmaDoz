"use client";

import { create } from "zustand";
import type { Transaction } from "@/types/transaction";
import { useAuthStore } from "@/store/auth-store";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { useBranchStore } from "@/store/branch-store";
import { transactionRepo } from "@/lib/repository-instances";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { localPersistence } from "@/lib/local-persistence";
import { getBusinessDayKey } from "@/lib/business-day";
import { logActivity } from "@/lib/audit/activity-logger";
import { normalizeRupiah } from "@/lib/money/normalize-rupiah";
import type { AllocationDraft, PriceSnapshot } from "@/lib/cashier/types";
import { CheckoutSessionService } from "@/services/checkout-session.service";
import { createBatchProvider } from "@/lib/cashier/adapters/batch-provider.adapter";
import { createBatchPriceProvider } from "@/lib/cashier/adapters/batch-price-provider.adapter";
import { createInventorySnapshotProvider } from "@/lib/cashier/adapters/inventory-snapshot-provider.adapter";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type PaymentMethod = "cash" | "debit" | "credit" | "qris" | "transfer";

// ─── Legacy re-export (external consumers may still reference this) ───
// AllocationSnapshot REMOVED in V10.3 — replaced by AllocationDraft + PriceSnapshot.
// If any external code still imports AllocationSnapshot, update to:
//   allocation data   → AllocationDraft (from @/lib/cashier/types)
//   pricing data      → PriceSnapshot (from @/lib/cashier/types)

export interface CartItem {
  productId: string;
  productName: string;

  // ── Canonical (V8) — Single Source of Truth ──
  baseQuantity: number;      // ALWAYS Base Unit (e.g., 200 Tablet)
  baseUnitPrice: number;     // ALWAYS Per Base Unit (e.g., 1500/Tablet)
  selectedUnitCode?: string; // FK → product_unit_levels.unit_code

  // ── Allocation Draft (V10.2) — Canonical allocation ──
  /** Pure allocation (NO sellingPrice). Built by AllocationBuilder. */
  allocationDraft?: AllocationDraft;

  // ── Price Snapshot (V10.3) — Canonical pricing ──
  /** Pricing breakdown (sellingPrice lives HERE). Built by PricingEngine. */
  priceSnapshot?: PriceSnapshot;

  // ── Legacy (deprecated — removed in V11.0) ──
  /** @deprecated Use baseQuantity */
  quantity: number;
  /** @deprecated Use baseUnitPrice */
  unitPrice: number;
  /** @deprecated Use selectedUnitCode */
  selectedUnit?: string;
  /** @deprecated Use resolveUnitDisplay() */
  displayQuantity?: number;

  batchNumber?: string;
  stockAvailable: number;
}

export interface Payment {
  amount: number;
  method: PaymentMethod;
  ref?: string;
  walletId?: string;
}

/* ------------------------------------------------------------------ */
/*  State interface                                                    */
/* ------------------------------------------------------------------ */

interface CashierState {
  /* Cart */
  cart: CartItem[];
  /** Current active sale (null until createSale is called) */
  currentSaleId: string | null;
  invoiceNumber: string | null;

  /* Payment */
  payments: Payment[];

  /* UI */
  isPaymentModalOpen: boolean;
  isReceiptOpen: boolean;
  isSubmitting: boolean;
  searchQuery: string;
  submitError: string | null;
  lastSubmittedId: string | null;
  /** Hash of cart items at last submission (for duplicate detection) */
  lastSubmittedCartHash: string | null;

  /* Actions -- cart */
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setSearchQuery: (query: string) => void;

  /* Actions -- sale */
  setCurrentSale: (saleId: string, invoiceNumber: string) => void;
  finalizeTransaction: () => Promise<{ success: boolean; transactionId?: string; error?: string }>;

  /* Actions -- payment */
  addPayment: (payment: Payment) => void;
  removePayment: (index: number) => void;

  /* Actions -- UI */
  openPaymentModal: () => void;
  closePaymentModal: () => void;
  openReceipt: () => void;
  closeReceipt: () => void;
  setSubmitting: (v: boolean) => void;
  clearSubmitError: () => void;

  /** Reset everything back to fresh state */
  resetCashier: () => void;
}

/* ------------------------------------------------------------------ */
/*  Store                                                             */
/* ------------------------------------------------------------------ */

export const useCashierStore = create<CashierState>()((set, get) => ({
  /* ---- initial state ---- */
  cart: [],
  currentSaleId: null,
  invoiceNumber: null,
  payments: [],
  isPaymentModalOpen: false,
  isReceiptOpen: false,
  isSubmitting: false,
  searchQuery: "",
  submitError: null,
  lastSubmittedId: null,
  lastSubmittedCartHash: null,

  /* ---- cart actions ---- */

  addToCart: (item) => {
    const { cart } = get();
    // Cart is the single source of transaction editing.
    // addToCart ONLY inserts NEW products — never increments existing ones.
    // Quantity editing happens exclusively via updateCartQuantity.
    const alreadyExists = cart.some((i) => i.productId === item.productId);
    if (alreadyExists) return;
    if (item.quantity > item.stockAvailable) return;
    set({ cart: [...cart, item] });
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter((i) => i.productId !== productId) });
  },

  updateCartQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      set({ cart: get().cart.filter((i) => i.productId !== productId) });
      return;
    }
    set({
      cart: get().cart.map((i) => {
        if (i.productId !== productId) return i;
        // V3 P0C — keep baseQuantity in sync with display quantity
        const ratio = i.quantity > 0 ? (i.baseQuantity ?? i.quantity) / i.quantity : 1;
        return { ...i, quantity, baseQuantity: Math.round(quantity * ratio) };
      }),
    });
  },

  clearCart: () => set({ cart: [], payments: [] }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  /* ---- sale actions ---- */

  setCurrentSale: (saleId, invoiceNumber) =>
    set({ currentSaleId: saleId, invoiceNumber }),

  finalizeTransaction: async () => {
    const { cart, payments } = get();
    const auth = useAuthStore.getState();
    const txnStore = useTransactionStore.getState();
    const invStore = useInventoryStore.getState();

    // Validate
    if (cart.length === 0) {
      return { success: false, error: "Keranjang kosong." };
    }

    const subtotal = normalizeRupiah(cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0));
    const paymentTotal = payments.reduce((s, p) => s + p.amount, 0);

    if (paymentTotal < subtotal) {
      return { success: false, error: "Pembayaran belum mencukupi total." };
    }

    // --- Duplicate prevention via cart hash ---
    const cartHash = cart
      .map((i) => `${i.productId}:${i.quantity}`)
      .sort()
      .join(',');
    const { lastSubmittedId, lastSubmittedCartHash } = get();

    // Same cart already submitted successfully — this is a duplicate call
    if (lastSubmittedId && lastSubmittedCartHash === cartHash) {
      if (txnStore.transactions.some((t) => t.id === lastSubmittedId)) {
        return { success: true, transactionId: lastSubmittedId };
      }
      // Previous attempt failed — fall through to retry with same ID
    }

    // Cart changed since last attempt → clear old ID so a new one is generated
    if (lastSubmittedId && lastSubmittedCartHash !== cartHash) {
      set({ lastSubmittedId: null, lastSubmittedCartHash: null });
    }

    // Determine transaction ID: reuse if same-cart retry, otherwise generate new
    const transactionId =
      lastSubmittedId && lastSubmittedCartHash === cartHash
        ? lastSubmittedId
        : typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `tx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    // Final safety net: if this ID already lives in the store, skip
    if (txnStore.transactions.some((t) => t.id === transactionId)) {
      return { success: true, transactionId };
    }

    set({
      isSubmitting: true,
      submitError: null,
      lastSubmittedId: transactionId,
      lastSubmittedCartHash: cartHash,
    });

    // Build transaction
    const now = new Date().toISOString();
    const cashierName = auth.user?.displayName ?? "Kasir";
    const activeBranch = useBranchStore.getState().activeBranch;
    if (!activeBranch?.id) {
      set({ isSubmitting: false, submitError: "Cabang aktif harus dipilih sebelum membuat transaksi." });
      return { success: false, error: "Cabang aktif harus dipilih sebelum membuat transaksi." };
    }
    const pharmacyId = activeBranch.id;
    const cashierId = auth.user?.id;

    const transaction: Transaction = {
      id: transactionId,
      tenantId: auth.user?.tenantId ?? auth.user?.pharmacyId ?? "",
      invoiceNumber: get().invoiceNumber ?? `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      // V3 P0B — send BASE quantity to FEFO (display qty retained for receipt)
      items: cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.baseQuantity ?? item.quantity,
        unitPrice: item.unitPrice,
        subtotal: normalizeRupiah((item.baseQuantity ?? item.quantity) * item.unitPrice),
      })),
      payments: payments.map((p) => ({
        amount: p.amount,
        method: p.method,
        ref: p.ref,
        walletId: p.walletId,
      })),
      subtotal,
      discount: 0,
      tax: 0,
      total: subtotal,
      cashierName,
      pharmacyId,
      cashierId,
      status: "completed",
      createdAt: now,
    };

    // V10.4 — Dual-write: run CheckoutSessionService in parallel (development only)
    if (process.env.NODE_ENV === "development" && cart.some((i) => i.allocationDraft && i.priceSnapshot)) {
      try {
        // Use adapters over the existing store batches (inject via adapter, not direct store access)
        const batches = useInventoryStore.getState().batches;
        const svc = new CheckoutSessionService(
          createBatchProvider(batches),
          createBatchPriceProvider(batches),
          createInventorySnapshotProvider(batches),
        );

        // Run service pipeline for the first item (single-product checkout)
        const firstItem = cart[0]!;
        let session = svc.createSession({
          cartId: get().currentSaleId ?? "unknown",
          tenantId: auth.user?.tenantId ?? "",
          branchId: pharmacyId,
          cashierId: cashierId ?? "unknown",
        });

        session = svc.allocateInventory(session, firstItem.productId, firstItem.baseQuantity ?? firstItem.quantity);
        session = svc.calculatePricing(session);
        session = svc.validate(session);

        // Validate allocation, pricing, AND validation — not just total
        const comparisons: string[] = [];

        // Allocation comparison
        if (session.allocationDraft && firstItem.allocationDraft) {
          const svcTotal = session.allocationDraft.totalAllocated;
          const cartTotal = firstItem.allocationDraft.totalAllocated;
          if (svcTotal !== cartTotal) {
            comparisons.push(`ALLOC: service=${svcTotal} cart=${cartTotal}`);
          }
        }

        // Pricing comparison
        if (session.priceSnapshot && firstItem.priceSnapshot) {
          const svcGrand = session.priceSnapshot.grandTotal;
          const cartGrand = firstItem.priceSnapshot.grandTotal;
          if (svcGrand !== cartGrand) {
            comparisons.push(`PRICE: service=${svcGrand} cart=${cartGrand}`);
          }
        }

        // Validation result
        if (session.validationResult) {
          if (session.validationResult.status !== "VALID") {
            comparisons.push(`VALIDATION: ${session.validationResult.status} (${session.validationResult.issues.length} issues)`);
          }
        }

        // Freeze + total comparison
        if (session.validationResult?.status === "VALID") {
          session = svc.freeze(
            session,
            cart.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              baseQuantity: i.baseQuantity ?? i.quantity,
              baseUnitPrice: i.baseUnitPrice ?? i.unitPrice,
              selectedUnitCode: i.selectedUnitCode,
              allocationDraft: i.allocationDraft,
              priceSnapshot: i.priceSnapshot,
            })),
            payments.map((p) => ({ amount: p.amount, method: p.method, ref: p.ref, walletId: p.walletId })),
            transactionId,
            transaction.invoiceNumber,
            cashierName,
          );

          if (session.transactionSnapshot) {
            const snapTotal = session.transactionSnapshot.total;
            if (snapTotal !== subtotal) {
              comparisons.push(`TOTAL: snapshot=${snapTotal} store=${subtotal}`);
            }
          }
        }

        if (comparisons.length > 0) {
          console.warn("[V10.4 DUAL-WRITE] Differences detected:", comparisons.join(" | "));
        }
      } catch (svcErr) {
        console.warn("[V10.4 DUAL-WRITE] Service path failed (store path unaffected):", svcErr);
      }
    }

    try {
      // Persist transaction — capture DB-returned object with real IDs
      let dbTransaction: Transaction | null = null;
      if (isSupabaseConnected()) {
        try {
          const createPayload = {
            invoiceNumber: transaction.invoiceNumber,
            items: transaction.items,
            payments: transaction.payments,
            subtotal: transaction.subtotal,
            discount: transaction.discount,
            tax: transaction.tax,
            total: transaction.total,
            cashierName: transaction.cashierName,
            pharmacyId: transaction.pharmacyId,
          };
          dbTransaction = await transactionRepo.createTransaction(createPayload);
          // Use the DB-returned ID (dbTransaction.id) for subsequent operations
        } catch (dbErr) {
          console.error("DB transaction persist failed:", dbErr);
          set({ isSubmitting: false, submitError: dbErr instanceof Error ? dbErr.message : "Gagal menyimpan transaksi ke database." });
          return { success: false, error: "Gagal menyimpan transaksi ke database. Silakan coba lagi." };
        }
      }

      // FEFO allocation + inventory deduction + sale_batch_allocations
      // V3 P1E — explicit allocation status tracking
      let allocationStatus: "created" | "failed" | "skipped_offline" | "skipped_demo" | "unknown" = "unknown";
      const isDb = isSupabaseConnected();
      const isDemo = useInventoryStore.getState().isDemoMode;
      try {
        const realTxnId = dbTransaction?.id ?? transactionId;
        const realItems = (dbTransaction?.items ?? transaction.items).map((item) => ({
          id: item.id ?? realTxnId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
        }));
        await invStore.deductForSale(realItems, realTxnId);
        // deductForSale succeeded — allocation status depends on environment
        if (isDb) {
          allocationStatus = "created";
        } else if (isDemo) {
          allocationStatus = "skipped_demo";
        } else {
          allocationStatus = "skipped_offline";
        }
      } catch (err) {
        console.error("[TXN-TRACE] STEP 8 FAILED:", err);
        allocationStatus = "failed";
        set({ isSubmitting: false, submitError: err instanceof Error ? err.message : "Gagal memproses inventori." });
        return { success: false, error: "Gagal memproses inventori. Silakan coba lagi." };
      }

      // Add to transaction store
      txnStore.addTransaction(transaction);

      // If offline, enqueue to sync queue for later replay
      if (!isSupabaseConnected()) {
        localPersistence.enqueue({
          businessDay: getBusinessDayKey(),
          type: "transaction",
          payload: transaction,
        }).catch(() => { /* best-effort */ });
      }

      set({ isSubmitting: false, submitError: null });
      // Log to activity trail (non-blocking)
      logActivity({
        action: "sale.created", resourceType: "transaction", resourceId: transactionId,
        reference: transaction.invoiceNumber,
        metadata: {
          total: transaction.subtotal,
          itemCount: cart.length,
          paymentMethod: payments[0]?.method,
          cashierName: transaction.cashierName,
          // V3 P1E — explicit allocation status
          allocationStatus,
        },
      }).catch(() => {});
      return { success: true, transactionId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan transaksi.";
      set({ isSubmitting: false, submitError: message });
      return { success: false, error: message };
    }
  },

  /* ---- payment actions ---- */

  addPayment: (payment) => {
    const { cart, payments } = get();
    const cartTotal = normalizeRupiah(cart.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    ));
    const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
    if (paymentTotal + payment.amount > cartTotal) return;
    set({ payments: [...payments, payment] });
  },

  removePayment: (index) => {
    set({ payments: get().payments.filter((_, i) => i !== index) });
  },

  /* ---- UI actions ---- */

  openPaymentModal: () => set({ isPaymentModalOpen: true }),
  closePaymentModal: () => set({ isPaymentModalOpen: false }),
  openReceipt: () => set({ isReceiptOpen: true }),
  closeReceipt: () => set({ isReceiptOpen: false }),
  setSubmitting: (v) => set({ isSubmitting: v }),

  clearSubmitError: () => set({ submitError: null }),

  resetCashier: () =>
    set({
      cart: [],
      currentSaleId: null,
      invoiceNumber: null,
      payments: [],
      isPaymentModalOpen: false,
      isReceiptOpen: false,
      isSubmitting: false,
      searchQuery: "",
      submitError: null,
      lastSubmittedId: null,
      lastSubmittedCartHash: null,
    }),
}));
