# ADR-SLE-032 — Trial Request Lifecycle (Complete)

## Status: ACCEPTED (documentation) — partial schema, additive expansion deferred

> Defines the COMPLETE trial-request lifecycle. The Phase-1 schema
> (`056_sle_trial_requests.sql`) currently enforces only the intake subset
> (`pending | reviewing | approved | rejected`). The remaining states are
> documented here and become enforced (via an additive CHECK expansion) only
> when the corresponding phases are implemented. No schema change now.

## Complete Lifecycle

```
PENDING        applicant submitted the trial form (public route, service-role write)
   ↓
REVIEWING      super admin opened / is evaluating the request
   ↓
APPROVED       approved; duration + plan + resource overrides chosen
   ↓
PROVISIONING   tenant + subscription being created (provision_tenant)     [FUTURE state]
   ↓
ACTIVE         trial is live (mirrors the resulting subscription)          [FUTURE state]
   ↓
EXPIRED        trial window ended without conversion                       [FUTURE state]
   ↓
CONVERTED      converted to a paid subscription                           [FUTURE state]

   ↘ (from PENDING/REVIEWING/APPROVED)
REJECTED       declined, with reject_reason
```

## State Ownership (important)

- **PENDING / REVIEWING / APPROVED / REJECTED** are owned by `trial_requests`
  (intake domain) — enforced today by the CHECK in migration 056.
- **PROVISIONING / ACTIVE / EXPIRED / CONVERTED** are fundamentally reflections
  of the **subscription lifecycle** (`subscriptions.lifecycle_state`). They are
  mirrored onto the trial request **only** for funnel analytics
  (trial → active → converted conversion rates on the platform dashboard).

This split keeps the intake queue focused while the subscription FSM stays the
single source of truth for what happens after provisioning.

## Schema Impact (deferred, additive)

When PROVISIONING/ACTIVE/EXPIRED/CONVERTED are needed:
- Expand the `trial_requests.status` CHECK additively (drop+recreate inside a
  transaction, mirroring the `subscription_events` CHECK-expansion pattern).
- Optionally add `converted_subscription_id UUID → subscriptions(id)` for the
  funnel join.

No backfill required; existing rows remain in the intake subset.

## Consequences

- **Now:** intake works with 4 states; funnel metrics beyond "approved" are
  derived from the subscription side.
- **Later:** the full 8-state funnel is available on `trial_requests` for
  analytics without redesign — a pure additive CHECK expansion.
