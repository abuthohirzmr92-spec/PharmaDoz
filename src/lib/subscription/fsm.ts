// ---------------------------------------------------------------------------
// Subscription Lifecycle FSM (pure, framework-agnostic)
// ---------------------------------------------------------------------------
// The single source of truth for allowed lifecycle transitions and for deriving
// the tenant access-gate status. Pure functions — no I/O — so the state machine
// is fully unit-testable without a database. Consumed by
// SubscriptionLifecycleService (Phase 3B) which persists transitions via RPC.
//
// States mirror the DB CHECK in migration 050.
// deriveAccessGate mirrors the backfill mapping in migration 069.
// ---------------------------------------------------------------------------

export const LIFECYCLE_STATES = [
  "pending", "reviewing", "approved", "provisioning",
  "trial_active", "trial_expired", "converted", "rejected",
  "active", "expired", "grace_period", "read_only",
  "suspended", "archived", "terminated",
] as const;

export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

/** Tenant access-gate status (mirrors tenants.status CHECK in migration 051). */
export type TenantAccessStatus = "active" | "trial" | "non_active" | "suspended" | "deleted";

/** Directed graph of allowed transitions. Package upgrade/downgrade keeps the
 *  same lifecycle state (only package_id changes), so it is not an edge here. */
export const ALLOWED_TRANSITIONS: Record<LifecycleState, readonly LifecycleState[]> = {
  pending: ["reviewing", "rejected"],
  reviewing: ["approved", "rejected"],
  approved: ["provisioning", "rejected"],
  provisioning: ["trial_active"],
  trial_active: ["converted", "trial_expired", "suspended"],
  trial_expired: ["grace_period", "terminated"],
  converted: ["active"],
  rejected: [],
  active: ["expired", "grace_period", "suspended", "terminated"],
  expired: ["grace_period"],
  grace_period: ["read_only", "active", "suspended"],
  read_only: ["active", "suspended"],
  suspended: ["active", "archived", "terminated"],
  archived: ["terminated"],
  terminated: [],
};

/** Pure: is `s` a known lifecycle state? */
export function isLifecycleState(s: string): s is LifecycleState {
  return (LIFECYCLE_STATES as readonly string[]).includes(s);
}

/** Pure: is the transition from → to allowed by the FSM? */
export function isAllowedTransition(from: string, to: string): boolean {
  if (!isLifecycleState(from) || !isLifecycleState(to)) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Pure: states reachable in one step from `from`. */
export function nextStates(from: LifecycleState): readonly LifecycleState[] {
  return ALLOWED_TRANSITIONS[from];
}

/** Pure: derive the tenant access-gate status from a lifecycle state. */
export function deriveAccessGate(state: LifecycleState): TenantAccessStatus {
  switch (state) {
    case "trial_active":
      return "trial";
    case "converted":
    case "active":
    case "grace_period": // still has access during grace
    case "read_only": // login allowed; write-block enforced at app layer
      return "active";
    case "suspended":
      return "suspended";
    case "pending":
    case "reviewing":
    case "approved":
    case "provisioning":
    case "trial_expired":
    case "expired":
    case "rejected":
    case "archived":
    case "terminated":
      return "non_active";
  }
}
