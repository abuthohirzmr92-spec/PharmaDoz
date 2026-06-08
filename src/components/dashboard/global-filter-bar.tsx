"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { MetricPeriod, MetricFilter } from "@/hooks/use-owner-metrics";

/* ------------------------------------------------------------------ */
/*  GlobalFilterBar — Shared period toggle for dashboard               */
/* ------------------------------------------------------------------ */
/*  Supports preset periods + custom date range.                       */
/*  Controlled from page-level state for both Global & Branch views.   */
/* ------------------------------------------------------------------ */

interface Props {
  filter: MetricFilter;
  onChange: (filter: MetricFilter) => void;
}

const presets: { key: MetricPeriod; label: string }[] = [
  { key: "today", label: "Hari Ini" },
  { key: "week", label: "7 Hari" },
  { key: "month", label: "Bulan Ini" },
];

export function GlobalFilterBar({ filter, onChange }: Props) {
  const [showCustom, setShowCustom] = useState(filter.period === "custom");
  const from = filter.customFrom ?? "";
  const to = filter.customTo ?? "";

  const handlePreset = (period: MetricPeriod) => {
    if (period === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    onChange({ period });
  };

  const handleCustomApply = () => {
    if (from && to) {
      onChange({ period: "custom", customFrom: from, customTo: to });
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Overview operasional apotek — penjualan, stok, monitoring, dan finansial
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Period presets */}
        <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-900">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePreset(p.key)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors",
                filter.period === p.key && !showCustom
                  ? "bg-white shadow-sm text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
              )}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => handlePreset("custom")}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors",
              showCustom
                ? "bg-white shadow-sm text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
            )}
          >
            Custom
          </button>
        </div>

        {/* Custom date inputs */}
        {showCustom && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) =>
                onChange({ period: "custom", customFrom: e.target.value, customTo: to })
              }
              className="w-[130px] rounded-lg border border-neutral-200 px-2 py-1 text-[11px] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
            />
            <span className="text-[11px] text-neutral-400">s/d</span>
            <input
              type="date"
              value={to}
              onChange={(e) =>
                onChange({ period: "custom", customFrom: from, customTo: e.target.value })
              }
              className="w-[130px] rounded-lg border border-neutral-200 px-2 py-1 text-[11px] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
            />
            <button
              onClick={handleCustomApply}
              disabled={!from || !to}
              className="rounded-lg bg-brand-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Terapkan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
