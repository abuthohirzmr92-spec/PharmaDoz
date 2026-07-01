// =================================================================
// Cash Rounding — Indonesian pharmacy cash payment rounding rule
// EEOS Business Rule — standalone helper, future-proof configurable
// =================================================================

/** Default rounding increment for cash payments (Rp100). */
export const DEFAULT_ROUNDING_INCREMENT = 100;

/**
 * Round UP to nearest increment for cash payments.
 *
 * Indonesian pharmacy standard: cash payments are rounded up
 * to eliminate small change (receh). Default increment = Rp100.
 *
 * Future: increment can be Rp500 or Rp1000 based on tenant config.
 *
 * Examples (increment=100):
 *   14.401 → 14.500
 *   14.450 → 14.500
 *   14.475 → 14.500
 *   14.500 → 14.500
 *   14.501 → 14.600
 *   34.994 → 35.000
 *
 * @param amount     Raw transaction total
 * @param increment  Rounding increment (default: 100)
 * @returns          Rounded amount (ceiling to nearest increment)
 */
export function roundUp(amount: number, increment: number = DEFAULT_ROUNDING_INCREMENT): number {
  return Math.ceil(amount / increment) * increment;
}

/**
 * Get the payment amount for display/input based on payment method.
 * Cash: rounded up using default increment.
 * All other methods: exact amount.
 *
 * Single source of truth for: Uang Pas, default amount, change calc, validation.
 */
export function getPaymentAmount(total: number, method: string): number {
  if (method === "cash") return roundUp(total);
  return total;
}
