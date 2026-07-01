"use client";

import { useState, useMemo } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Loader2,
  ShieldCheck,
  FileText,
  Eye,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useInventoryStore } from "@/store/inventory-store";
import type { PurchaseItem, PurchaseInvoice } from "@/types/inventory";
import { cn } from "@/lib/cn";
import { otpService } from "@/lib/otp/otp-service";
import { PURCHASE_REVISABLE_FIELDS } from "@/lib/correction/purchase-correction-engine";

// ─── Types ───

interface CorrectionDetail {
  resourceItemId?: string;
  productId?: string;
  productName: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  dataType: string;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// ─── Component ───

export function InventoryCorrectionModal({
  open,
  invoice,
  onClose,
}: {
  open: boolean;
  invoice: PurchaseInvoice | null;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState<CorrectionDetail[]>([]);
  const [otpCode, setOtpCode] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState("");

  const correctInvoice = useInventoryStore((s) => s.correctInvoice);

  if (!open || !invoice) return null;

  // ── Step data ──

  const selectedItem = invoice.items.find((i) => i.id === selectedItemId);
  const fieldMeta = PURCHASE_REVISABLE_FIELDS.find((f) => f.value === selectedField);

  const oldValue = useMemo(() => {
    if (!selectedItem || !selectedField) return "";
    switch (selectedField) {
      case "quantity":
        return String(selectedItem.quantity);
      case "unit_price":
        return String(selectedItem.unitPrice);
      case "selling_price":
        return String(selectedItem.sellingPrice);
      case "batch_number":
        return selectedItem.batchNumber;
      case "expired_date":
        return selectedItem.expiredDate;
      default:
        return "";
    }
  }, [selectedItem, selectedField]);

  // ── Handlers ──

  const addDetail = () => {
    if (!selectedItem || !selectedField || !newValue.trim()) {
      toast.error("Lengkapi produk, field, dan nilai baru.");
      return;
    }
    const detail: CorrectionDetail = {
      resourceItemId: selectedItem.id,
      productId: selectedItem.productId,
      productName: selectedItem.productName,
      fieldName: selectedField,
      oldValue,
      newValue,
      dataType: fieldMeta?.dataType ?? "text",
    };
    setDetails((prev) => [...prev, detail]);
    setSelectedItemId("");
    setSelectedField("");
    setNewValue("");
    toast.success(`Ditambahkan: ${selectedItem.productName} — ${fieldMeta?.label}`);
  };

  const removeDetail = (idx: number) => {
    setDetails((prev) => prev.filter((_, i) => i !== idx));
  };

  const requestOtp = async () => {
    if (reason.trim().length < 20) {
      toast.error("Alasan minimal 20 karakter.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await otpService.requestOtp({
        module: "invoice_revision",
        resourceType: "purchase_invoice",
        resourceId: invoice.id,
        correlationId: crypto.randomUUID(),
        tenantId: invoice.tenantId,
        destination: "owner@example.com", // In production: fetch owner email
        createdBy: "current-user",
      });
      setSessionId(result.sessionId);
      setStep(7);
      toast.success("OTP dikirim ke email Owner Tenant.");
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal mengirim OTP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpCode.trim() || otpCode.length !== 6) {
      setOtpError("Masukkan 6 digit kode OTP.");
      return;
    }
    setOtpError("");
    setIsSubmitting(true);
    try {
      const result = await otpService.verifyOtp({ sessionId, code: otpCode });
      if (result.valid) {
        setOtpVerified(true);
        toast.success("OTP terverifikasi.");
      } else {
        const messages: Record<string, string> = {
          invalid: "Kode OTP salah.",
          expired: "Kode OTP sudah kadaluarsa.",
          max_attempts: "Terlalu banyak percobaan. Silakan request ulang.",
          already_verified: "OTP sudah diverifikasi sebelumnya.",
        };
        setOtpError(messages[result.reason ?? "invalid"] ?? "Verifikasi gagal.");
      }
    } catch {
      setOtpError("Gagal verifikasi OTP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApply = async () => {
    if (!otpVerified) {
      toast.error("OTP harus diverifikasi terlebih dahulu.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await correctInvoice({
        invoiceId: invoice.id,
        details: details.map((d) => ({
          resourceItemId: d.resourceItemId,
          productId: d.productId,
          productName: d.productName,
          fieldName: d.fieldName,
          oldValue: d.oldValue,
          newValue: d.newValue,
          dataType: d.dataType,
        })),
        reason,
      });

      if (result.success) {
        toast.success(`Revisi #${(invoice.revisionNumber ?? 0) + 1} berhasil diterapkan.`);
        onClose();
      } else {
        toast.error(result.error ?? "Gagal menerapkan revisi.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal menerapkan revisi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setSelectedItemId("");
    setSelectedField("");
    setNewValue("");
    setReason("");
    setDetails([]);
    setOtpCode("");
    setSessionId("");
    setOtpVerified(false);
    setOtpError("");
  };

  // ── Render ──

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => { reset(); onClose(); }}
    >
      <div
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 dark:border-neutral-700 dark:bg-neutral-900">
          <div>
            <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
              Invoice Correction Request
            </h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {invoice.invoiceNumber} — {invoice.supplierName}
            </p>
          </div>
          <button
            onClick={() => { reset(); onClose(); }}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-1 text-[10px] text-neutral-400">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <span
                key={s}
                className={cn(
                  "flex items-center gap-1",
                  step === s && "text-brand-600 font-medium",
                  step > s && "text-green-500",
                )}
              >
                {step > s ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <span className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold",
                    step === s ? "bg-brand-100 text-brand-700" : "bg-neutral-100 text-neutral-400",
                  )}>
                    {s}
                  </span>
                )}
                {s < 8 && <span className="w-3 border-t border-neutral-200" />}
              </span>
            ))}
          </div>

          {/* STEP 1: Product selection */}
          {step === 1 && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Pilih Produk dari Invoice
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => { setSelectedItemId(e.target.value); setStep(2); }}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
              >
                <option value="">▼ Pilih produk...</option>
                {invoice.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.productName} — Qty: {item.quantity}, Harga: Rp {item.unitPrice.toLocaleString("id-ID")}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* STEP 2: Field selection */}
          {step === 2 && selectedItem && (
            <div className="space-y-3">
              <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">
                <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {selectedItem.productName}
                </p>
                <p className="text-[10px] text-neutral-500">
                  Qty: {selectedItem.quantity} | Harga: Rp {selectedItem.unitPrice.toLocaleString("id-ID")} | Batch: {selectedItem.batchNumber}
                </p>
              </div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Field yang Direvisi
              </label>
              <select
                value={selectedField}
                onChange={(e) => { setSelectedField(e.target.value); setStep(3); }}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
              >
                <option value="">▼ Pilih field...</option>
                {PURCHASE_REVISABLE_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* STEP 3: Old value (readonly) */}
          {step === 3 && selectedField && (
            <div className="space-y-3">
              <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">
                <p className="text-[10px] font-medium text-neutral-500 uppercase">{fieldMeta?.label}</p>
                <p className="text-sm font-mono text-neutral-700 dark:text-neutral-300 mt-1">
                  {oldValue}
                </p>
              </div>
              <button
                onClick={() => setStep(4)}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
              >
                Lanjutkan — Masukkan Nilai Baru
              </button>
            </div>
          )}

          {/* STEP 4: New value */}
          {step === 4 && selectedField && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-800">
                  <span className="text-neutral-400">Lama</span>
                  <p className="font-mono font-medium text-neutral-700 dark:text-neutral-300">{oldValue}</p>
                </div>
                <div className="rounded-lg bg-brand-50 p-2.5 dark:bg-brand-950">
                  <span className="text-brand-500">Baru</span>
                  {fieldMeta?.dataType === "number" ? (
                    <input
                      type="number"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className="w-full bg-transparent font-mono font-medium text-brand-700 dark:text-brand-300 focus:outline-none mt-1"
                      placeholder="Masukkan nilai..."
                      autoFocus
                    />
                  ) : fieldMeta?.dataType === "date" ? (
                    <input
                      type="date"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className="w-full bg-transparent font-mono text-brand-700 dark:text-brand-300 focus:outline-none mt-1"
                      autoFocus
                    />
                  ) : (
                    <input
                      type="text"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className="w-full bg-transparent font-mono font-medium text-brand-700 dark:text-brand-300 focus:outline-none mt-1"
                      placeholder="Masukkan nilai..."
                      autoFocus
                    />
                  )}
                </div>
              </div>
              <button
                onClick={addDetail}
                disabled={!newValue.trim()}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                Tambahkan ke Daftar Revisi
              </button>
            </div>
          )}

          {/* STEP 5: Reason */}
          {step === 5 && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Alasan Revisi <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Jelaskan alasan revisi (minimal 20 karakter)..."
                rows={4}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 placeholder-neutral-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
              />
              <p className={cn("text-[10px]", reason.length >= 20 ? "text-green-500" : "text-neutral-400")}>
                {reason.length}/20 karakter minimum
              </p>
            </div>
          )}

          {/* STEP 6: Preview */}
          {step === 6 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <FileText className="h-3.5 w-3.5" />
                Preview Revisi
              </div>
              {details.length === 0 ? (
                <p className="text-xs text-neutral-400">Belum ada perubahan. Tambahkan di step 1-4.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-[10px] text-neutral-400">
                      <th className="py-1.5">Produk</th>
                      <th className="py-1.5">Field</th>
                      <th className="py-1.5">Lama</th>
                      <th className="py-1.5">Baru</th>
                      <th className="py-1.5 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {details.map((d, i) => (
                      <tr key={i} className="text-neutral-700 dark:text-neutral-300">
                        <td className="py-1.5">{d.productName}</td>
                        <td className="py-1.5 font-medium">{PURCHASE_REVISABLE_FIELDS.find((f) => f.value === d.fieldName)?.label ?? d.fieldName}</td>
                        <td className="py-1.5 font-mono text-neutral-500">{d.oldValue}</td>
                        <td className="py-1.5 font-mono font-medium text-brand-600">{d.newValue}</td>
                        <td className="py-1.5">
                          <button onClick={() => removeDetail(i)} className="text-red-400 hover:text-red-600">
                            <X className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {details.length > 0 && reason.length >= 20 && (
                <button
                  onClick={requestOtp}
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Kirim OTP & Lanjutkan
                </button>
              )}
            </div>
          )}

          {/* STEP 7: OTP */}
          {step === 7 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <ShieldCheck className="h-4 w-4 text-brand-500" />
                Verifikasi OTP
              </div>
              <p className="text-[11px] text-neutral-500">
                Kode OTP 6 digit telah dikirim ke email Owner Tenant.
                {sessionId && (
                  <span className="ml-1 text-brand-600 font-mono cursor-pointer" onClick={() => {
                    const code = otpService.getDemoCode(sessionId);
                    if (code) toast.info(`Demo OTP: ${code}`);
                  }}>
                    (Demo: klik untuk lihat kode)
                  </span>
                )}
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, "")); setOtpError(""); }}
                placeholder="000000"
                className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-neutral-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                autoFocus
              />
              {otpError && <p className="text-[10px] text-red-500">{otpError}</p>}
              {otpVerified && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-2.5 text-xs text-green-700 dark:bg-green-950 dark:text-green-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                  OTP Terverifikasi
                </div>
              )}
              <button
                onClick={verifyOtp}
                disabled={isSubmitting || otpCode.length !== 6 || otpVerified}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Verifikasi OTP
              </button>
            </div>
          )}

          {/* STEP 8: Final Apply */}
          {step === 8 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-green-700">
                <CheckCircle className="h-4 w-4" />
                Siap Diterapkan
              </div>
              <div className="rounded-lg bg-neutral-50 p-3 space-y-1 text-xs dark:bg-neutral-800">
                <p><span className="text-neutral-400">Invoice:</span> {invoice.invoiceNumber}</p>
                <p><span className="text-neutral-400">Revisi #:</span> {(invoice.revisionNumber ?? 0) + 1}</p>
                <p><span className="text-neutral-400">Perubahan:</span> {details.length} field</p>
                <p><span className="text-neutral-400">Alasan:</span> {reason}</p>
                <p><span className="text-neutral-400">OTP:</span> ✅ Verified</p>
              </div>
              <button
                onClick={handleApply}
                disabled={isSubmitting}
                className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Terapkan Revisi
              </button>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="sticky bottom-0 border-t border-neutral-200 bg-white px-5 py-3 flex items-center justify-between dark:border-neutral-700 dark:bg-neutral-900">
          <button
            onClick={() => {
              if (step === 1) { reset(); onClose(); return; }
              setStep((s) => (Math.max(1, s - 1) as Step));
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400"
          >
            <ChevronLeft className="h-3 w-3" />
            {step === 1 ? "Batal" : "Kembali"}
          </button>

          <span className="text-[10px] text-neutral-400">Step {step}/8</span>

          {step < 5 && (
            <button
              onClick={() => {
                if (step === 4 && details.length > 0) setStep(5);
                else if (step === 1 && selectedItemId) setStep(2);
                else setStep((s) => (Math.min(8, s + 1) as Step));
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
            >
              Lanjut
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
          {step === 5 && (
            <button
              onClick={() => { if (reason.length >= 20) setStep(6); else toast.error("Alasan minimal 20 karakter."); }}
              disabled={reason.length < 20}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Eye className="h-3 w-3" />
              Preview
            </button>
          )}
          {step === 6 && (
            <button
              onClick={requestOtp}
              disabled={isSubmitting || details.length === 0}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Send className="h-3 w-3" />
              Kirim OTP
            </button>
          )}
          {step === 7 && otpVerified && (
            <button
              onClick={() => setStep(8)}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
            >
              Lanjut ke Apply
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
