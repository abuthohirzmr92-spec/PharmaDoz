# CR-001: Atomic subscription lifecycle transition RPC

- **Date:** 2026-07-12
- **Requested by:** EEOS (Phase 3 implementation)
- **Layer affected:** Database (new function) + enables Phase 3B services
- **Type:** Change Request

## Reason
`SubscriptionLifecycleService` (Phase 3B) must move `subscriptions.lifecycle_state`
AND append a `subscription_events` row **atomically** (Transaction Policy:
REQUIRED). The Supabase JS client cannot span an UPDATE + INSERT in one DB
transaction — the Batch-2B `SubscriptionRepository.transition()` documents this
as a known limitation (state could update without its event on partial failure).
A `SECURITY DEFINER` RPC resolves this, matching the existing `provision_tenant`
pattern.

## Impact
- **New object:** `public.subscription_transition(...)` PL/pgSQL function.
  Also (optionally) sets `tenants.status = deriveAccessGate(to_state)` inside the
  same transaction so the access gate never drifts from lifecycle_state.
- **Tables written (existing):** `subscriptions` (lifecycle_state, updated_at),
  `subscription_events` (append), `tenants` (status, status_changed_at).
- **No schema/column changes** — function only. No table migration.
- **Downstream:** `SubscriptionRepository.transition()` becomes a thin wrapper
  over the RPC; `SubscriptionLifecycleService` and `SchedulerService` depend on it.
- **SoT matrix:** unchanged (still dual-source until Phase-2 reader cutover).

## Alternatives
- **Do nothing / keep non-atomic 2B path:** rejected — violates the REQUIRED
  transaction contract; risks state/event drift.
- **Client-side compensation (delete state update if event insert fails):**
  rejected — not truly atomic; racy.
- **Postgres trigger auto-appending events:** rejected — hides intent, harder to
  pass actor/reason metadata; explicit RPC is clearer and matches provision_tenant.

## Risk
- Classification: **MEDIUM** (new function; no data mutation on deploy).
- Zero-downtime: **yes** (additive function; nothing calls it until 3B ships).
- Reversible: **yes** (`DROP FUNCTION IF EXISTS`; wrapper falls back to 2B path).
- Idempotent: transition RPC is safe to re-invoke (guards on current state).
- Rollback plan: drop the function; revert `SubscriptionRepository.transition()`
  to the 2B two-statement implementation.

## Recommendation
Approve as migration **073_sle_subscription_transition_fn.sql** (additive,
idempotent `CREATE OR REPLACE FUNCTION`, `REVOKE`/`GRANT` like migration 024),
validated under the standard gate (static + runtime PENDING). Implement Phase 3B
(`SubscriptionLifecycleService`, then `SchedulerService`) on top of it.

---

### Product Owner Decision
- [x] Approved (with refinements) — 2026-07-12
- Notes: Single-Writer Principle, FSM enforcement, atomic state+event, idempotency
  by (subscription_id, target_state, correlation_id), full observability metadata.
  **Option A chosen:** NO `suspended_at` / `expires_at` columns. `subscriptions`
  holds current state only; `subscription_events` is the historical source of
  truth. Official temporal fields: current_period_end, grace_until, read_only_at,
  canceled_at, lifecycle_state. Implemented as migration **073**.
