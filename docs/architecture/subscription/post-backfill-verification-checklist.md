# Post-Backfill Verification Checklist (Batch 4 Acceptance Criteria)

Run after the migration runner applies Batch 4 in staging. Every item must be
✅ (or explicitly waived) before Batch 4 is accepted. Runtime items require a
live database — they remain **PENDING** until executed by the runner.

## Subscriptions
- [ ] Every `subscriptions` row has non-NULL `lifecycle_state`.
- [ ] Every `subscriptions` row has non-NULL `subscription_type`.
- [ ] `status='trialing'` ⇒ `lifecycle_state='trial_active'` AND `subscription_type='trial'`.
- [ ] `status='canceled'` ⇒ `lifecycle_state='terminated'` (flagged in exception report).
- [ ] No row violates the `chk_subscriptions_lifecycle_state` / `_subscription_type` CHECK.
- [ ] Existing `status` column values are UNCHANGED (dual-source intact).

## Tenants
- [ ] Every `tenants` row has non-NULL `status`.
- [ ] `deleted_at IS NOT NULL` ⇒ `status='deleted'`.
- [ ] `is_active=false` ⇒ `status IN ('non_active','suspended','deleted')`.
- [ ] Tenants with no subscription ⇒ `status='non_active'` (listed in exception report).
- [ ] `is_active` UNCHANGED.

## Packages
- [ ] Every `tenant_packages` row has non-empty `resource_limits`.
- [ ] `resource_limits.users = max_users`, `.branches = max_branches`, `.products = max_products`.
- [ ] Packages with pre-existing manual `resource_limits` were NOT overwritten.
- [ ] `max_*` columns UNCHANGED (dual-source intact).

## Quota
- [ ] `tenant_quota_usage` has rows migrated from `tenant_quotas` (users, branches).
- [ ] `tenant_quotas` marked DEPRECATED (table comment) and NOT dropped.
- [ ] QuotaResolver (Phase-2) can read limit from package `resource_limits` with `max_override` fallback.

## Provisioning
- [ ] `provision_tenant` (updated) creates a tenant with `status='trial'`.
- [ ] New subscription has `lifecycle_state='trial_active'`, `subscription_type='trial'`.
- [ ] `trial_end` derives from `subscription_settings.trial.default_duration_days` (NOT hardcoded 14).
- [ ] `tenant_quota_usage` seeded (users=1, branches=1) for the new tenant.
- [ ] All legacy provisioning steps still succeed (pharmacy, branch, tenant_users, onboarding, activity_log).
- [ ] Provisioning is atomic (failure rolls back all writes).

## Reminder
- [ ] (If provisioning schedules reminders) reminders created per `reminder.schedule`.
- [ ] `reminders` are channel-agnostic (no channel logic in provisioning).

## Scheduler
- [ ] A dry-run of `subscription-sweep` transitions expired→grace→read_only→suspend using config timings.
- [ ] Re-running the same job on the same `run_date` is a no-op (UNIQUE job_key+run_date).
- [ ] `scheduler_runs` records each run with status + processed_count.

## Cross-cutting
- [ ] Backfill re-run (idempotency) produces zero additional changes.
- [ ] Exception report `critical = 0`.
- [ ] Rollback rehearsed: reverting Batch 4 restores prior behavior with no data loss.
