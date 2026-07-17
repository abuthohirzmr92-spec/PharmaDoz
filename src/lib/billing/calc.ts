// ---------------------------------------------------------------------------
// Billing calculations (pure) — THE MONEY RULE
// ---------------------------------------------------------------------------
// All monetary math lives here (consumed only by BillingService). Repositories,
// gateways, promotion, scheduler and lifecycle MUST NOT calculate money.
// Pure functions — no I/O — fully unit-testable.
// ---------------------------------------------------------------------------

/** Round to 2 decimals (safe for currency arithmetic). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Prorated amount due when switching package mid-period:
 *   charge the new plan for the remaining fraction, credit the unused old plan.
 * Never negative (a credit surplus does not produce a refund here).
 */
export function computeProration(
  oldPrice: number,
  newPrice: number,
  daysRemaining: number,
  periodDays: number,
): number {
  if (periodDays <= 0) return 0;
  const frac = Math.max(0, Math.min(1, daysRemaining / periodDays));
  const unusedCredit = oldPrice * frac;
  const newProrated = newPrice * frac;
  return round2(Math.max(0, newProrated - unusedCredit));
}

export type OfferType = "percent" | "fixed" | "trial_extension";

export interface Offer {
  type: OfferType;
  value: number;
  maxDiscount?: number | null;
}

/**
 * Apply a validated offer (from Marketing) to an amount. Billing owns the math;
 * the discount can never exceed the amount, and trial_extension is money-neutral.
 */
export function applyDiscount(amount: number, offer: Offer): { discount: number; total: number } {
  let discount = 0;
  if (offer.type === "percent") {
    discount = amount * (offer.value / 100);
    if (offer.maxDiscount != null) discount = Math.min(discount, offer.maxDiscount);
  } else if (offer.type === "fixed") {
    discount = offer.value;
  } else {
    discount = 0; // trial_extension affects days, not money
  }
  discount = Math.max(0, Math.min(round2(discount), amount));
  return { discount, total: round2(amount - discount) };
}

/** Outstanding balance for an invoice: total minus amount paid (never negative). */
export function computeOutstanding(total: number, paid: number): number {
  return round2(Math.max(0, total - paid));
}

/**
 * Hours to wait before the next payment retry, given the number of attempts
 * already failed and the configured escalating backoff (e.g. [24,72,168]).
 * Returns null when retries are exhausted (→ manual review).
 */
export function nextRetryHours(failedAttempts: number, backoffHours: number[]): number | null {
  const idx = failedAttempts - 1;
  if (idx < 0 || idx >= backoffHours.length) return null;
  return backoffHours[idx] ?? null;
}

/**
 * Next billing period end given the current end and a billing interval.
 * Returns null for `lifetime` (no recurring end). Pure (UTC arithmetic).
 */
export function computeNextPeriodEnd(currentEndISO: string, interval: string): string | null {
  const d = new Date(currentEndISO);
  if (Number.isNaN(d.getTime())) return null;
  const r = new Date(d);
  switch (interval) {
    case "quarter":
      r.setUTCMonth(r.getUTCMonth() + 3);
      break;
    case "year":
      r.setUTCFullYear(r.getUTCFullYear() + 1);
      break;
    case "lifetime":
      return null;
    case "month":
    default:
      r.setUTCMonth(r.getUTCMonth() + 1);
      break;
  }
  return r.toISOString();
}

/**
 * Upgrade quote (Money Rule): prorated amount for the switch, minus an optional
 * validated discount. Delegates all arithmetic to the Money-layer helpers.
 */
export function computeUpgradeQuote(
  currentPrice: number,
  newPrice: number,
  daysRemaining: number,
  periodDays: number,
  offer?: Offer,
): { proration: number; discount: number; total: number } {
  const proration = computeProration(currentPrice, newPrice, daysRemaining, periodDays);
  if (!offer) return { proration, discount: 0, total: proration };
  const { discount, total } = applyDiscount(proration, offer);
  return { proration, discount, total };
}
