// ---------------------------------------------------------------------------
// RC1 P0L.1 — Location Policy Engine
// ---------------------------------------------------------------------------
// PURE function. Zero side effects. Zero dependencies beyond types.
//
// Business policies that affect location interpretation.
// Current (RC1): NORMAL only — pass-through.
// Future (RC2): QUARANTINE, RECALL, EXPIRED, RETURN, HOLD.
//
// Extension: add new policy → add enum value + case in applyLocationPolicy().
// Zero consumer changes required.
// ---------------------------------------------------------------------------

import type { EffectiveLocation, LocationPolicy } from "./location-types";

// ============================================================================
// Policy Application
// ============================================================================

/**
 * Apply a business policy to an effective location.
 *
 * In RC1, only "NORMAL" is active — all other policies pass through.
 * In RC2, each policy can override display properties:
 *   - QUARANTINE → location is locked, override label
 *   - RECALL     → location shows recall status
 *   - EXPIRED    → batch moved to expired holding area
 *   - RETURN     → batch in return processing area
 *   - HOLD       → batch temporarily held
 *
 * @param location  The resolved effective location
 * @param policy    The policy to apply
 * @returns         EffectiveLocation with policy applied
 */
export function applyLocationPolicy(
  location: EffectiveLocation,
  policy: LocationPolicy,
): EffectiveLocation {
  switch (policy) {
    case "NORMAL":
      return location;

    // ─── RC2 Extension Points ───────────────────────────────────────
    // Each policy below is a STUB for RC2.
    // Implementation: replace the return with policy-specific logic.

    case "QUARANTINE":
      // RC2: override displayLabel with quarantine notice
      // location.displayLabel = `⚡ Karantina — ${location.name ?? location.id}`;
      return location;

    case "RECALL":
      // RC2: override displayLabel with recall notice
      // location.displayLabel = `🚨 Recall — ${location.name ?? location.id}`;
      return location;

    case "EXPIRED":
      // RC2: override displayLabel with expired notice
      // location.displayLabel = `⏰ Kadaluarsa — ${location.name ?? location.id}`;
      return location;

    case "RETURN":
      // RC2: override displayLabel with return notice
      // location.displayLabel = `↩ Retur — ${location.name ?? location.id}`;
      return location;

    case "HOLD":
      // RC2: override displayLabel with hold notice
      // location.displayLabel = `⏳ Tahan — ${location.name ?? location.id}`;
      return location;

    default:
      return location;
  }
}

// ============================================================================
// Policy Eligibility
// ============================================================================

/**
 * Check if a batch is eligible for a given policy.
 *
 * For example:
 *   - Only batches with location can be quarantined
 *   - Only active batches can be recalled
 *   - Only expired batches can use EXPIRED policy
 *
 * RC1: all policies return true (no validation yet).
 * RC2: add eligibility rules.
 */
export function isEligibleForPolicy(
  _location: EffectiveLocation,
  _policy: LocationPolicy,
): boolean {
  // RC1: All policies are pass-through — everything is eligible.
  // RC2: Add rules:
  //   - QUARANTINE: requires location.id !== null
  //   - EXPIRED: requires batch.expiredDate < now
  //   etc.
  return true;
}

// ============================================================================
// Policy Metadata
// ============================================================================

/** Human-readable labels for each policy. */
export const POLICY_LABELS: Record<LocationPolicy, string> = {
  NORMAL: "Normal",
  QUARANTINE: "Karantina",
  RECALL: "Recall",
  EXPIRED: "Kadaluarsa",
  RETURN: "Retur",
  HOLD: "Tahan",
};

/** Get the display label for a policy. */
export function getPolicyLabel(policy: LocationPolicy): string {
  return POLICY_LABELS[policy] ?? "Tidak Diketahui";
}
