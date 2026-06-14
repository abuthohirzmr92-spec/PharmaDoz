"use client";

import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { useCashierStore } from "@/store/cashier-store";
import { useAuthStore } from "@/store/auth-store";
import { useBranchStore } from "@/store/branch-store";
import { useTenantBranding } from "@/providers/tenant-brand-provider";
import { useWalletStore } from "@/store/wallet-store";

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

function pad(n: number): string { return String(n).padStart(2, "0"); }

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

  // ---- Data (from tenant branding, with fallbacks) ----
  const pharmacyName = branding?.companyName ?? user?.pharmacyName ?? user?.tenantName ?? "Apotek";
  const branch = activeBranch ?? branches[0];
  const address = branding?.address ?? branch?.address ?? "";
  const phone = branding?.phone ?? user?.phone ?? branch?.phone ?? "";

  // Logo — from tenant branding (tenants.settings.logo_url)
  const logoUrl: string | null = branding?.logoUrl ?? null;

  // Footer — from tenant branding, with fallback
  const receiptFooter =
    branding?.receiptFooter ??
    "Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan";

  // ---- Calculations (FIXED) ----
  const cartTotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const paymentTotal = payments.reduce((s, p) => s + p.amount, 0);
  const change = paymentTotal - cartTotal;
  const now = new Date();
  const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const handlePrint = () => window.print();
  const handleNew = () => { resetCashier(); onClose(); };

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
        {branch && <div>Cab : {branch.name}</div>}
        <div>Kasir: {user?.displayName ?? "—"}</div>
      </div>
      <div style={{ borderBottom: "1px dashed #000", margin: "2px 0" }} />

      {/* ITEMS */}
      {cart.map((item) => {
        const lt = item.quantity * item.unitPrice;
        return (
          <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
            <span style={{ flex: "0 0 55%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.productName}
            </span>
            <span style={{ flex: "0 0 10%", textAlign: "center" }}>{item.quantity}</span>
            <span style={{ flex: "0 0 35%", textAlign: "right" }}>{Math.round(lt).toLocaleString("id-ID")}</span>
          </div>
        );
      })}

      <div style={{ borderBottom: "1px solid #000", margin: "2px 0" }} />

      {/* SUMMARY — Subtotal, each payment, change */}
      <div style={{ fontSize: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Subtotal</span><span>{Math.round(cartTotal).toLocaleString("id-ID")}</span>
        </div>
        {payments.map((p, i) => {
          const walletName = p.method === "transfer" ? getWalletName(p.walletId) : null;
          return (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{getPaymentMethodLabel(p.method)}</span><span>{Math.round(p.amount).toLocaleString("id-ID")}</span>
              </div>
              {walletName && (
                <div style={{ fontSize: 7, textAlign: "right" }}>ke {walletName}</div>
              )}
            </div>
          );
        })}
        {change > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Kembalian</span><span>{Math.round(change).toLocaleString("id-ID")}</span>
          </div>
        )}
      </div>

      {/* TOTAL = cartTotal (the actual transaction value, NOT paymentTotal) */}
      <div style={{
        display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 11,
        borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "1px 0", margin: "2px 0"
      }}>
        <span>TOTAL</span><span>{Math.round(cartTotal).toLocaleString("id-ID")}</span>
      </div>

      {/* FOOTER — dynamic from tenant settings */}
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
              padding: "2mm",
              background: "white",
              color: "black",
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
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Receipt content in mini scale */}
          <div className="px-3 pb-3 text-[9px] font-mono text-neutral-800 leading-tight">
            <div className="text-center mb-2">
              <div className="text-[11px] font-bold">{pharmacyName}</div>
              {address && <div className="text-[8px] text-neutral-500">{address}</div>}
            </div>
            <div className="text-center text-[8px] text-neutral-500 mb-1">
              {invoiceNumber} &middot; {dateStr} {timeStr}
            </div>
            {cart.map((item) => (
              <div key={item.productId} className="flex justify-between">
                <span className="truncate max-w-[60%]">{item.productName}</span>
                <span>x{item.quantity}</span>
                <span className="tabular-nums">{Math.round(item.quantity * item.unitPrice).toLocaleString("id-ID")}</span>
              </div>
            ))}
            <div className="border-t border-dashed border-neutral-300 my-1" />
            {payments.map((p, i) => (
              <div key={i} className="flex justify-between text-[8px] text-neutral-500">
                <span>{getPaymentMethodLabel(p.method)}</span>
                <span className="tabular-nums">{Math.round(p.amount).toLocaleString("id-ID")}</span>
              </div>
            ))}
            {change > 0 && (
              <div className="flex justify-between text-[8px] text-neutral-500">
                <span>Kembalian</span><span className="tabular-nums">{Math.round(change).toLocaleString("id-ID")}</span>
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
