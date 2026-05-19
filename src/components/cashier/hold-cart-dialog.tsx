"use client";

import { useState, useRef, useEffect } from "react";
import { useHoldCartStore } from "@/store/hold-cart-store";
import { X } from "lucide-react";

interface HoldCartDialogProps {
  open: boolean;
  onClose: () => void;
  cartItemCount: number;
}

export function HoldCartDialog({
  open,
  onClose,
  cartItemCount,
}: HoldCartDialogProps) {
  const { holdCart } = useHoldCartStore();
  const [customerName, setCustomerName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCustomerName("");
      // Auto-focus input after mount
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    if (cartItemCount === 0) return;
    const ok = holdCart(customerName.trim());
    if (ok) {
      onClose();
      // Auto-open hold list so user can see the saved transaction
      useHoldCartStore.getState().openHoldList();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
        onKeyDown={handleKeyDown}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            Tahan Transaksi
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-sm text-neutral-500">
          {cartItemCount} item akan disimpan. Masukkan nama pelanggan
          (opsional).
        </p>

        <input
          ref={inputRef}
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nama pelanggan…"
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:placeholder-neutral-500"
        />

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={cartItemCount === 0}
            className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Simpan
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] text-neutral-400">
          Esc untuk batal · Enter untuk simpan
        </p>
      </div>
    </div>
  );
}
