# Runtime Validation Checklist — SLE Migrations 047–072 (Staging / QA)

Executed by the migration runner + QA in staging AFTER applying each migration,
in order. Every box stays unchecked until verified against a live database.
Acceptance gate for Phase 1 runtime: all boxes ✅ and Backfill Exception
Report `critical = 0`.

> Apply strictly in ascending order. 071 MUST precede 072.

## Batch 1 — Config Foundation
- [ ] **047** `subscription_settings` created; 19 seed keys present; RLS: authenticated read, super_admin write.
- [ ] **047** Active-setting query returns the highest version within the effective window.
- [ ] **048** `resource_definitions` created; 9 resources seeded; RLS correct.

## Batch 2 — Additive Columns
- [ ] **049** `tenant_packages`: resource_limits='{}', version=1, is_current=true, is_trial_package=false, billing_interval='month' on all existing rows; CHECK allows NULL.
- [ ] **049** Existing `package.ts` INSERT (max_*) still succeeds (new cols default).
- [ ] **050** `subscriptions`: subscription_type/lifecycle_state NULL; auto_renew=false; existing `status` + CHECK unchanged.
- [ ] **051** `tenants`: status NULL; is_active/onboarding_status unchanged.
- [ ] **049–051** `provision_tenant` (v1, pre-072) still succeeds with columns defaulting.

## Batch 3A — Core Subscription Domain
- [ ] **052** `service_catalog` + 9 services seeded.
- [ ] **053** `service_features`; `feature_key` UNIQUE enforced.
- [ ] **054** `feature_dependencies`; inserting a dep for an UNREGISTERED feature is REJECTED (anti-orphan proof); self-dependency rejected.
- [ ] **055** `package_services` FK to packages + services works.
- [ ] **056** `trial_requests`; RLS super_admin-only; status CHECK (pending/reviewing/approved/rejected).

## Batch 3B — Commercial Domain
- [ ] **057** `addons`; billing_interval CHECK allows NULL.
- [ ] **058** `addon_grants` FK→addons; grant_type CHECK.
- [ ] **059** `package_addons` FK→packages/addons; availability CHECK.
- [ ] **060** `package_bundle` FK→packages; included_addons JSONB.
- [ ] **061** `marketing_promotions`; type/value CHECK; unique code.

## Batch 3C — Platform Services
- [ ] **062** `tenant_quota_usage` FK→tenants/resource_definitions; UNIQUE(tenant,resource); tenant reads own rows.
- [ ] **063** `reminders` FK→subscriptions/tenants; priority/status CHECK; channels JSONB.
- [ ] **064** `notification_log` FK→tenants/reminders; append-only insert.
- [ ] **065** `scheduler_runs`; UNIQUE(job_key,run_date) blocks duplicate same-day run.
- [ ] **066** `integrations` + 9 adapters seeded; category/status CHECK.

## Batch 4 — Backfill + RPC
- [ ] **067** Every package has non-empty resource_limits matching max_*; manual maps untouched; re-run = 0 changes.
- [ ] **068** Every subscription has subscription_type + lifecycle_state; trialing→trial_active/trial; canceled→terminated (exception report warning); re-run = 0 changes.
- [ ] **069** Every tenant has status; deleted_at→deleted; is_active=false→non_active; no-subscription→non_active (critical in report); re-run = 0 changes.
- [ ] **070** `tenant_quota_usage` has users/branches rows from `tenant_quotas`; `tenant_quotas` comment = DEPRECATED; not dropped.
- [ ] **071** `subscription_events` accepts new event types; all existing rows still valid (superset).
- [ ] **072** provision_tenant v2 verification (below).

## Provisioning Verification (072)
- [ ] Provision a test tenant → returns tenant_id + subscription_id.
- [ ] tenant.status='trial'; subscription lifecycle_state='trial_active', subscription_type='trial'.
- [ ] trial_end = NOW() + subscription_settings `trial.default_duration_days` (NOT 14 hardcoded — verify by changing config).
- [ ] `tenant_quota_usage` seeded users=1, branches=1; `tenant_quotas` also written (dual-write).
- [ ] `subscription_events` has a `trial_activated` row with schema_version=1 metadata.
- [ ] All legacy steps present (pharmacy, branch, tenant_users, profile link, onboarding, activity_log).
- [ ] Failure mid-provision rolls back ALL writes (atomic).
- [ ] Rollback rehearsal: re-apply 024 restores v1 RPC.

## Scheduler Verification (design-level; engine lands in Phase 4)
- [ ] `scheduler_runs` insert with UNIQUE(job_key,run_date) prevents double-run.
- [ ] A dry-run sweep transitions using config timings (grace.period_days, grace.read_only_days, suspension.total_days).

## Reminder Verification (structure; dispatcher lands in Phase 8)
- [ ] `reminders` row insertable with channels JSONB + priority + language.
- [ ] `notification_log` records a delivery row referencing a reminder.

## Cross-cutting
- [ ] Full range 047–072 applied cleanly in order on a fresh staging clone.
- [ ] Re-applying the entire range is idempotent (no errors, no changes).
- [ ] Backfill Exception Report generated; `critical = 0`; warnings triaged.
