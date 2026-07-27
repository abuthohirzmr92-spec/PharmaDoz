# Billing State Transition Matrix

Canonical cross-aggregate transitions. Each row is a supported end-to-end path;
Payment status drives Invoice status which drives (via BillingService →
SubscriptionLifecycleService) the Subscription lifecycle.

| Trigger (Payment) | Invoice | Subscription lifecycle | Owner of the write |
|-------------------|---------|------------------------|--------------------|
| success (trial checkout) | draft → **paid** | trial_active → converted → **active** | Billing (invoice) · Lifecycle (state, RPC) |
| success (reactivation) | sent → **paid** | grace_period / read_only / suspended → **active** | Billing · Lifecycle |
| success (renewal) | draft → **paid** | active → active (period extended) | Billing (invoice + period) · *('renewed' event = CR finding* |
| pending | draft/sent (unchanged) | unchanged | Billing (payment row pending) |
| failed / expired | sent → (later) **overdue** | unchanged; retry per policy | Billing (payment row failed) |
| refund | paid → **refunded** | (policy-dependent; e.g. suspend) | Billing |

## Rules
- Only **success** advances the invoice to `paid` and triggers a lifecycle
  activation/reactivation.
- Lifecycle changes go ONLY through the transition RPC (Single Writer); Billing
  requests them, it does not write lifecycle_state.
- `current_period_end` (billing/temporal field, NOT under the CR-001 single-writer
  set) is extended by Billing on renewal.
- Unsupported today (implementation findings → candidate CRs): a same-state
  `renewed` lifecycle event, reactivation directly from `expired`.
