-- ============================================================================
-- 070_sle_migrate_quota_usage.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 4 (GATE 4 of 6)
-- ============================================================================
-- Migrate legacy tenant_quotas counters into tenant_quota_usage, and mark
-- tenant_quotas DEPRECATED (read-only). tenant_quotas is NOT dropped here —
-- Legacy Removal is a separate later phase.
--
-- IDEMPOTENT: INSERT ... ON CONFLICT (tenant_id, resource_key) DO NOTHING.
-- RISK: MEDIUM — legacy dual-key table; only rows with a valid tenant_id migrate.
-- ============================================================================

BEGIN;

-- Users counter
INSERT INTO public.tenant_quota_usage (tenant_id, resource_key, current_value)
SELECT tq.tenant_id, 'users', COALESCE(tq.current_users, 0)
FROM public.tenant_quotas tq
WHERE tq.tenant_id IS NOT NULL
ON CONFLICT (tenant_id, resource_key) DO NOTHING;

-- Branches counter
INSERT INTO public.tenant_quota_usage (tenant_id, resource_key, current_value)
SELECT tq.tenant_id, 'branches', COALESCE(tq.current_branches, 0)
FROM public.tenant_quotas tq
WHERE tq.tenant_id IS NOT NULL
ON CONFLICT (tenant_id, resource_key) DO NOTHING;

-- Deprecate the legacy table (read-only marker; not dropped).
COMMENT ON TABLE public.tenant_quotas IS 'DEPRECATED (Batch 4). Read-only. Source of truth moved to tenant_quota_usage + tenant_packages.resource_limits. Do not write.';

COMMIT;

-- ============================================================================
-- ROLLBACK (safe — removes only the migrated counter rows):
-- BEGIN;
--   DELETE FROM public.tenant_quota_usage WHERE resource_key IN ('users','branches');
--   COMMENT ON TABLE public.tenant_quotas IS NULL;
-- COMMIT;
-- ============================================================================
