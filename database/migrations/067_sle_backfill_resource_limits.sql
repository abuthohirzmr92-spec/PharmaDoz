-- ============================================================================
-- 067_sle_backfill_resource_limits.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 4 (GATE 1 of 6)
-- ============================================================================
-- BACKFILL (touches existing data). Derives tenant_packages.resource_limits
-- from the legacy max_* columns. DUAL-SOURCE: max_* remain untouched.
--
-- IDEMPOTENT: only fills rows where resource_limits is still '{}' — never
-- overwrites a manually-edited limit map. Re-running is a no-op.
-- RISK: LOW (deterministic mapping).
-- ============================================================================

BEGIN;

UPDATE public.tenant_packages
SET resource_limits =
        jsonb_build_object(
            'users',    max_users,
            'branches', max_branches,
            'products', max_products
        )
        || CASE WHEN max_storage_mb IS NOT NULL
                THEN jsonb_build_object('storage_mb', max_storage_mb) ELSE '{}'::jsonb END
        || CASE WHEN max_cashier IS NOT NULL
                THEN jsonb_build_object('cashiers', max_cashier) ELSE '{}'::jsonb END
WHERE resource_limits = '{}'::jsonb;

COMMIT;

-- ============================================================================
-- ROLLBACK (safe — reverts derived values to empty; max_* untouched):
-- BEGIN;
--   UPDATE public.tenant_packages SET resource_limits = '{}'::jsonb
--   WHERE resource_limits ?& array['users','branches','products'];
-- COMMIT;
-- ============================================================================
