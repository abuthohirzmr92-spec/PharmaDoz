# Scheduler Execution Policy (Official)

Governs all SLE cron jobs (Vercel Cron → `/api/cron/*` handlers → SchedulerService).

## Execution Frequency
| Job | Schedule (UTC, off-round) | Handler |
|-----|---------------------------|---------|
| `subscription_sweep` | `7 3 * * *` (~03:07) | `SchedulerService.runSubscriptionSweep` |
| `reminder_dispatch` | `17 3 * * *` (~03:17) | `SchedulerService.runReminderDispatch` |
| `autorenew` (Phase 5) | `27 3 * * *` (~03:27) | Billing autorenew |

Off-round minutes avoid the global `:00` cron stampede. Frequencies are the
default; they may later be driven by `subscription_settings`.

## Locking Strategy
- **Per-day advisory lock** via `scheduler_runs` `UNIQUE(job_key, run_date)`.
  `SchedulerRunRepository.startRun()` inserts the lock row; a duplicate insert
  (23505) returns `null` → the job **skips** (already ran/running that day).
- No external lock service required.

## Retry Policy
- **No in-run retry storms.** A per-item failure is caught, recorded in
  `scheduler_runs.errors`, and the batch continues.
- Failed items are **retried on the next scheduled run** (transitions are
  idempotent; the sweep re-evaluates state each run).
- External/money retries (payments) follow `payment.retry.*` config, not the
  scheduler.

## Timeout Policy
- Bounded by the Vercel function timeout (default 300s).
- Batches are size-limited (`listForSweep` limit = 500) so a run completes well
  within the window. If volume grows, paginate across runs (state guards keep
  it safe).

## Dead-Letter Strategy
- Per-item errors persist in `scheduler_runs.errors` (JSONB) with the entity id
  and message — a queryable dead-letter record.
- An item failing on N consecutive runs is surfaced to the super-admin
  manual-review queue (threshold config-driven).

## Overlap Prevention
- Same-day overlap is prevented by the `UNIQUE(job_key, run_date)` lock.
- Cron handlers should also be configured for a single concurrent invocation.
- Because every transition is idempotent, even an accidental double-fire cannot
  double-apply state or duplicate events.
