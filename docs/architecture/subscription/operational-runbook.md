# SLE Operational Runbook (Production Operations Guide)

Procedures for diagnosing and recovering SLE incidents. Every recovery path is
safe because transitions are idempotent and the RPC is atomic.

Quick references: `scheduler_runs` (job history/errors), `subscription_events`
(lifecycle ledger, filter by `metadata.correlation_id`), `notification_log`
(reminder delivery), `trial_requests` (intake).

---

## 1. Provision failure
**Symptoms:** super-admin provisioning returns error; tenant not visible.
**Diagnose:** check the server-action error; query `tenants` by slug; check `activity_logs` for `tenant.provision`.
**Recover:**
- RPC failure → the DB transaction rolled back everything; no partial tenant. Retry (fix slug collision if `slug_already_taken`).
- Auth user was created but RPC failed → the server action compensates by deleting the auth user; if cleanup failed, **manually delete** the orphaned auth user, then retry.
**Escalate:** if RPC succeeds but tenant unusable → super-admin investigates `subscription_events` for the tenant.

## 2. Scheduler failure
**Symptoms:** expected daily job missing; `scheduler_runs` shows `failed` or no row.
**Diagnose:** inspect `scheduler_runs` for `job_key`/`run_date`, read `errors` JSONB.
**Recover:**
- Job did not run → re-invoke the cron handler; `startRun` guard makes re-run safe.
- Job ran with per-item errors → items retry automatically next run (state guards). Manually re-run if urgent.
- Stuck lock (row `running` never finished) → safe: next day acquires a new `run_date`; for same-day, clear only after confirming no live invocation.
**Escalate:** repeated per-item failures for the same subscription → manual review.

## 3. Reminder failure
**Symptoms:** reminders not delivered; `notification_log` shows `failed`.
**Diagnose:** check `reminders.status`/`retry_count`/`last_error`; `notification_log.error_message`.
**Recover:** dispatcher retries up to `max_retries` at `retry_interval_minutes`. Non-critical — never blocks lifecycle.
**Escalate:** channel outage (all sends failing) → notify integration owner; reminders resume when channel recovers.

## 4. RPC failure (subscription_transition)
**Symptoms:** transition throws.
**Diagnose:** read the error code/message:
- `illegal_transition: X -> Y` → the FSM rejected it (expected guard). Verify the intended target; do not force.
- `subscription_not_found` → wrong id.
- `not_authorized_to_transition` → caller lacks super_admin / not a server context.
- dependency error → DB/connection.
**Recover:** re-invoke with the **same** `correlationId` — idempotent (no duplicate event). For a legitimately stuck state, a super-admin performs an explicit allowed transition.

## 5. Retry (reference)
| Path | Policy |
|------|--------|
| Lifecycle transitions | idempotent re-invoke (no backoff) |
| Scheduler items | retried next scheduled run |
| Reminders | `max_retries` × `retry_interval_minutes` |
| Payments (Phase 5) | 24h → 72h → 168h → manual_review (config) |

## 6. Manual recovery
- **Force a lifecycle correction:** super-admin calls `subscription_transition` with a fresh `correlationId`, a valid target per FSM, `reason` describing the intervention (auditable in the ledger).
- **Re-provision:** delete the failed tenant/auth artifacts, re-run provisioning with a unique slug.
- **Reconcile drift:** recompute `tenants.status` from `lifecycle_state` via `deriveAccessGate` (a reconciliation job).

## 7. Escalation
- Payment retries reaching `manual_review` → super-admin billing queue.
- A daily job missing entirely → page (see Observability alert thresholds).
- Repeated `unexpected` errors → engineering escalation.
- All routes go to the super-admin channel; thresholds are config-driven.

---
**Golden rule:** prefer **idempotent re-invoke** over manual SQL. Never hand-edit
`subscriptions`/`tenants`/`subscription_events` directly — always go through the
`subscription_transition` RPC (Single Writer Principle).
