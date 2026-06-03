"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useInventoryStore } from "@/store/inventory-store";
import { useWalletStore } from "@/store/wallet-store";

interface Props {
  open: boolean;
  invoiceId: string;
  remaining: number;
  onClose: () => void;
}

export function InventoryPayInvoiceModal({ open, invoiceId, remaining, onClose }: Props) {
  const { wallets } = useWalletStore();
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer">("transfer");

  // Only operational wallets (exclude cadangan, pengembangan, pemilik)
  const operasional = wallets.filter(
    (w) => !w.isArchived && w.isActive &&
      ((w.settings as any)?.category !== "cadangan") &&
      ((w.settings as any)?.category !== "pengembangan") &&
      ((w.settings as any)?.category !== "pemilik"),
  );

  useEffect(() => {
    if (open) {
      setAmount(String(remaining));
      setWalletId(operasional[0]?.id ?? "");
      setMethod("transfer");
    }
  }, [open, remaining]);

  if (!open) return null;

  const handlePay = async () => {
    const num = parseInt(amount.replace(/\D/g, "")) || 0;
    if (num <= 0) { toast.error("Nominal harus lebih dari 0"); return; }
    const final = Math.min(num, remaining);
    await useInventoryStore.getState().recordPayment(
      invoiceId, final, walletId || undefined, method,
    );
    onClose();
    toast.success("Pembayaran berhasil dicatat.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Bayar Invoice</h3>
          <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-500 mb-4">Sisa tagihan: Rp {remaining.toLocaleString("id-ID")}</p>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Nominal</label>
            <input type="text" inputMode="numeric" value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              onBlur={() => { const v = parseInt(amount.replace(/\D/g, "")) || 0; if (v > remaining) setAmount(String(remaining)); }}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Metode</label>
            <select value={method} onChange={(e) => setMethod(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50">
              <option value="transfer">Transfer</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Kantong Pembayaran</label>
            {operasional.length === 0 ? (
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Belum ada kantong operasional.
              </div>
            ) : (
              <select value={walletId} onChange={(e) => setWalletId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50">
                <option value="">Pilih kantong</option>
                {operasional.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} — Rp {Math.round(w.balance).toLocaleString("id-ID")}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={onClose}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
            Batal
          </button>
          <button onClick={handlePay}
            className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Bayar
          </button>
        </div>
      </div>
    </div>
  );
}
