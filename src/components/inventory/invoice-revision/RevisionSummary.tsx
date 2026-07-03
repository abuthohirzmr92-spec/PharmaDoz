// =================================================================
// RevisionSummary V3.2.1
// 🔒 ARCHITECTURE LOCKED
// Responsibility: display pre-computed summary data. NEVER compute data.
// =================================================================

"use client";

import type { RevisionSummaryData } from "./types";

// ─── Props ───

interface RevisionSummaryProps {
  data: RevisionSummaryData | null;
  reason: string;
  onReasonChange: (value: string) => void;
  canEdit: boolean;
}

// ─── Component ───

export function RevisionSummary({
  data,
  reason,
  onReasonChange,
  canEdit,
}: RevisionSummaryProps) {
  if (!data) return null;

  return (
    <div className="border-t px-4 py-3">
      <h4 className="mb-2 text-xs font-semibold text-neutral-700">Ringkasan Revisi</h4>

      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <span className="text-neutral-400">Item Diubah:</span>{" "}
          <strong>{data.itemsChanged}</strong>
        </div>
        <div>
          <span className="text-neutral-400">Item Baru:</span>{" "}
          <strong className="text-green-600">{data.itemsAdded}</strong>
        </div>
        <div>
          <span className="text-neutral-400">Item Dihapus:</span>{" "}
          <strong className="text-red-600">{data.itemsDeleted}</strong>
        </div>
        <div>
          <span className="text-neutral-400">Qty Berubah:</span>{" "}
          <strong>{data.qtyChanges}</strong>
        </div>
        <div>
          <span className="text-neutral-400">Harga Berubah:</span>{" "}
          <strong>{data.priceChanges}</strong>
        </div>
        <div>
          <span className="text-neutral-400">Lokasi Berubah:</span>{" "}
          <strong>{data.locationChanges}</strong>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-4 text-[11px]">
        <span>
          <span className="text-neutral-400">Total Lama:</span>{" "}
          <strong>Rp {data.totalOld.toLocaleString("id-ID")}</strong>
        </span>
        <span>
          <span className="text-neutral-400">Total Baru:</span>{" "}
          <strong>Rp {data.totalNew.toLocaleString("id-ID")}</strong>
        </span>
        <span>
          <span className="text-neutral-400">Selisih:</span>{" "}
          <strong className={data.deltaAmount >= 0 ? "text-green-600" : "text-red-600"}>
            {data.deltaAmount >= 0 ? "+" : ""}Rp {data.deltaAmount.toLocaleString("id-ID")}
          </strong>
        </span>
      </div>

      <div className="mt-3">
        <label className="text-[10px] font-medium text-neutral-400">
          Alasan Revisi (min 20 karakter)
        </label>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          disabled={!canEdit}
          placeholder="Jelaskan alasan revisi..."
          rows={3}
          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs disabled:bg-neutral-50"
        />
        <p className="text-[10px] text-neutral-400">
          {reason.length}/20 karakter minimum
        </p>
      </div>
    </div>
  );
}
