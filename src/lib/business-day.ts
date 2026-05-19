/* ------------------------------------------------------------------ */
/*  Business Day Utilities                                             */
/*  A business day runs from boundaryHour (e.g. 05:00) to the same    */
/*  hour the next day, accommodating pharmacy operations past midnight.*/
/* ------------------------------------------------------------------ */

import { BUSINESS_DAY_HOUR } from "@/config/constants";
import type { DailyBucket } from "@/types";

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/** Pad a number to at least 2 digits. */
function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Split "YYYY-MM-DD" into number tuple [year, month, day]. */
function parseBusinessDay(key: string): [number, number, number] {
  const parts = key.split("-");
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

/** Format a Date to "YYYY-MM-DD" using local time (not UTC). */
function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Returns the business day key as "YYYY-MM-DD".
 * When the current hour is **before** `boundaryHour`, the result is the
 * **previous** calendar day.  This handles overnight pharmacy shifts that
 * still belong to the prior business day.
 *
 * @param date         - The date to evaluate (default: `new Date()`).
 * @param boundaryHour - Hour (0-23) that separates business days (default: `BUSINESS_DAY_HOUR`).
 *
 * @example
 *   // At 2026-05-19 03:00 with boundary=5
 *   getBusinessDayKey()          // → "2026-05-18"
 *
 *   // At 2026-05-19 07:00 with boundary=5
 *   getBusinessDayKey()          // → "2026-05-19"
 */
export function getBusinessDayKey(date?: Date, boundaryHour?: number): string {
  const d = date ?? new Date();
  const hour = boundaryHour ?? BUSINESS_DAY_HOUR;

  if (d.getHours() < hour) {
    const prev = new Date(d);
    prev.setDate(d.getDate() - 1);
    return formatLocalDate(prev);
  }

  return formatLocalDate(d);
}

/**
 * Given a business day key, returns the exact `Date` range it covers.
 *
 * - **start**: `businessDay` at `boundaryHour:00:00.000` (local)
 * - **end**:   next calendar day at `boundaryHour:00:00.000` minus 1 ms (local),
 *              i.e. `boundaryHour - 1 :59:59.999`
 *
 * @param businessDay  - ISO date key in "YYYY-MM-DD" format.
 * @param boundaryHour - Hour (0-23) that separates business days (default: `BUSINESS_DAY_HOUR`).
 */
export function getBusinessDayRange(
  businessDay: string,
  boundaryHour?: number,
): { start: Date; end: Date } {
  const hour = boundaryHour ?? BUSINESS_DAY_HOUR;
  const [y, m, d] = parseBusinessDay(businessDay);

  const start = new Date(y, m - 1, d, hour, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, hour, 0, 0, -1);

  return { start, end };
}

/**
 * Formats a business day key into Indonesian locale.
 *
 * @example
 *   formatBusinessDay("2026-05-19")   // → "19 Mei 2026"
 */
export function formatBusinessDay(businessDay: string): string {
  const [y, m, d] = parseBusinessDay(businessDay);
  const date = new Date(y, m - 1, d);

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Returns a unique bucket identifier: `{pharmacyId}__{businessDay}`.
 *
 * @param pharmacyId   - The tenant pharmacy identifier.
 * @param businessDay  - Optional explicit business day key. When omitted,
 *                        the current business day is used.
 * @param boundaryHour - Hour (0-23) that separates business days (default: `BUSINESS_DAY_HOUR`).
 *
 * @example
 *   getDailyBucketId("pharm-001")               // → "pharm-001__2026-05-19"
 *   getDailyBucketId("pharm-001", "2026-05-18") // → "pharm-001__2026-05-18"
 */
export function getDailyBucketId(
  pharmacyId: string,
  businessDay?: string,
  boundaryHour?: number,
): string {
  const key = businessDay ?? getBusinessDayKey(new Date(), boundaryHour);
  return `${pharmacyId}__${key}`;
}

/**
 * Returns `true` when the daily bucket is still open (i.e. `closedAt` is `null`).
 */
export function isBusinessDayOpen(bucket: DailyBucket): boolean {
  return bucket.closedAt === null;
}

/**
 * Returns the current and previous business day keys.
 *
 * The **previous** key is the current key minus one calendar day.
 *
 * @param boundaryHour - Hour (0-23) that separates business days (default: `BUSINESS_DAY_HOUR`).
 */
export function getCurrentAndPreviousBusinessDay(
  boundaryHour?: number,
): { current: string; previous: string } {
  const current = getBusinessDayKey(new Date(), boundaryHour);

  const [y, m, d] = parseBusinessDay(current);
  const prevDate = new Date(y, m - 1, d - 1);

  return { current, previous: formatLocalDate(prevDate) };
}
