"use client";

import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface QuotaProgressProps {
  label: string;
  current: number;
  max: number;
}

/* ------------------------------------------------------------------ */
/*  Colour helpers                                                     */
/* ------------------------------------------------------------------ */

function getBarColor(percent: number): string {
  if (percent > 0.85) return "bg-red-500";
  if (percent >= 0.6) return "bg-amber-500";
  return "bg-green-500";
}

function getTextColor(percent: number): string {
  if (percent > 0.85) return "text-red-600 dark:text-red-400";
  if (percent >= 0.6) return "text-amber-600 dark:text-amber-400";
  return "text-green-600 dark:text-green-400";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function QuotaProgress({ label, current, max }: QuotaProgressProps) {
  const percent = max > 0 ? current / max : 0;
  const displayPercent = Math.round(percent * 100);

  return (
    <div>
      {/* Label + numbers */}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {label}
        </span>
        <span className={cn("text-xs font-medium", getTextColor(percent))}>
          {current.toLocaleString("id-ID")}/{max.toLocaleString("id-ID")}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            getBarColor(percent),
          )}
          style={{ width: `${Math.min(displayPercent, 100)}%` }}
        />
      </div>

      {/* Percentage label */}
      <span className="mt-0.5 block text-[10px] text-neutral-400 dark:text-neutral-500">
        {displayPercent}%
      </span>
    </div>
  );
}
