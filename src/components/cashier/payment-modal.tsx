"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { X, Wallet, Banknote, CreditCard, Smartphone, Building2, Landmark, AlertCircle } from "lucide-react";
import { useCashierStore, type PaymentMethod } from "@/store/cashier-store";
import { useWalletStore } from "@/store/wallet-store";
import { cn } from "@/lib/cn";
import { normalizeRupiah } from "@/lib/money/normalize-rupiah";

export interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  cartTotal: number;
}

/* ------------------------------------------------------------------ */
/*  Quick nominal helpers                                             */
/* ------------------------------------------------------------------ */

const QUICK_NOMINALS = [
  { label: "Uang Pas", value: -1 },
  { label: "Rp 20.000", value: 20_000 },
  { label: "Rp 50.000", value: 50_000 },
  { label: "Rp 100.000", value: 100_000 },
  { label: "Rp 200.000", value: 200_000 },
] as const;

const METHOD_OPTIONS: { method: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { method: "cash", label: "Tunai", icon: Banknote },
  { method: "debit", label: "Debit", icon: CreditCard },
  { method: "qris", label: "QRIS", icon: Smartphone },
  { method: "transfer", label: "Transfer", icon: Building2 },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function PaymentModal({ open, onClose, cartTotal }: PaymentModalProps) {
  const {
    addPayment,
    closePaymentModal,
    openReceipt,
    finalizeTransaction,
    isSubmitting,
    submitError,
    clearSubmitError,
  } = useCashierStore();
  const { wallets, loadWallets } = useWalletStore();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [walletId, setWalletId] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState("");

  // Bank/digital wallets for transfer destination
  const bankWallets = useMemo(
    () => wallets.filter((w) => !w.isArchived && w.isActive && (w.type === "bank" || w.type === "digital")),
    [wallets],
  );

  // Reset state each time modal opens
  useEffect(() => {
    if (open) {
      setAmount("");
      setMethod("cash");
      setWalletId("");
      setLocalError("");
      clearSubmitError();
      loadWallets();
      const timer = setTimeout(() => amountRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open, clearSubmitError, loadWallets]);

  // Auto-select first bank wallet when switching to transfer
  useEffect(() => {
    if (method === "transfer" && bankWallets.length > 0 && !walletId) {
      const first = bankWallets[0];
      if (first) setWalletId(first.id);
    }
  }, [method, bankWallets, walletId]);

  if (!open) return null;

  const parsedAmount = Number(amount) || 0;
  // Single Source of Truth: cartTotal — no rounding
  const change = parsedAmount - cartTotal;
  const isExact = parsedAmount === cartTotal && parsedAmount > 0;
  const isOver = change > 0;
  const isPartial = parsedAmount > 0 && parsedAmount < cartTotal;

  const handleQuickNominal = (value: number) => {
    // Rupiah is always integer — ensure no decimal in "Uang Pas"
    const v = value === -1 ? normalizeRupiah(cartTotal) : value;
    setAmount(String(v));
    amountRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (parsedAmount <= 0) return;
    setLocalError("");

    // Validate: transfer must select a destination wallet
    if (method === "transfer" && !walletId) {
      setLocalError("Pilih rekening tujuan terlebih dahulu.");
      return;
    }

    // If payments from a previous (failed) attempt already cover the total,
    // skip addPayment to avoid duplicating payments on retry
    const { payments } = useCashierStore.getState();
    const existingTotal = payments.reduce((s, p) => s + p.amount, 0);
    if (existingTotal < cartTotal) {
      addPayment({ amount: parsedAmount, method, walletId: method === "transfer" ? walletId : undefined });
    }

    // Keep modal open during persistence so the spinner is visible
    const result = await finalizeTransaction();
    if (result.success) {
      closePaymentModal();
      openReceipt();
      onClose();
    } else {
      setLocalError(result.error ?? "Gagal menyimpan transaksi.");
    }
  };

  const displayError = localError || submitError;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-brand-600" />
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
              Pembayaran
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* Error */}
          {displayError && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              <span className="mt-0.5 shrink-0 text-base leading-none">&bull;</span>
              <span>{displayError}</span>
            </div>
          )}

          {/* Total */}
          <div className="mb-4 text-center">
            <p className="text-xs text-neutral-500">Total Tagihan</p>
            <p className="text-2xl font-bold text-neutral-900 tabular-nums dark:text-neutral-50">
              Rp {Math.round(cartTotal).toLocaleString("id-ID")}
            </p>
          </div>

          {/* Quick nominals */}
          <div className="mb-4 flex flex-wrap gap-2">
            {QUICK_NOMINALS.map((n) => (
              <button
                key={n.label}
                onClick={() => handleQuickNominal(n.value)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  "border-neutral-200 text-neutral-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
                  "dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-brand-700 dark:hover:bg-brand-950 dark:hover:text-brand-300",
                )}
              >
                {n.label}
              </button>
            ))}
          </div>

          {/* Amount input */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Jumlah Dibayar
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                Rp
              </span>
              <input
                ref={amountRef}
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0"
                min={0}
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-right text-lg font-semibold tabular-nums placeholder-neutral-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-600"
              />
            </div>
          </div>

          {/* Change / remaining info */}
          {parsedAmount > 0 && (
            <div
              className={cn(
                "mt-3 rounded-lg px-3 py-2 text-center text-sm font-medium",
                isExact && "bg-success/10 text-success",
                isOver && "bg-success/10 text-success",
                isPartial && "bg-warning/10 text-warning",
              )}
            >
              {isExact && "Uang pas — tidak ada kembalian."}
              {isOver &&
                `Kembalian: Rp ${Math.round(change).toLocaleString("id-ID")}`}
              {isPartial &&
                `Kurang: Rp ${Math.round(-change).toLocaleString("id-ID")}`}
            </div>
          )}

          {/* Payment method */}
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-medium text-neutral-500">
              Metode Pembayaran
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {METHOD_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.method}
                    onClick={() => setMethod(opt.method)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2 text-[10px] font-medium transition-colors",
                      method === opt.method
                        ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-300"
                        : "border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wallet selector — visible only for Transfer payments */}
          {method === "transfer" && (
            <div className="border-t border-neutral-100 px-5 py-3 dark:border-neutral-800">
              <p className="mb-1.5 text-[10px] font-medium text-neutral-500">
                Rekening Tujuan
              </p>
              {bankWallets.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Belum ada rekening bank. Silakan tambahkan kantong bank terlebih dahulu.
                </div>
              ) : (
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
                >
                  {bankWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.type === "digital" ? "(Digital)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={parsedAmount <= 0 || isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {isSubmitting
              ? "Menyimpan..."
              : parsedAmount > 0
                ? `Bayar Rp ${Math.round(parsedAmount).toLocaleString("id-ID")}`
                : "Bayar"}
          </button>
        </div>

        <p className="pb-3 text-center text-[10px] text-neutral-400">
          Esc untuk batal · Enter untuk bayar
        </p>
      </div>
    </div>
  );
}

export default PaymentModal;
