// ---------------------------------------------------------------------------
// Quota forecast (presentation-only ViewModel) — simple linear estimate (PURE)
// ---------------------------------------------------------------------------
// No prediction engine, no persistence, no scheduler. A lightweight "at current
// growth" estimate for the quota dashboard. Always returns a safe upper bound
// or null when insufficient data / unlimited. NEVER duplicates quota rules.
// ---------------------------------------------------------------------------

export interface ForecastResult {
  daysToLimit: number | null; // null when unlimited or no growth trend
  message: string;
}

/** Pure: simple forecast from two snapshots (daysApart) + current usage. */
export function forecastUsage(
  previousCurrent: number,
  current: number,
  daysApart: number,
  max: number | null,
): ForecastResult {
  if (!max || max <= 0) return { daysToLimit: null, message: "Kuota tidak terbatas." };
  if (current >= max!) return { daysToLimit: 0, message: "Kuota sudah mencapai batas." };
  const delta = current - previousCurrent;
  if (daysApart <= 0 || delta <= 0) return { daysToLimit: null, message: "Data tidak cukup untuk estimasi." };
  const dailyRate = delta / daysApart;
  const remaining = max - current;
  const est = Math.ceil(remaining / dailyRate);
  return { daysToLimit: est, message: `Pada pertumbuhan saat ini, kuota diperkirakan mencapai batas dalam waktu sekitar ${est} hari.` };
}
