# Correlation ID Standard (Official)

Every SLE operation carries a correlation id so a transition can always be
traced to who/what triggered it.

## Format

```
<service>:<job|action>:<entity>:<discriminator>
```

- **service** — originating service (e.g. `scheduler`, `provision`, `billing`, `owner`).
- **job|action** — the job or action (e.g. `subscription_sweep`, `upgrade`, `approve`).
- **entity** — the primary entity id (usually `subscription_id` or `tenant_id`).
- **discriminator** — a value that makes the id **idempotency-meaningful**:
  a target lifecycle state (for transitions) or an ISO timestamp / request id.

### Examples
- Sweep transition: `scheduler:subscription_sweep:<subId>:read_only`
- Manual upgrade:   `owner:upgrade:<subId>:<requestId>`
- Provision:        `provision:approve:<tenantId>:<timestamp>`

> Implementation note: `SchedulerService` currently emits
> `<runId>:<subId>:<toState>`, where `runId` already encodes job + run_date.
> This is a compatible variant of the standard (job/date folded into runId,
> target-state as discriminator) and satisfies the idempotency contract
> `(subscription_id, target_state, correlation_id)`. Future refinement may
> expand it to the full `<service>:<job>:<entity>:<discriminator>` string.

## Generation
- **Scheduler:** derived from `scheduler_runs.id` (run) + entity + target state.
- **Server actions / owner UI:** the request id + action + entity.
- **Webhooks:** the provider event id.

## Propagation
- Passed as `correlationId` through Service → Repository → RPC parameter
  `p_correlation_id`.
- Never regenerated mid-flow — one id per logical operation.

## Logging
- Included in every structured log line as `correlationId` (see Observability Plan).

## Persistence
- Stored in `subscription_events.metadata.correlation_id` (queryable), and in
  `notification_log` for reminder/notification operations.
- The RPC uses it as the idempotency key: a duplicate
  `(subscription_id, target_state, correlation_id)` is a no-op.
