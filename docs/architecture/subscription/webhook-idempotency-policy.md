# Webhook Idempotency Policy

Payment providers retry webhooks. BillingService MUST process duplicate
deliveries safely: **no duplicate payments, no duplicate subscription
transitions, no duplicate invoice mutations.**

## Idempotency key
`correlationId = payment:<provider>:<providerReference>`

## Guarantees & mechanism (on the frozen schema)
1. **Lifecycle transitions** are idempotent by construction: each transition is
   invoked with a deterministic correlation id (`<correlationId>:<toState>`);
   the `subscription_transition` RPC rejects a duplicate
   `(subscription_id, target_state, correlation_id)` → no double transition.
2. **Replay guard:** before acting, BillingService checks the event ledger for
   any `subscription_events.metadata.correlation_id` starting with
   `correlationId`. If found → **no-op** (idempotent return). Transitions run
   BEFORE the payment row is written, so a replay is caught by existing events
   and never creates a duplicate payment.
3. **Invoice update** to `paid` is naturally idempotent (setting paid twice is
   the same state).

## Known limitation → candidate Change Request (per CR policy)
Bulletproof dedup for **non-success** webhooks (pending/failed replays) and for
a crash between the first transition and the payment insert would be strongest
with a dedicated idempotency key in the database — e.g. `payments.provider_ref`
(UNIQUE) or a `webhook_deliveries(provider, reference)` table.

Per EEOS CR policy we do **not** pre-emptively change the schema. Batch 5D
implements the event-ledger guard above; if production shows duplicate risk on
the non-success path, we raise a CR for a `webhook_deliveries` dedup table.
