"use client";

import { Truck, DollarSign, Edit, StickyNote, Activity } from "lucide-react";
import { cn } from "@/lib/cn";
import { isDemoMode as checkDemoMode } from "@/config/env";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ActivityEntry {
  id: string;
  type: "purchase" | "payment" | "update" | "note";
  description: string;
  amount: number | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface SupplierActivityLogProps {
  supplierName: string;
}

/* ------------------------------------------------------------------ */
/*  Demo data factory                                                  */
/* ------------------------------------------------------------------ */

function generateDemoActivities(supplierName: string): ActivityEntry[] {
  const now = new Date();
  const daysAgo = (d: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return [
    {
      id: "act-1",
      type: "purchase",
      description: `Pembelian stok obat dari ${supplierName}`,
      amount: 2450000,
      createdAt: daysAgo(0),
    },
    {
      id: "act-2",
      type: "payment",
      description: `Pembayaran faktur #INV-2026-0421 kepada ${supplierName}`,
      amount: 2450000,
      createdAt: daysAgo(0),
    },
    {
      id: "act-3",
      type: "update",
      description: `Data kontak ${supplierName} diperbarui`,
      amount: null,
      createdAt: daysAgo(2),
    },
    {
      id: "act-4",
      type: "note",
      description: `Catatan: ${supplierName} memberikan diskon 5% untuk pembelian bulan ini`,
      amount: null,
      createdAt: daysAgo(3),
    },
    {
      id: "act-5",
      type: "purchase",
      description: `Pembelian alat kesehatan dari ${supplierName}`,
      amount: 875000,
      createdAt: daysAgo(5),
    },
    {
      id: "act-6",
      type: "payment",
      description: `Pembayaran faktur #INV-2026-0415 kepada ${supplierName}`,
      amount: 875000,
      createdAt: daysAgo(5),
    },
    {
      id: "act-7",
      type: "purchase",
      description: `Pembelian suplemen dari ${supplierName}`,
      amount: 1320000,
      createdAt: daysAgo(10),
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Icon + style map                                                   */
/* ------------------------------------------------------------------ */

const TYPE_CONFIG = {
  purchase: {
    icon: Truck,
    label: "Pembelian",
    dot: "bg-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-50 text-blue-600 dark:bg-blue-950/30",
  },
  payment: {
    icon: DollarSign,
    label: "Pembayaran",
    dot: "bg-green-500",
    bg: "bg-green-50 dark:bg-green-950/20",
    iconColor: "text-green-600 dark:text-green-400",
    badge: "bg-green-50 text-green-600 dark:bg-green-950/30",
  },
  update: {
    icon: Edit,
    label: "Perubahan",
    dot: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    iconColor: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-50 text-amber-600 dark:bg-amber-950/30",
  },
  note: {
    icon: StickyNote,
    label: "Catatan",
    dot: "bg-neutral-400",
    bg: "bg-neutral-50 dark:bg-neutral-800/50",
    iconColor: "text-neutral-500",
    badge: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function SupplierActivityLog({
  supplierName,
}: SupplierActivityLogProps) {
  const activities = checkDemoMode() ? generateDemoActivities(supplierName) : [];

  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <Activity className="mx-auto mb-2 h-6 w-6 text-neutral-300" />
        <p className="text-xs text-neutral-400">Belum ada aktivitas</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-neutral-400" />
          <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Aktivitas Supplier
          </h3>
        </div>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {activities.map((entry) => {
          const cfg = TYPE_CONFIG[entry.type];
          const Icon = cfg.icon;

          return (
            <div
              key={entry.id}
              className="flex items-start gap-3 px-4 py-3"
            >
              {/* Timeline dot + line */}
              <div className="flex flex-col items-center">
                <div className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.iconColor)} />
                    <span className={cn("rounded px-1 py-0.5 text-[9px] font-medium", cfg.badge)}>
                      {cfg.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 shrink-0">
                    {entry.createdAt}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300">
                  {entry.description}
                </p>
                {entry.amount !== null && (
                  <p className="mt-0.5 text-xs font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
                    Rp {entry.amount.toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
