# Service Observability Plan

Guides production monitoring in later phases. Defines, per domain service, the
structured logs, metrics, correlation, latency budget, error classes, and alert
thresholds. Not implemented yet — a contract for the monitoring layer.

## Conventions
- **Correlation ID:** every operation carries a `correlationId` (request id or
  cron `run_id`), propagated through service→repository calls and stamped into
  `subscription_events.metadata.context.request_id` and `notification_log`.
- **Structured logs:** JSON `{ ts, level, service, op, correlationId, tenantId?, subscriptionId?, durationMs, outcome, errorClass? }`.
- **Error classification:** `validation` (4xx-like, expected) · `conflict`
  (idempotency/duplicate) · `dependency` (DB/provider down) · `unexpected` (bug).

## ProvisionTenantService
- **Logs:** `provision.start/success/fail` with tenantId, slug, planId, actorId.
- **Metrics:** provisions/day, success rate, RPC latency, post-RPC reminder-schedule failures.
- **Correlation ID:** server-action request id.
- **Expected latency:** RPC < 800ms; full op < 1.5s.
- **Error classes:** `validation` (slug taken), `dependency` (RPC/DB), `unexpected`.
- **Alert threshold:** success rate < 98% (15m) → page; any `unexpected` → alert.

## SubscriptionLifecycleService
- **Logs:** `lifecycle.transition` with from→to, trigger, subscriptionId.
- **Metrics:** transitions/min by type, invalid-transition count, RPC latency, count by lifecycle_state.
- **Correlation ID:** request id or scheduler run_id.
- **Expected latency:** transition RPC < 300ms.
- **Error classes:** `validation` (invalid transition), `dependency`, `conflict` (idempotent re-apply).
- **Alert threshold:** invalid-transition spike or RPC p95 > 1s → alert; stuck-in-`grace_period` beyond config → warn.

## BillingService
- **Logs:** `billing.invoice_created`, `billing.payment_received/failed`, provider, amount, txnRef.
- **Metrics:** invoices/day, payment success rate, retry counts by attempt, MRR/ARR (derived), time-to-pay.
- **Correlation ID:** invoice id / webhook id.
- **Expected latency:** invoice calc < 200ms; provider calls async.
- **Error classes:** `dependency` (provider), `conflict` (dup webhook), `validation` (bad offer).
- **Alert threshold:** payment success < 90% (1h) → page; retries reaching `manual_review` → alert.

## ReminderService
- **Logs:** `reminder.scheduled/dispatched/failed` with kind, channels, subscriptionId.
- **Metrics:** scheduled/day, dispatched/day, delivery success by channel, retry rate.
- **Correlation ID:** scheduler run_id.
- **Expected latency:** dispatch per reminder < 500ms (excl. external channel).
- **Error classes:** `dependency` (channel), `unexpected`.
- **Alert threshold:** delivery success < 95% per channel → warn; dispatch backlog > threshold → alert.

## SchedulerService
- **Logs:** `scheduler.run_start/finish` with job_key, run_date, processed_count, error_count.
- **Metrics:** run duration, processed/run, error count, skipped-duplicate count.
- **Correlation ID:** `scheduler_runs.id` (the run_id) — propagated to all child ops.
- **Expected latency:** sweep < 60s for expected tenant volume.
- **Error classes:** `conflict` (duplicate run), `dependency`, `unexpected`.
- **Alert threshold:** a job missing its daily run → page; error_count > 0 with `unexpected` → alert.

## Cross-cutting
- Metrics feed the Platform Dashboard (Total tenants, Trial funnel, Grace/Suspended counts, MRR/ARR).
- All alerts route to the super-admin channel; thresholds are config-driven
  (future `subscription_settings.observability.*`), not hardcoded.
