// =================================================================
// InvoiceRevisionDrawer V3.2.1 — Orchestration Container
// 🔒 ARCHITECTURE LOCKED
// Responsibility: dialog lifecycle, state root, wire adapters → store
// =================================================================

"use client";

import { useState, useCallback } from "react";
import type { PurchaseInvoice } from "@/types/inventory";
import { useInventoryStore } from "@/store/inventory-store";
import type { WorkingPurchaseItem, RevisionSessionState } from "./types";

// ─── Props ───

interface InvoiceRevisionDrawerProps {
  open: boolean;
  invoice: PurchaseInvoice | null;
  onClose: () => void;
}

// ─── Component ───

export function InvoiceRevisionDrawer({ open, invoice, onClose }: InvoiceRevisionDrawerProps) {
  // ── State ──
  const [sessionState, setSessionState] = useState<RevisionSessionState>("OPEN");
  const [workingItems, setWorkingItems] = useState<WorkingPurchaseItem[]>([]);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const correctInvoice = useInventoryStore((s) => s.correctInvoice);

  // ── ALL hooks above — early return below ──
  if (!open || !invoice) return null;

  // ── TODO Sprint 2: Working Copy initialization ──
  // useEffect(() => { deepClone invoice.items[] → workingItems }, [invoice, open]);

  // ── TODO Sprint 3: Editor callbacks ──
  const handleFieldChange = useCallback(
    (_workingId: string, _field: string, _value: string | number) => {
      // Immutable update: workingItems → MODIFIED
    },
    [workingItems],
  );

  const handleAddItem = useCallback(() => {
    // Add NEW item to workingItems
  }, [workingItems]);

  const handleSoftDelete = useCallback(
    (_workingId: string) => {
      // Mark item as DELETED
    },
    [workingItems],
  );

  const handleReset = useCallback(() => {
    // Reset workingItems to original invoice items
  }, [invoice]);

  // ── TODO Sprint 5: Save ──
  const handleSave = useCallback(async () => {
    // validate → adapter → correctInvoice → close
  }, [workingItems, reason, correctInvoice, invoice]);

  const handleClose = useCallback(() => {
    setWorkingItems([]);
    setReason("");
    setSessionState("CANCELLED");
    onClose();
  }, [onClose]);

  // ── Render ──
  if (sessionState === "COMPLETED" || sessionState === "CANCELLED") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-xl bg-white shadow-2xl dark:bg-neutral-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Revisi Invoice</h2>
            <p className="text-sm text-neutral-500">
              {invoice.invoiceNumber} — {invoice.supplierName}
            </p>
          </div>
        </div>

        {/* Content placeholder */}
        <div className="flex flex-1 items-center justify-center text-neutral-400">
          {/* TODO Sprint 3: RevisionTable + RevisionRow */}
          <p>Sprint 2-3: Editor akan muncul di sini</p>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t px-6 py-4">
          <span className="text-xs text-neutral-400">Session: {sessionState}</span>
          <div className="flex gap-2">
            <button onClick={handleClose} className="rounded-lg border px-4 py-2 text-sm">
              Batal
            </button>
            <button disabled className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white opacity-50">
              Simpan Revisi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
