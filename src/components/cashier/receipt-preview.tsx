"use client";

import { Printer, Receipt, X } from "lucide-react";
import { useCashierStore } from "@/store/cashier-store";

export interface ReceiptPreviewProps {
  open: boolean;
  onClose: () => void;
  invoiceNumber: string | null;
}

function formatCurrency(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

function getPaymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    cash: "Tunai", debit: "Debit", credit: "Kredit", qris: "QRIS", transfer: "Transfer",
  };
  return map[method] ?? method;
}

export function ReceiptPreview({
  open,
  onClose,
  invoiceNumber,
}: ReceiptPreviewProps) {
  const { cart, payments, resetCashier, isSubmitting } = useCashierStore();

  // Loading state while transaction is being saved
  if (isSubmitting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Menyimpan transaksi...
          </p>
        </div>
      </div>
    );
  }

  if (!open) return null;

  const cartTotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const paymentTotal = payments.reduce((s, p) => s + p.amount, 0);
  const change = paymentTotal - cartTotal;
  const now = new Date();
  const timeStr = now.toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const handlePrint = () => {
    window.print();
  };

  const handleNewTransaction = () => {
    resetCashier();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:bg-white print:fixed print:inset-auto">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white shadow-lg print:shadow-none print:border-none dark:border-neutral-800 dark:bg-neutral-900 print:dark:bg-white print:dark:text-black"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-2">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-50 print:text-black">
              Apotek Sehat
            </h2>
            <p className="text-[10px] text-neutral-500">{timeStr}</p>
            {invoiceNumber && (
              <p className="mt-0.5 text-[11px] font-mono text-neutral-600 dark:text-neutral-400 print:text-neutral-700">
                {invoiceNumber}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 print:hidden dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5">
          <Receipt className="mx-auto my-2 h-8 w-8 text-brand-600 print:text-black" />
        </div>

        {/* Items */}
        <div className="mx-5 divide-y divide-neutral-100 border-y border-neutral-200 py-2 dark:divide-neutral-800 dark:border-neutral-700 print:border-gray-300">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="flex items-center justify-between py-1.5 text-sm"
            >
              <span className="text-neutral-700 dark:text-neutral-300 print:text-black">
                {item.productName}
                <span className="ml-1 text-xs text-neutral-400 print:text-neutral-500">
                  x{item.quantity}
                </span>
              </span>
              <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-50 print:text-black">
                {formatCurrency(item.quantity * item.unitPrice)}
              </span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="px-5 py-3 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500 dark:text-neutral-400 print:text-neutral-600">Subtotal</span>
            <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-50 print:text-black">
              {formatCurrency(cartTotal)}
            </span>
          </div>

          {payments.map((p, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-neutral-500 dark:text-neutral-400 print:text-neutral-600">
                {getPaymentMethodLabel(p.method)}
              </span>
              <span className="tabular-nums text-neutral-900 dark:text-neutral-50 print:text-black">
                {formatCurrency(p.amount)}
              </span>
            </div>
          ))}

          {change > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 dark:text-neutral-400 print:text-neutral-600">Kembalian</span>
              <span className="font-medium tabular-nums text-green-600 print:text-green-700">
                {formatCurrency(change)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-neutral-200 pt-2 mt-1 dark:border-neutral-700 print:border-gray-400">
            <span className="font-semibold text-neutral-900 dark:text-neutral-50 print:text-black">
              Total Dibayar
            </span>
            <span className="font-bold tabular-nums text-brand-600 print:text-black">
              {formatCurrency(paymentTotal)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5 pt-1 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak
          </button>
          <button
            onClick={handleNewTransaction}
            className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Transaksi Baru
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReceiptPreview;
