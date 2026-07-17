import { nextRetryHours } from "./calc";

// ---------------------------------------------------------------------------
// Retry Engine (pure) — payment retry decisions
// ---------------------------------------------------------------------------
// Config-driven escalating backoff (payment.retry.backoff_hours, e.g.
// [24,72,168]) → retry with a wait, or escalate to manual review when the
// attempts are exhausted. Pure — the caller reads the config and current
// attempt count and applies the decision.
// ---------------------------------------------------------------------------

export interface RetryDecision {
  action: "retry" | "manual_review";
  waitHours?: number;
}

/**
 * Decide the next action after `failedAttempts` failed payment attempts, given
 * the configured escalating backoff. Returns a wait when a retry remains, or
 * a manual-review escalation when exhausted.
 */
export function decideRetry(failedAttempts: number, backoffHours: number[]): RetryDecision {
  const hours = nextRetryHours(failedAttempts, backoffHours);
  if (hours === null) return { action: "manual_review" };
  return { action: "retry", waitHours: hours };
}
