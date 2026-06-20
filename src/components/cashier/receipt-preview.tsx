"use client";

import { useMemo } from "react";
import { createPortal } from "react-dom";
import { Printer, X, CheckCircle2 } from "lucide-react";
import { useCashierStore } from "@/store/cashier-store";
import { useAuthStore } from "@/store/auth-store";
import { useBranchStore } from "@/store/branch-store";
import { useTenantBranding } from "@/providers/tenant-brand-provider";
import { useWalletStore } from "@/store/wallet-store";
import { BluetoothPrintButton } from "@/components/cashier/bluetooth-print-button";
import { ReceiptBuilder } from "@/lib/escpos/encoder";

export interface ReceiptPreviewProps {
  open: boolean;
  onClose: () => void;
  invoiceNumber: string | null;
}

function formatCurrency(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

function getPaymentMethodLabel(method: string): string {
  const m: Record<string, string> = { cash: "Tunai", debit: "Debit", credit: "Kredit", qris: "QRIS", transfer: "Transfer" };
  return m[method] ?? method;
}

export function ReceiptPreview({ open, onClose, invoiceNumber }: ReceiptPreviewProps) {
  const { cart, payments, resetCashier, isSubmitting } = useCashierStore();
  const user = useAuthStore((s) => s.user);
  const branches = useBranchStore((s) => s.branches);
  const activeBranch = useBranchStore((s) => s.activeBranch);
  const { branding } = useTenantBranding();
  const walletStore = useWalletStore();

  // Resolve wallet name for transfer payments
  const getWalletName = (walletId?: string) => {
    if (!walletId) return null;
    const w = walletStore.wallets.find((x) => x.id === walletId);
    return w?.name ?? null;
  };

  // ---- ALL data computations MUST be before any early return (Rules of Hooks) ----

  const pharmacyName = branding?.companyName ?? user?.pharmacyName ?? user?.tenantName ?? "Apotek";
  const branch = activeBranch ?? branches[0];
  const address = branding?.address ?? branch?.address ?? "";
  const phone = branding?.phone ?? user?.phone ?? branch?.phone ?? "";
  const logoUrl: string | null = branding?.logoUrl ?? null;
  const receiptFooter =
    branding?.receiptFooter ??
    "Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan";

  const cartTotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const paymentTotal = payments.reduce((s, p) => s + p.amount, 0);
  const change = paymentTotal - cartTotal;

  const now = new Date();
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`;
  const timeStr = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  // Build ESC/POS data for Bluetooth printing
  const escposData = useMemo(() => {
    try {
      const builder = new ReceiptBuilder();
      builder.setStore(pharmacyName, address, phone);
      builder.setInvoice(invoiceNumber ?? "—", `${dateStr} ${timeStr}`, user?.displayName);
      for (const item of cart) {
        builder.addItem(
          item.productName.slice(0, 20),
          item.quantity,
          item.unitPrice,
          item.quantity * item.unitPrice,
        );
      }
      builder.setTotal(cartTotal);
      builder.setPayment(
        payments.map((p) => getPaymentMethodLabel(p.method)).join(", "),
      );
      if (receiptFooter) builder.setFooter(receiptFooter);
      return builder.build();
    } catch {
      return null;
    }
  }, [pharmacyName, address, phone, invoiceNumber, dateStr, timeStr, user?.displayName, cart, cartTotal, payments, receiptFooter]);

  const handlePrint = () => window.print();
  const handleNew = () => { resetCashier(); onClose(); };
  const handleBluetoothPrinted = () => { resetCashier(); onClose(); };

  // ═══════════ RENDER — early returns AFTER all hooks ═══════════

  // Loading state
  if (isSubmitting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="text-sm text-neutral-600">Menyimpan transaksi...</p>
        </div>
      </div>
    );
  }

  if (!open) return null;

  // ---- Receipt content (reused for both screen + print) ----
  const receiptBody = (
    <div style={{ fontFamily: "'Courier New', monospace", fontSize: 10, lineHeight: 1.25, color: "#000", maxWidth: "58mm" }}>
      {/* HEADER */}
      <div style={{ textAlign: "center", marginBottom: 3 }}>
        {logoUrl && (
          <img src={logoUrl} alt={pharmacyName}
            style={{ maxWidth: "40mm", maxHeight: "12mm", margin: "0 auto 2mm", display: "block" }} />
        )}
        <div style={{ fontSize: 12, fontWeight: "bold" }}>{pharmacyName}</div>
        {address && <div style={{ fontSize: 8 }}>{address}</div>}
        {phone && <div style={{ fontSize: 8 }}>Telp: {phone}</div>}
        <div style={{ borderBottom: "1px dashed #000", margin: "2px 0" }} />
      </div>

      {/* INFO */}
      <div style={{ fontSize: 9 }}>
        <div>No : {invoiceNumber ?? "—"}</div>
        <div>Tgl: {dateStr} {timeStr}</div>
        {user?.displayName && <div>Kasir: {user.displayName}</div>}
        <div style={{ borderBottom: "1px dashed #000", margin: "2px 0" }} />
      </div>

      {/* ITEMS */}
      <div style={{ fontSize: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: 1, marginBottom: 2 }}>
          <span style={{ width: "50%" }}>Item</span>
          <span style={{ width: "12%", textAlign: "center" }}>Qty</span>
          <span style={{ width: "18%", textAlign: "right" }}>Harga</span>
          <span style={{ width: "20%", textAlign: "right" }}>Subtotal</span>
        </div>
        {cart.map((item, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
            <span style={{ width: "50%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.productName}</span>
            <span style={{ width: "12%", textAlign: "center" }}>{item.quantity}</span>
            <span style={{ width: "18%", textAlign: "right" }}>{Math.round(item.unitPrice).toLocaleString("id-ID")}</span>
            <span style={{ width: "20%", textAlign: "right" }}>{(item.quantity * item.unitPrice).toLocaleString("id-ID")}</span>
          </div>
        ))}
        <div style={{ borderBottom: "1px dashed #000", margin: "2px 0" }} />
      </div>

      {/* TOTAL */}
      <div style={{ fontSize: 9, marginTop: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 11 }}>
          <span>TOTAL</span>
          <span>{Math.round(cartTotal).toLocaleString("id-ID")}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#555", marginTop: 2 }}>
          <span>Dibayar</span>
          <span>{Math.round(paymentTotal).toLocaleString("id-ID")}</span>
        </div>
        {change > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "#555" }}>
            <span>Kembali</span>
            <span>{Math.round(change).toLocaleString("id-ID")}</span>
          </div>
        )}
      </div>

      {/* PAYMENT METHOD */}
      <div style={{ fontSize: 9, marginTop: 4, paddingTop: 2, borderTop: "1px dashed #000" }}>
        {payments.map((p, idx) => {
          const method = getPaymentMethodLabel(p.method);
          const walletName = getWalletName((p as any).walletId);
          return (
            <div key={idx}>
              {method}{walletName ? ` (${walletName})` : ""}
              {p.ref ? ` - ${p.ref}` : ""}: {Math.round(p.amount).toLocaleString("id-ID")}
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div style={{ textAlign: "center", marginTop: 4, fontSize: 9 }}>
        <div>--- Terima Kasih ---</div>
        <div>{receiptFooter}</div>
      </div>
    </div>
  );

  return (
    <>
      {/* PRINT LAYER — portal to document.body so it's a direct child */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            id="receipt-print-root"
            className="hidden print:block"
            style={{
              width: "58mm",
              margin: "0 auto",
              padding: 0,
            }}
          >
            {receiptBody}
          </div>,
          document.body,
        )}

      {/* SCREEN LAYER — preview modal (desktop optimized) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
        <div className="w-[95%] sm:w-[90%] md:max-w-xl rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
          {/* Close button */}
          <div className="flex justify-end px-4 pt-4">
            <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Success indicator */}
          <div className="flex justify-center -mt-2 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-9 w-9 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* Receipt content */}
          <div className="px-8 pb-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-1">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-50">
                {pharmacyName}
              </h2>
              {address && <p className="text-base text-neutral-500">{address}</p>}
            </div>

            {/* Invoice info */}
            <div className="flex justify-center gap-8 text-base text-neutral-600 dark:text-neutral-400">
              <span>No: <strong className="text-neutral-900 dark:text-neutral-100">{invoiceNumber ?? "—"}</strong></span>
              <span>{dateStr} · {timeStr}</span>
            </div>

            {/* Item list */}
            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 space-y-2">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-baseline text-base">
                  <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[60%]">
                    {item.productName}
                  </span>
                  <span className="tabular-nums text-neutral-600 dark:text-neutral-400">
                    {item.quantity} × {Math.round(item.unitPrice).toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>

            {/* Payment section */}
            {payments.length > 0 && (
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 space-y-1">
                {payments.map((p, idx) => {
                  const method = getPaymentMethodLabel(p.method);
                  const walletName = getWalletName((p as any).walletId);
                  return (
                    <div key={idx} className="flex justify-between text-base text-neutral-600 dark:text-neutral-400">
                      <span>{method}{walletName ? ` (${walletName})` : ""}</span>
                      <span className="tabular-nums">{Math.round(p.amount).toLocaleString("id-ID")}</span>
                    </div>
                  );
                })}
                {change > 0 && (
                  <div className="flex justify-between text-base text-green-600 dark:text-green-400 font-medium">
                    <span>Kembali</span>
                    <span className="tabular-nums">{Math.round(change).toLocaleString("id-ID")}</span>
                  </div>
                )}
              </div>
            )}

            {/* Total */}
            <div className="border-t-2 border-neutral-300 dark:border-neutral-700 pt-4 text-center space-y-1">
              <p className="text-base font-medium text-neutral-500 uppercase tracking-wider">Total</p>
              <p className="text-4xl md:text-5xl font-bold text-brand-600 dark:text-brand-400 tabular-nums">
                {formatCurrency(cartTotal)}
              </p>
            </div>

            {/* Footer */}
            <div className="text-center space-y-2">
              <p className="text-lg text-neutral-400 dark:text-neutral-500 tracking-wide">
                — Terima Kasih —
              </p>
              <p className="text-sm text-neutral-400">{receiptFooter}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 px-8 pb-8">
            <button onClick={handlePrint}
              className="flex items-center gap-2 rounded-2xl border border-neutral-300 px-5 h-16 text-base font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
              <Printer className="h-6 w-6" />Cetak
            </button>
            <BluetoothPrintButton
              printData={escposData}
              onPrinted={handleBluetoothPrinted}
            />
            <button onClick={handleNew}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-brand-600 h-16 text-lg font-semibold text-white hover:bg-brand-700 transition-colors">
              Transaksi Baru
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ReceiptPreview;
