"use client";

import { useState } from "react";
import {
  Shield,
  Store,
  MapPin,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { useMaintenanceStore } from "@/store/maintenance-store";
import { useExpansionStore } from "@/store/expansion-store";
import type { ExpansionStatus } from "@/types";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type ModalMode = "approve" | "reject" | null;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const STATUS_BADGE: Record<
  ExpansionStatus,
  { bg: string; text: string; darkBg: string; darkText: string; icon: typeof Clock }
> = {
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    darkBg: "dark:bg-amber-950/30",
    darkText: "dark:text-amber-400",
    icon: Clock,
  },
  approved: {
    bg: "bg-green-50",
    text: "text-green-700",
    darkBg: "dark:bg-green-950/30",
    darkText: "dark:text-green-400",
    icon: CheckCircle,
  },
  rejected: {
    bg: "bg-red-50",
    text: "text-red-700",
    darkBg: "dark:bg-red-950/30",
    darkText: "dark:text-red-400",
    icon: XCircle,
  },
  provisioned: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    darkBg: "dark:bg-blue-950/30",
    darkText: "dark:text-blue-400",
    icon: CheckCircle,
  },
};

const STATUS_LABELS: Record<ExpansionStatus, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  provisioned: "Diproses",
};

function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ExpansionsPage() {
  const isSystemUser = useAuthStore((s) => s.isSystemUser());
  const user = useAuthStore((s) => s.user);
  const maintenanceConfig = useMaintenanceStore((s) => s.config);
  const { requests, approveRequest, rejectRequest } = useExpansionStore();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [modalRequestId, setModalRequestId] = useState<string | null>(null);
  const [modalNotes, setModalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ---- Maintenance gate ---- */
  if (maintenanceConfig.mode === "full") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-950/30">
          <Wrench className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-neutral-700 dark:text-neutral-300">
          Pemeliharaan
        </h2>
        <p className="max-w-xs text-sm text-neutral-500">
          Halaman admin tidak tersedia selama pemeliharaan penuh.
        </p>
      </div>
    );
  }

  /* ---- Auth gate ---- */
  if (!isSystemUser) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-950/30">
          <Shield className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-neutral-700 dark:text-neutral-300">
          Akses Ditolak
        </h2>
        <p className="max-w-xs text-sm text-neutral-500">
          Halaman ini hanya dapat diakses oleh Super Admin, Developer, dan
          Support.
        </p>
      </div>
    );
  }

  /* ---- Handlers ---- */
  function openApproveModal(id: string) {
    setModalMode("approve");
    setModalRequestId(id);
    setModalNotes("");
  }

  function openRejectModal(id: string) {
    setModalMode("reject");
    setModalRequestId(id);
    setModalNotes("");
  }

  function closeModal() {
    setModalMode(null);
    setModalRequestId(null);
    setModalNotes("");
  }

  function handleConfirm() {
    if (!modalRequestId || !modalMode) return;
    if (!modalNotes.trim()) {
      toast.error("Catatan harus diisi");
      return;
    }

    setIsSubmitting(true);

    const approverName = user?.displayName ?? "Super Admin";
    const approverId = user?.id ?? "system";

    // Simulate processing delay
    setTimeout(() => {
      if (modalMode === "approve") {
        approveRequest(modalRequestId, approverName, approverId, modalNotes.trim());
        toast.success("Permintaan ekspansi disetujui");
      } else {
        rejectRequest(modalRequestId, approverName, approverId, modalNotes.trim());
        toast.success("Permintaan ekspansi ditolak");
      }
      setIsSubmitting(false);
      closeModal();
    }, 600);
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          Persetujuan Ekspansi
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Kelola dan review permintaan pembukaan cabang baru dari pemilik
          apotek.
        </p>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white px-5 py-4 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-neutral-500">Menunggu Persetujuan</p>
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
              {pendingCount}
            </p>
          </div>
        </div>
        <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-neutral-500">Total Disetujui</p>
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
              {requests.filter((r) => r.status === "approved" || r.status === "provisioned").length}
            </p>
          </div>
        </div>
      </div>

      {/* Request list */}
      {requests.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white py-16 text-center dark:border-neutral-600 dark:bg-neutral-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            <Store className="h-6 w-6 text-neutral-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Belum ada permintaan pembukaan toko baru
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Permintaan dari pemilik apotek akan muncul di sini.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((request) => {
            const badge = STATUS_BADGE[request.status];
            const StatusIcon = badge.icon;
            const isPending = request.status === "pending";

            return (
              <div
                key={request.id}
                className={cn(
                  "rounded-xl border bg-white p-5 dark:bg-neutral-900",
                  isPending
                    ? "border-amber-200 dark:border-amber-900"
                    : "border-neutral-200 dark:border-neutral-700",
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left: info */}
                  <div className="flex-1 space-y-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
                          {request.requestedStoreName}
                        </h3>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {request.pharmacyName}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium",
                          badge.bg,
                          badge.text,
                          badge.darkBg,
                          badge.darkText,
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_LABELS[request.status]}
                      </span>
                    </div>

                    {/* Detail grid */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                        <span className="text-[11px] text-neutral-500">
                          {request.ownerName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                        <span className="text-[11px] text-neutral-500">
                          {request.requestedLocation}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                        <span className="text-[11px] text-neutral-500">
                          {formatDate(request.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                        Alasan
                      </p>
                      <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                        {request.reason}
                      </p>
                    </div>

                    {/* Approval notes (if any) */}
                    {request.approvalNotes && (
                      <div
                        className={cn(
                          "rounded-lg p-3",
                          request.status === "approved"
                            ? "bg-green-50 dark:bg-green-950/20"
                            : "bg-red-50 dark:bg-red-950/20",
                        )}
                      >
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                          Catatan {request.status === "approved" ? "Persetujuan" : "Penolakan"}
                        </p>
                        <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                          {request.approvalNotes}
                        </p>
                        {request.approverName && (
                          <p className="mt-1 text-[10px] text-neutral-400">
                            oleh {request.approverName}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: actions for pending */}
                  {isPending && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => openRejectModal(request.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Tolak
                      </button>
                      <button
                        onClick={() => openApproveModal(request.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-[11px] font-medium text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Setujui
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Modal ---- */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={closeModal}
            aria-hidden="true"
          />

          {/* Modal box */}
          <div className="relative w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            {/* Icon */}
            <div
              className={cn(
                "mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full",
                modalMode === "approve"
                  ? "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400"
                  : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
              )}
            >
              {modalMode === "approve" ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
            </div>

            <h3 className="mb-1 text-center text-sm font-bold text-neutral-900 dark:text-neutral-50">
              {modalMode === "approve" ? "Setujui Permintaan" : "Tolak Permintaan"}
            </h3>
            <p className="mb-4 text-center text-xs text-neutral-500">
              {modalMode === "approve"
                ? "Konfirmasi persetujuan pembukaan cabang baru"
                : "Berikan alasan penolakan pembukaan cabang baru"}
            </p>

            {/* Notes input */}
            <div className="mb-5">
              <label className="mb-1.5 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                {modalMode === "approve" ? "Catatan Persetujuan" : "Alasan Penolakan"}
              </label>
              <textarea
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder={
                  modalMode === "approve"
                    ? "Masukkan catatan persetujuan..."
                    : "Masukkan alasan penolakan..."
                }
                rows={4}
                className="w-full resize-none rounded-lg border border-neutral-200 bg-white p-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/30"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                Batal
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-4 py-2 text-[11px] font-medium text-white",
                  modalMode === "approve"
                    ? "bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                    : "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600",
                  isSubmitting && "opacity-60",
                )}
              >
                {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                {modalMode === "approve" ? "Setujui" : "Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
