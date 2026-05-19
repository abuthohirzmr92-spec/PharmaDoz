"use client";

import { Building2, Users, Store, Package } from "lucide-react";
import type { PlatformStats } from "@/types";

const STAT_CARDS = [
  {
    key: "totalPharmacies",
    label: "Total Apotek",
    icon: Building2,
  },
  {
    key: "totalUsers",
    label: "Total Pengguna",
    icon: Users,
  },
  {
    key: "pendingExpansions",
    label: "Permintaan Cabang",
    icon: Store,
  },
] as const;

export function PlatformStatCards({ stats }: { stats: PlatformStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {STAT_CARDS.map(({ key, label, icon: Icon }) => (
        <div
          key={key}
          className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-500">{label}</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
                {stats[key as keyof typeof stats] !== undefined
                  ? String(stats[key as keyof typeof stats])
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PlatformPackageCards({ stats }: { stats: PlatformStats }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {(
        [
          { key: "basic", label: "Basic" },
          { key: "professional", label: "Professional" },
          { key: "enterprise", label: "Enterprise" },
        ] as const
      ).map(({ key, label }) => (
        <div
          key={key}
          className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {label}
            </span>
          </div>
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {stats.activePackages[key]}
          </span>
        </div>
      ))}
    </div>
  );
}
