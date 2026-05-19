"use client";

import type { DatePreset, DateRange } from "@/types/report";
import { DATE_PRESETS, resolveDateRange } from "@/lib/date-utils";
import { cn } from "@/lib/cn";

interface ReportDateFilterProps {
  range: DateRange;
  onChange: (range: DateRange) => void;
}

export function ReportDateFilter({ range, onChange }: ReportDateFilterProps) {
  const handlePreset = (preset: DatePreset) => {
    onChange(resolveDateRange(preset));
  };

  const handleCustomFrom = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(resolveDateRange("custom", e.target.value, range.to.toISOString().slice(0, 10)));
  };

  const handleCustomTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(resolveDateRange("custom", range.from.toISOString().slice(0, 10), e.target.value));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {DATE_PRESETS.map((preset) => (
        <button
          key={preset.value}
          onClick={() => handlePreset(preset.value)}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
            range.preset === preset.value
              ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-300"
              : "border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 dark:border-neutral-700 dark:hover:text-neutral-300",
          )}
        >
          {preset.label}
        </button>
      ))}

      {/* Custom date inputs — shown when custom preset is active */}
      {range.preset === "custom" && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={range.from.toISOString().slice(0, 10)}
            onChange={handleCustomFrom}
            className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-700 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          />
          <span className="text-[11px] text-neutral-400">s/d</span>
          <input
            type="date"
            value={range.to.toISOString().slice(0, 10)}
            onChange={handleCustomTo}
            className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-700 focus:border-brand-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          />
        </div>
      )}
    </div>
  );
}
