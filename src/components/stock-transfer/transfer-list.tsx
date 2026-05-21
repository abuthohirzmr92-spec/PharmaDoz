"use client";

import { useEffect, useMemo, useCallback } from "react";
import {
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Truck,
  PackageCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useStockTransferStore } from "@/store/stock-transfer-store";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import type { StockTransfer, TransferStatus } from "@/types/stock-transfer";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  Status Configuration                                               */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<
  TransferStatus,
  { label: string; classes: string; icon: typeof CheckCircle }
> = {
  pending: {
    label: "Pending",
    classes:
      "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
    icon: Loader2,
  },
  approved: {
    label: "Disetujui",
    classes:
      "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400",
    icon: CheckCircle,
  },
  in_transit: {
    label: "Dalam Perjalanan",
    classes:
      "text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400",
    icon: Truck,
  },
  received: {
    label: "Diterima",
    classes:
      "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400",
    icon: PackageCheck,
  },
  rejected: {
    label: "Ditolak",
    classes: "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400",
    icon: XCircle,
  },
};

/* ------------------------------------------------------------------ */
/*  Transfer Row                                                       */
/* ------------------------------------------------------------------ */

function TransferRow({
  transfer,
  onApprove,
  onReject,
  onMarkInTransit,
  onReceive,
}: {
  transfer: StockTransfer;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onMarkInTransit: (id: string) => void;
  onReceive: (id: string) => void;
}) {
  const st = STATUS_CONFIG[transfer.status];
  const StatusIcon = st.icon;

  return (
    <tr className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-colors">
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
          {new Date(transfer.createdAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs text-neutral-700 dark:text-neutral-300">
          {transfer.fromPharmacyName}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs text-neutral-700 dark:text-neutral-300">
          {transfer.toPharmacyName}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-neutral-900 dark:text-neutral-50 truncate max-w-[160px]">
            {transfer.productName}
          </span>
          {transfer.batchNumber && (
            <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
              {transfer.batchNumber}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
          {transfer.quantity}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
            st.classes,
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {st.label}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          {transfer.status === "pending" && (
            <>
              <button
                onClick={() => onApprove(transfer.id)}
                className="rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-blue-700 transition-colors"
                title="Setujui transfer"
              >
                Setujui
              </button>
              <button
                onClick={() => onReject(transfer.id)}
                className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[10px] font-medium text-neutral-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-red-950/20 dark:hover:text-red-400"
                title="Tolak transfer"
              >
                Tolak
              </button>
            </>
          )}
          {transfer.status === "approved" && (
            <button
              onClick={() => onMarkInTransit(transfer.id)}
              className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-purple-700 transition-colors"
            >
              <Truck className="h-3 w-3" />
              Kirim
            </button>
          )}
          {transfer.status === "in_transit" && (
            <button
              onClick={() => onReceive(transfer.id)}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-green-700 transition-colors"
            >
              <PackageCheck className="h-3 w-3" />
              Terima
            </button>
          )}
          {transfer.status === "received" && (
            <span className="text-[10px] text-neutral-400 italic">Selesai</span>
          )}
          {transfer.status === "rejected" && (
            <span className="text-[10px] text-neutral-400 italic">Ditolak</span>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function TransferList() {
  const transfers = useStockTransferStore((s) => s.transfers);
  const isLoading = useStockTransferStore((s) => s.isLoading);
  const error = useStockTransferStore((s) => s.error);
  const loadTransfers = useStockTransferStore((s) => s.loadTransfers);
  const approveTransfer = useStockTransferStore((s) => s.approveTransfer);
  const rejectTransfer = useStockTransferStore((s) => s.rejectTransfer);
  const markInTransit = useStockTransferStore((s) => s.markInTransit);
  const receiveTransfer = useStockTransferStore((s) => s.receiveTransfer);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  const handleApprove = useCallback(
    async (id: string) => {
      try {
        await approveTransfer(id);
        toast.success("Transfer berhasil disetujui");
      } catch {
        toast.error("Gagal menyetujui transfer");
      }
    },
    [approveTransfer],
  );

  const handleReject = useCallback(
    async (id: string) => {
      const note = window.prompt("Alasan penolakan (opsional):");
      try {
        await rejectTransfer(id, note ?? undefined);
        toast.success("Transfer berhasil ditolak");
      } catch {
        toast.error("Gagal menolak transfer");
      }
    },
    [rejectTransfer],
  );

  const handleMarkInTransit = useCallback(
    async (id: string) => {
      try {
        await markInTransit(id);
        toast.success("Transfer sedang dalam perjalanan");
      } catch {
        toast.error("Gagal mengubah status transfer");
      }
    },
    [markInTransit],
  );

  const handleReceive = useCallback(
    async (id: string) => {
      try {
        await receiveTransfer(id);
        toast.success("Transfer berhasil diterima");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Gagal menerima transfer",
        );
      }
    },
    [receiveTransfer],
  );

  /* ---- Loading State ---- */

  if (isLoading && transfers.length === 0) {
    return (
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            Transfer Stok
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Riwayat transfer antar cabang
          </p>
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  /* ---- Error State ---- */

  if (error && transfers.length === 0) {
    return (
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            Transfer Stok
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Riwayat transfer antar cabang
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => loadTransfers()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  /* ---- Empty State ---- */

  if (transfers.length === 0) {
    return (
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            Transfer Stok
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Riwayat transfer antar cabang
          </p>
        </div>
        <EmptyState
          icon={<ArrowRightLeft className="h-6 w-6" />}
          title="Belum ada transfer stok"
          description="Belum ada permintaan transfer stok antar cabang. Gunakan form di atas untuk membuat transfer baru."
        />
      </div>
    );
  }

  /* ---- Data Table ---- */

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            Transfer Stok
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {transfers.length} transfer — Riwayat transfer antar cabang
          </p>
        </div>
        <button
          onClick={() => loadTransfers()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isLoading && "animate-spin")}
          />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Tanggal
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Dari Cabang
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Ke Cabang
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Produk
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Qty
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Status
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {transfers.map((transfer) => (
              <TransferRow
                key={transfer.id}
                transfer={transfer}
                onApprove={handleApprove}
                onReject={handleReject}
                onMarkInTransit={handleMarkInTransit}
                onReceive={handleReceive}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
