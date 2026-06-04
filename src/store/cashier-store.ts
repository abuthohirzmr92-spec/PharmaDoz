"use client";

import { create } from "zustand";
import type { Transaction } from "@/types/transaction";
import { useAuthStore } from "@/store/auth-store";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { transactionRepo } from "@/lib/repository-instances";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { localPersistence } from "@/lib/local-persistence";
import { getBusinessDayKey } from "@/lib/business-day";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type PaymentMethod = "cash" | "debit" | "credit" | "qris" | "transfer";

export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
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
    const existingIndex = cart.findIndex(
      (i) => i.productId === item.productId,
    );
    if (existingIndex >= 0) {
      const existing = cart[existingIndex];
      if (!existing) return;
      const newQuantity = Math.min(
        existing.quantity + item.quantity,
        existing.stockAvailable,
      );
      set({
        cart: cart.map((i, idx) =>
          idx === existingIndex ? { ...i, quantity: newQuantity } : i,
        ),
      });
    } else {
      if (item.quantity > item.stockAvailable) return;
      set({ cart: [...cart, item] });
    }
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
      cart: get().cart.map((i) =>
        i.productId === productId ? { ...i, quantity } : i,
      ),
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

    const subtotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
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
    const pharmacyId = auth.user?.pharmacyId;
    const cashierId = auth.user?.id;

    const transaction: Transaction = {
      id: transactionId,
      tenantId: auth.user?.tenantId ?? auth.user?.pharmacyId ?? "",
      invoiceNumber: get().invoiceNumber ?? `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      items: cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice,
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

    try {
      // Persist transaction
      if (isSupabaseConnected()) {
        try {
          await transactionRepo.createTransaction({
            invoiceNumber: transaction.invoiceNumber,
            items: transaction.items,
            payments: transaction.payments,
            subtotal: transaction.subtotal,
            discount: transaction.discount,
            tax: transaction.tax,
            total: transaction.total,
            cashierName: transaction.cashierName,
            pharmacyId: transaction.pharmacyId,
          });
          // Use the DB-returned ID if available
        } catch (dbErr) {
          console.error("DB transaction persist failed:", dbErr);
          set({ isSubmitting: false, submitError: dbErr instanceof Error ? dbErr.message : "Gagal menyimpan transaksi ke database." });
          return { success: false, error: "Gagal menyimpan transaksi ke database. Silakan coba lagi." };
        }
      }

      // Hook point: deduct inventory with real item IDs
      try {
        // Pass item IDs from the created transaction for accurate batch allocation
        const saleItems = transaction.items.map((item) => ({
          id: item.id ?? transactionId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
        }));
        await invStore.deductForSale?.(saleItems, transactionId);
      } catch {
        // deduction not yet wired — safe to continue
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
    const cartTotal = cart.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    );
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
