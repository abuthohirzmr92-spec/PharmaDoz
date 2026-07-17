import { BaseRepository, mapRow, mapRows } from "./base";

// ---------------------------------------------------------------------------
// SubscriptionRepository — subscription state + lifecycle event ledger
// ---------------------------------------------------------------------------
// Reads/writes subscriptions + subscription_events (migrations 009/033/050/071).
// lifecycle_state is the FSM SoT (dual-source: NULL = derive from `status`).
// Transaction Policy: REQUIRED (future) — see note on transition().
// ---------------------------------------------------------------------------

const LIFECYCLE_STATES = [
  "pending", "reviewing", "approved", "provisioning",
  "trial_active", "trial_expired", "converted", "rejected",
  "active", "expired", "grace_period", "read_only",
  "suspended", "archived", "terminated",
] as const;

export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

/** Pure: is `s` a known lifecycle state (mirrors the DB CHECK in migration 050)? */
export function isKnownLifecycleState(s: string): s is LifecycleState {
  return (LIFECYCLE_STATES as readonly string[]).includes(s);
}

export interface TimelineNode {
  eventType: string;
  previousPackageId: string | null;
  newPackageId: string | null;
  actorId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface EventRow {
  event_type: string;
  previous_package_id: string | null;
  new_package_id: string | null;
  actor_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** Pure: build an ascending timeline from raw subscription_events rows. */
export function buildTimeline(events: EventRow[]): TimelineNode[] {
  return [...events]
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .map((e) => ({
      eventType: e.event_type,
      previousPackageId: e.previous_package_id,
      newPackageId: e.new_package_id,
      actorId: e.actor_id,
      metadata: e.metadata ?? {},
      createdAt: e.created_at,
    }));
}

export interface SubscriptionRecord {
  id: string;
  tenantId: string;
  packageId: string;
  status: string;
  lifecycleState: string | null;
  subscriptionType: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd: string | null;
  graceUntil: string | null;
  readOnlyAt: string | null;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
}

export interface SweepCandidate {
  id: string;
  tenantId: string;
  lifecycleState: string;
  currentPeriodEnd: string;
  graceUntil: string | null;
  readOnlyAt: string | null;
}

export interface TransitionOptions {
  correlationId: string;                   // idempotency key (subscription+state+correlation)
  actorId?: string | null;
  eventType: string;                       // subscription_events.event_type
  reason?: string;
  trigger?: "manual" | "automatic" | "webhook" | "scheduler" | "system" | "approval" | "reject";
  previousPackageId?: string | null;
  newPackageId?: string | null;
  graceUntil?: string | null;
  readOnlyAt?: string | null;
  metadata?: Record<string, unknown>;
}

const SUBSCRIPTION_COLS =
  "id, tenant_id, package_id, status, lifecycle_state, subscription_type, " +
  "current_period_start, current_period_end, trial_end, grace_until, read_only_at, " +
  "auto_renew, cancel_at_period_end";

export class SubscriptionRepository extends BaseRepository {
  /** Current subscription for a tenant: prefer active/trialing/past_due, else latest. */
  async getCurrent(tenantId: string): Promise<SubscriptionRecord | null> {
    if (!this.isConnected) return null;
    const { data, error } = await this.client
      .from("subscriptions")
      .select(SUBSCRIPTION_COLS)
      .eq("tenant_id", tenantId)
      .order("current_period_end", { ascending: false });
    if (error) return this.handleError(error, "SubscriptionRepository.getCurrent");

    const rows = (data ?? []) as Record<string, unknown>[];
    if (rows.length === 0) return null;
    const preferred =
      rows.find((r) => ["active", "trialing", "past_due"].includes(r.status as string)) ?? rows[0];
    if (!preferred) return null;
    return mapRow<SubscriptionRecord>(preferred);
  }

  /**
   * Persist a lifecycle transition via the single-writer RPC (CR-001).
   *
   * `subscription_transition` is the ONLY authorized writer for
   * lifecycle_state / status / tenants.status / subscription_events. It enforces
   * the FSM, is atomic (state + event or rollback), idempotent (by
   * correlationId), and observable. This method is a thin wrapper and does NOT
   * write those columns directly.
   */
  async transition(
    subscriptionId: string,
    _tenantId: string,
    toState: string,
    opts: TransitionOptions,
  ): Promise<void> {
    if (!this.isConnected) return;
    if (!isKnownLifecycleState(toState)) {
      throw new Error(`Unknown lifecycle_state: ${toState}`);
    }

    const { error } = await this.client.rpc("subscription_transition", {
      p_subscription_id: subscriptionId,
      p_to_state: toState,
      p_correlation_id: opts.correlationId,
      p_event_type: opts.eventType,
      p_actor_id: opts.actorId ?? null,
      p_source: opts.trigger ?? "system",
      p_reason: opts.reason ?? null,
      p_previous_package_id: opts.previousPackageId ?? null,
      p_new_package_id: opts.newPackageId ?? null,
      p_grace_until: opts.graceUntil ?? null,
      p_read_only_at: opts.readOnlyAt ?? null,
      p_metadata: opts.metadata ?? {},
    });
    if (error) return this.handleError(error, "SubscriptionRepository.transition");
  }

  /** Subscriptions in a mutable lifecycle state — candidates for the sweep. */
  async listForSweep(limit = 500): Promise<SweepCandidate[]> {
    if (!this.isConnected) return [];
    const { data, error } = await this.client
      .from("subscriptions")
      .select("id, tenant_id, lifecycle_state, current_period_end, grace_until, read_only_at")
      .in("lifecycle_state", ["active", "trial_active", "expired", "trial_expired", "grace_period", "read_only"])
      .limit(limit);
    if (error) return this.handleError(error, "SubscriptionRepository.listForSweep");
    return mapRows<SweepCandidate>((data ?? []) as Record<string, unknown>[]);
  }

  /** Full lifecycle timeline for a tenant (from the event ledger). */
  async getTimeline(tenantId: string): Promise<TimelineNode[]> {
    if (!this.isConnected) return [];
    const { data, error } = await this.client
      .from("subscription_events")
      .select("event_type, previous_package_id, new_package_id, actor_id, metadata, created_at")
      .eq("tenant_id", tenantId);
    if (error) return this.handleError(error, "SubscriptionRepository.getTimeline");
    return buildTimeline((data ?? []) as EventRow[]);
  }

  /** Idempotency: does any event exist whose correlation_id starts with `prefix`? */
  async existsEventByCorrelation(tenantId: string, prefix: string): Promise<boolean> {
    if (!this.isConnected) return false;
    const { data, error } = await this.client
      .from("subscription_events")
      .select("id")
      .eq("tenant_id", tenantId)
      .like("metadata->>correlation_id", `${prefix}%`)
      .limit(1);
    if (error) return this.handleError(error, "SubscriptionRepository.existsEventByCorrelation");
    return ((data ?? []) as unknown[]).length > 0;
  }

  /**
   * Extend the billing period end (renewal). `current_period_end` is a
   * billing/temporal field, NOT part of the CR-001 single-writer lifecycle set,
   * so BillingService owns it. Does not touch lifecycle_state.
   */
  async extendPeriod(subscriptionId: string, newPeriodEndISO: string): Promise<void> {
    if (!this.isConnected) return;
    const { error } = await this.client
      .from("subscriptions")
      .update({ current_period_end: newPeriodEndISO, updated_at: new Date().toISOString() })
      .eq("id", subscriptionId);
    if (error) return this.handleError(error, "SubscriptionRepository.extendPeriod");
  }
}
