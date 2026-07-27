# CR-002: Renewal & expired-reactivation support in the transition RPC

- **Date:** 2026-07-12
- **Requested by:** EEOS (Phase 5 implementation findings)
- **Layer affected:** Database (RPC function) — enables renewal & reactivation
- **Type:** Change Request
- **Status:** APPROVED (Product Owner) — prepare formal, do not implement yet.

## Reason
Batch 5D/5E proved the frozen `subscription_transition` RPC (migration 073)
cannot support two real billing flows:
1. **Renewal** — extending an active subscription records no `renewed` event
   because the RPC treats `from == to` as an idempotent no-op (no event emitted).
2. **Reactivation from `expired`** — the FSM has no `expired → active` edge, so
   paying an expired subscription cannot reactivate it directly.

## Impact
- **Object:** `CREATE OR REPLACE FUNCTION public.subscription_transition` (v2) —
  migration **074** (no table/column change).
- **Changes:**
  a. Allow an explicit **same-state event** for whitelisted event types (e.g.
     `renewed`) — emit the ledger event without requiring a state change.
  b. Add FSM edge **`expired → active`** (reactivation) to the allowed map.
  c. (Optional, atomic) accept `p_new_period_end` to extend `current_period_end`
     within the same transaction as the `renewed` event.
- **Downstream:** `BillingService` renewal path + `SubscriptionLifecycleService.renew`
  become fully supported; `SubscriptionRepository.extendPeriod` may be folded
  into the RPC for atomicity.
- **SoT matrix:** unchanged (still single-writer; RPC remains the only lifecycle writer).

## Alternatives
- Keep `extendPeriod` outside the RPC + skip the `renewed` event: rejected —
  loses the audit event; period+event not atomic.
- Add a separate `renewed`-only function: rejected — duplicates FSM logic;
  Single Writer prefers one function.

## Risk
- Classification: **MEDIUM** (RPC change; no data mutation on deploy).
- Zero-downtime: yes (CREATE OR REPLACE). Reversible: re-apply migration 073.
- Idempotency preserved: same-state event still guarded by correlation_id.
- Rollback: `DROP`/re-apply 073; renewal falls back to `extendPeriod` (no event).

## Recommendation
Implement as migration **074_sle_subscription_transition_v2.sql** (additive,
idempotent), under the standard gate (static + runtime PENDING). Then wire
`BillingService.renew()` and enable expired→active reactivation.

---
### Product Owner Decision
- [x] Approved — 2026-07-12. Prepare formal CR; do not implement yet.
