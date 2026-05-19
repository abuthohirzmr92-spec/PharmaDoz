"use client";

import { AlertTriangle, Package } from "lucide-react";
import type { TenantQuotaInfo, TenantPackage } from "@/types";
import { cn } from "@/lib/cn";
import { QUOTA_WARNING_THRESHOLD } from "@/config/constants";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface TenantQuotaPanelProps {
  quota: TenantQuotaInfo;
  pharmacyName: string;
  packageName: TenantPackage;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const PACKAGE_LABELS: Record<TenantPackage, string> = {
  basic: "Basic",
  professional: "Professional",
  enterprise: "Enterprise",
};

const PACKAGE_BADGE_COLORS: Record<
  TenantPackage,
  { bg: string; text: string; darkBg: string; darkText: string }
> = {
  basic: {
    bg: "bg-neutral-100",
    text: "text-neutral-700",
    darkBg: "dark:bg-neutral-800",
    darkText: "dark:text-neutral-300",
  },
  professional: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    darkBg: "dark:bg-blue-950/30",
    darkText: "dark:text-blue-300",
  },
  enterprise: {
    bg: "bg-green-50",
    text: "text-green-700",
    darkBg: "dark:bg-green-950/30",
    darkText: "dark:text-green-300",
  },
};

function getBarColor(percent: number): string {
  if (percent >= 0.8) return "bg-red-500";
  if (percent >= 0.6) return "bg-amber-500";
  return "bg-green-500";
}

function getTextColor(percent: number): string {
  if (percent >= 0.8) return "text-red-600 dark:text-red-400";
  if (percent >= 0.6) return "text-amber-600 dark:text-amber-400";
  return "text-green-600 dark:text-green-400";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TenantQuotaPanel({
  quota,
  packageName,
}: TenantQuotaPanelProps) {
  const userPercent =
    quota.maxUsers > 0 ? quota.currentUsers / quota.maxUsers : 0;
  const branchPercent =
    quota.maxBranches > 0 ? quota.currentBranches / quota.maxBranches : 0;
  const isNearLimit =
    userPercent >= QUOTA_WARNING_THRESHOLD ||
    branchPercent >= QUOTA_WARNING_THRESHOLD;

  const badgeColors = PACKAGE_BADGE_COLORS[packageName];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-neutral-400" />
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Penggunaan Kuota
          </span>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
            badgeColors.bg,
            badgeColors.text,
            badgeColors.darkBg,
            badgeColors.darkText,
          )}
        >
          {PACKAGE_LABELS[packageName]}
        </span>
      </div>

      {/* Warning */}
      {isNearLimit && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
            Mendekati batas kuota
          </p>
        </div>
      )}

      {/* User usage */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500">Pengguna</span>
          <span
            className={cn(
              "text-[11px] font-medium",
              getTextColor(userPercent),
            )}
          >
            {quota.currentUsers}/{quota.maxUsers}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              getBarColor(userPercent),
            )}
            style={{ width: `${Math.min(userPercent * 100, 100)}%` }}
          />
        </div>
        <span className="mt-0.5 block text-[10px] text-neutral-400">
          {Math.round(userPercent * 100)}%
        </span>
      </div>

      {/* Branch usage */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500">Cabang</span>
          <span
            className={cn(
              "text-[11px] font-medium",
              getTextColor(branchPercent),
            )}
          >
            {quota.currentBranches}/{quota.maxBranches}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              getBarColor(branchPercent),
            )}
            style={{ width: `${Math.min(branchPercent * 100, 100)}%` }}
          />
        </div>
        <span className="mt-0.5 block text-[10px] text-neutral-400">
          {Math.round(branchPercent * 100)}%
        </span>
      </div>

      {/* Products count */}
      <div className="flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <span className="text-[11px] text-neutral-500">Produk</span>
        <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
          {quota.maxProducts.toLocaleString("id-ID")} produk
        </span>
      </div>
    </div>
  );
}
