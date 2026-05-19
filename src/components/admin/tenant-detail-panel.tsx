"use client";

import { useEffect, useCallback } from "react";
import { X, Building2, User, Users, Store, Activity } from "lucide-react";
import type { TenantSummary, TenantQuotaInfo, TenantPackage } from "@/types";
import { cn } from "@/lib/cn";
import { TenantQuotaPanel } from "@/components/admin/tenant-quota-panel";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface TenantDetailPanelProps {
  tenant: TenantSummary & { quotaInfo?: TenantQuotaInfo };
  open: boolean;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const PACKAGE_BADGE: Record<
  TenantPackage,
  { bg: string; text: string; dot: string }
> = {
  basic: {
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-700 dark:text-neutral-300",
    dot: "bg-neutral-400",
  },
  professional: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  enterprise: {
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-700 dark:text-green-300",
    dot: "bg-green-500",
  },
};

const PACKAGE_LABELS: Record<TenantPackage, string> = {
  basic: "Basic",
  professional: "Professional",
  enterprise: "Enterprise",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
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

function formatCurrency(value: number): string {
  return value.toLocaleString("id-ID");
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TenantDetailPanel({
  tenant,
  open,
  onClose,
}: TenantDetailPanelProps) {
  /* Close on Escape key */
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  if (!open) return null;

  const badge = PACKAGE_BADGE[tenant.packageName];

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="absolute bottom-0 right-0 top-0 w-full max-w-md border-l border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
              Detail Tenant
            </h2>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {/* Identity */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-neutral-400" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-50">
                  {tenant.pharmacyName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
                    badge.bg,
                    badge.text,
                  )}
                >
                  {PACKAGE_LABELS[tenant.packageName]}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium",
                    tenant.isActive
                      ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      tenant.isActive ? "bg-green-500" : "bg-neutral-400",
                    )}
                  />
                  {tenant.isActive ? "Aktif" : "Nonaktif"}
                </span>
              </div>
            </div>

            {/* Detail info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                <div className="mb-1 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-neutral-400" />
                  <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                    Pemilik
                  </span>
                </div>
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  {tenant.ownerName}
                </p>
              </div>

              <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                <div className="mb-1 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-neutral-400" />
                  <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                    Pengguna
                  </span>
                </div>
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  {tenant.userCount} orang
                </p>
              </div>

              <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                <div className="mb-1 flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 text-neutral-400" />
                  <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                    Cabang
                  </span>
                </div>
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  {tenant.branchCount} cabang
                </p>
              </div>

              <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                <div className="mb-1 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-neutral-400" />
                  <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                    Volume Transaksi
                  </span>
                </div>
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  {formatCurrency(tenant.transactionVolume)}
                </p>
              </div>
            </div>

            {/* Activity */}
            <div>
              <h4 className="mb-2 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Aktivitas
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2 dark:border-neutral-800">
                  <span className="text-[11px] text-neutral-500">
                    Terakhir Aktif
                  </span>
                  <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                    {formatDate(tenant.lastActiveAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2 dark:border-neutral-800">
                  <span className="text-[11px] text-neutral-500">
                    Sinkronasi Terakhir
                  </span>
                  <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                    {formatDate(tenant.lastSyncAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2 dark:border-neutral-800">
                  <span className="text-[11px] text-neutral-500">
                    Dibuat Pada
                  </span>
                  <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                    {formatDate(tenant.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quota */}
            {tenant.quotaInfo && (
              <TenantQuotaPanel
                quota={tenant.quotaInfo}
                pharmacyName={tenant.pharmacyName}
                packageName={tenant.packageName}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
