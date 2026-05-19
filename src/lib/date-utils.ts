/* ------------------------------------------------------------------ */
/*  Date Range Helpers & Formatters                                   */
/* ------------------------------------------------------------------ */

import type { DateRange, DatePreset } from "@/types/report";

/** "2026-05-18" from ISO string — no TZ shift */
export function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

/** Start of today (midnight local) */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** End of today (23:59:59.999 local) */
export function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Start of a day N days ago */
export function daysAgoStart(n: number): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
}

/** Start of this week (Monday) */
export function startOfThisWeek(): Date {
  const d = startOfToday();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  d.setDate(d.getDate() - diff);
  return d;
}

/** Start of this month (1st) */
export function startOfThisMonth(): Date {
  const d = startOfToday();
  d.setDate(1);
  return d;
}

/** Preset → DateRange */
export function resolveDateRange(preset: DatePreset, customFrom?: string, customTo?: string): DateRange {
  const today = startOfToday();
  const end = endOfToday();

  switch (preset) {
    case "today":
      return { from: today, to: end, preset };
    case "yesterday":
      return { from: daysAgoStart(1), to: new Date(daysAgoStart(1).getTime() + 86_399_999), preset };
    case "thisWeek":
      return { from: startOfThisWeek(), to: end, preset };
    case "thisMonth":
      return { from: startOfThisMonth(), to: end, preset };
    case "last7":
      return { from: daysAgoStart(6), to: end, preset };
    case "last30":
      return { from: daysAgoStart(29), to: end, preset };
    case "custom":
      return {
        from: customFrom ? new Date(customFrom) : daysAgoStart(6),
        to: customTo ? new Date(customTo + "T23:59:59.999") : end,
        preset,
      };
  }
}

/** Preset labels for UI */
export const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: "Hari Ini", value: "today" },
  { label: "Kemarin", value: "yesterday" },
  { label: "Minggu Ini", value: "thisWeek" },
  { label: "Bulan Ini", value: "thisMonth" },
  { label: "7H Terakhir", value: "last7" },
  { label: "30H Terakhir", value: "last30" },
];

/** Format to Indonesian locale: "18 Mei 2026" */
export function formatDateID(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** Format to short ID: "18 Mei" */
export function formatShortDateID(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/** "Sen, 18 Mei 2026" */
export function formatFullDateID(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "Rp 1.500.000" */
export function formatCurrencyID(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

/** Get array of last N dates as strings "YYYY-MM-DD" */
export function lastNDateStrings(n: number): string[] {
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = daysAgoStart(i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

/** Check if an ISO date string falls within a DateRange */
export function isInRange(isoDate: string, range: DateRange): boolean {
  const d = new Date(isoDate);
  return d >= range.from && d <= range.to;
}
