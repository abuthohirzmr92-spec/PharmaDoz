"use client";

import type { TenantPackage } from "@/types";
import { cn } from "@/lib/cn";
import { getPackageLabel } from "@/lib/billing/package-limits";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface SubscriptionBadgeProps {
  packageName: TenantPackage;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Package badge colours                                               */
/* ------------------------------------------------------------------ */

const PACKAGE_COLORS: Record<TenantPackage, { bg: string; text: string; ring: string }> = {
  basic: {
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-700 dark:text-neutral-300",
    ring: "ring-neutral-300 dark:ring-neutral-600",
  },
  professional: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-300 dark:ring-blue-700",
  },
  enterprise: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-700 dark:text-purple-300",
    ring: "ring-purple-300 dark:ring-purple-700",
  },
};

/* ------------------------------------------------------------------ */
/*  Status dot colours                                                 */
/* ------------------------------------------------------------------ */

const STATUS_DOT: Record<string, string> = {
  active: "bg-green-500",
  trialing: "bg-blue-400",
  past_due: "bg-red-500",
  canceled: "bg-neutral-400 dark:bg-neutral-500",
  expired: "bg-neutral-400 dark:bg-neutral-500",
};

const STATUS_TEXT: Record<string, string> = {
  active: "text-green-700 dark:text-green-400",
  trialing: "text-blue-700 dark:text-blue-400",
  past_due: "text-red-700 dark:text-red-400",
  canceled: "text-neutral-500 dark:text-neutral-400",
  expired: "text-neutral-500 dark:text-neutral-400",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  trialing: "Masa Percobaan",
  past_due: "Tertunggak",
  canceled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SubscriptionBadge({ packageName, status }: SubscriptionBadgeProps) {
  const colors = PACKAGE_COLORS[packageName];
  const dotColor = STATUS_DOT[status] ?? "bg-neutral-400";
  const textColor = STATUS_TEXT[status] ?? "text-neutral-500";

  return (
    <div className="flex items-center gap-2">
      {/* Package name badge */}
      <span
        className={cn(
          "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
          colors.bg,
          colors.text,
          colors.ring,
        )}
      >
        {getPackageLabel(packageName)}
      </span>

      {/* Status indicator */}
      <span className="flex items-center gap-1">
        <span className={cn("inline-block h-2 w-2 rounded-full", dotColor)} />
        <span className={cn("text-xs font-medium", textColor)}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </span>
    </div>
  );
}
