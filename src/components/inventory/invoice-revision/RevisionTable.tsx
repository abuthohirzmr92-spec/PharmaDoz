// =================================================================
// RevisionTable V3.2.1
// 🔒 ARCHITECTURE LOCKED
// Responsibility: render table, pass callbacks to rows
// =================================================================

"use client";

import type { WorkingPurchaseItem } from "./types";

// ─── Props ───

interface RevisionTableProps {
  workingItems: WorkingPurchaseItem[];
  onFieldChange: (workingId: string, field: string, value: string | number) => void;
  onSoftDelete: (workingId: string) => void;
  canEdit: boolean;
}

// ─── Component ───

export function RevisionTable({
  workingItems,
  onFieldChange,
  onSoftDelete,
  canEdit,
}: RevisionTableProps) {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-900">
          <tr className="border-b text-left text-[10px] font-medium text-neutral-400">
            <th className="w-8 px-2 py-1.5">#</th>
            <th className="px-2 py-1.5">Produk</th>
            <th className="px-2 py-1.5">Batch</th>
            <th className="px-2 py-1.5">Area</th>
            <th className="px-2 py-1.5">Slot</th>
            <th className="px-2 py-1.5">ED</th>
            <th className="px-2 py-1.5 text-right">Qty</th>
            <th className="px-2 py-1.5 text-right">Hrg Beli</th>
            <th className="px-2 py-1.5 text-right">Hrg Jual</th>
            <th className="w-20 px-2 py-1.5 text-center">Status</th>
            <th className="w-16 px-2 py-1.5" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {workingItems.map((item) => (
            <tr key={item.workingId} className="hover:bg-neutral-50">
              <td className="px-2 py-1.5 text-center text-neutral-400">
                {/* TODO Sprint 3: RevisionRow checkbox */}
              </td>
              <td className="px-2 py-1.5">{item.productName || "—"}</td>
              <td className="px-2 py-1.5 font-mono text-neutral-500">{item.batchNumber || "—"}</td>
              <td className="px-2 py-1.5 text-neutral-500">{item.storageAreaId || "—"}</td>
              <td className="px-2 py-1.5 text-neutral-500">{item.storageSlot || "—"}</td>
              <td className="px-2 py-1.5">{item.expiredDate || "—"}</td>
              <td className="px-2 py-1.5 text-right">{item.quantity}</td>
              <td className="px-2 py-1.5 text-right">{item.unitPrice.toLocaleString("id-ID")}</td>
              <td className="px-2 py-1.5 text-right">{item.sellingPrice.toLocaleString("id-ID")}</td>
              <td className="px-2 py-1.5 text-center">
                <span className="text-[10px] text-neutral-400">{item._state}</span>
              </td>
              <td className="px-2 py-1.5">
                <button
                  onClick={() => onSoftDelete(item.workingId)}
                  disabled={!canEdit || item._state === "DELETED"}
                  className="text-[10px] text-red-400 hover:text-red-600 disabled:opacity-30"
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
