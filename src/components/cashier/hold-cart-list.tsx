"use client";

import { useHoldCartStore } from "@/store/hold-cart-store";
import { useCashierStore } from "@/store/cashier-store";
import { X, RotateCcw, Trash2, Clock } from "lucide-react";

interface HoldCartListProps {
  open: boolean;
  onClose: () => void;
}

function formatCurrency(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HoldCartList({ open, onClose }: HoldCartListProps) {
  const { heldCarts, restoreHeldCart, removeHeldCart } = useHoldCartStore();
  const cartItemCount = useCashierStore((s) =>
    s.cart.reduce((sum, i) => sum + i.quantity, 0),
  );

  if (!open) return null;

  const handleRestore = (id: string) => {
    if (cartItemCount > 0) {
      const ok = window.confirm(
        "Keranjang aktif akan diganti dengan transaksi yang ditahan. Lanjutkan?",
      );
      if (!ok) return;
    }
    restoreHeldCart(id);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onKeyDown={handleKeyDown}
    >
      <div className="flex w-full max-w-lg max-h-[80vh] flex-col rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
              Transaksi Ditahan
            </h2>
            {cartItemCount > 0 && (
              <p className="mt-0.5 text-xs text-warning">
                Keranjang aktif memiliki {cartItemCount} item — akan diganti
                saat restore.
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {heldCarts.length > 0 ? (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {heldCarts.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium text-neutral-900 dark:text-neutral-50">
                        {h.ref}
                      </span>
                      {h.customerName && (
                        <span className="truncate text-xs text-neutral-500">
                          — {h.customerName}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {h.itemCount} item · {formatCurrency(h.total)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-neutral-400">
                      <Clock className="h-3 w-3" />
                      {formatDate(h.createdAt)}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRestore(h.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950"
                    title="Pulihkan"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => removeHeldCart(h.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-danger dark:hover:bg-red-950/30"
                    title="Hapus"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
              <p className="text-sm text-neutral-500">
                Tidak ada transaksi ditahan
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Gunakan tombol <strong>Tahan</strong> di keranjang untuk menyimpan transaksi
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
          <p className="text-center text-[10px] text-neutral-400">
            Esc untuk tutup
          </p>
        </div>
      </div>
    </div>
  );
}
