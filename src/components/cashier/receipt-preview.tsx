"use client";

import { useMemo } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
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

      {/* SCREEN LAYER — preview modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
        <div className="w-full max-w-[200px] rounded-lg border border-neutral-200 bg-white shadow-lg">
          {/* Close button */}
          <div className="flex justify-end px-2 pt-2">
            <button onClick={onClose} className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Receipt content */}
          <div className="px-3 pb-3 text-[9px] font-mono text-neutral-800 leading-tight">
            <div className="text-center mb-2">
              <div className="text-[11px] font-bold">{pharmacyName}</div>
              {address && <div className="text-[8px] text-neutral-500">{address}</div>}
            </div>

            <div className="flex justify-between text-[8px] text-neutral-500 mb-1">
              <span>{invoiceNumber ?? "—"}</span>
              <span>{dateStr} {timeStr}</span>
            </div>

            <div className="border-t border-neutral-300 pt-1 mt-0.5">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[9px] py-0.5">
                  <span className="truncate max-w-[100px]">{item.productName}</span>
                  <span className="tabular-nums">
                    {item.quantity} × {Math.round(item.unitPrice).toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>

            {payments.length > 0 && (
              <div className="border-t border-neutral-200 pt-0.5 mt-0.5">
                {payments.map((p, idx) => {
                  const method = getPaymentMethodLabel(p.method);
                  const walletName = getWalletName((p as any).walletId);
                  return (
                    <div key={idx} className="flex justify-between text-[8px] text-neutral-500">
                      <span>
                        {method}{walletName ? ` (${walletName})` : ""}
                      </span>
                      <span className="tabular-nums">{Math.round(p.amount).toLocaleString("id-ID")}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-neutral-300 pt-0.5 mt-0.5 text-[10px]">
              <span>TOTAL</span>
              <span className="tabular-nums">{Math.round(cartTotal).toLocaleString("id-ID")}</span>
            </div>
            <div className="text-center mt-2 text-[8px] text-neutral-400">--- Terima Kasih ---</div>
          </div>

          {/* Buttons */}
          <div className="flex gap-1.5 px-3 pb-3">
            <button onClick={handlePrint}
              className="flex items-center gap-1 rounded border border-neutral-300 px-2 py-1.5 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50">
              <Printer className="h-3 w-3" />Cetak
            </button>
            <BluetoothPrintButton
              printData={escposData}
              onPrinted={handleBluetoothPrinted}
            />
            <button onClick={handleNew}
              className="flex-1 rounded bg-brand-600 px-3 py-1.5 text-[10px] font-medium text-white hover:bg-brand-700">
              Transaksi Baru
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ReceiptPreview;
