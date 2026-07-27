-- ============================================================================
-- 049_sle_tenant_packages_columns.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 2 (GATE 1 of 3)
-- ============================================================================
-- ADDITIVE columns on tenant_packages for package versioning, extensible
-- resource quotas, billing interval, and trial-package marking.
--
-- SAFETY CONTRACT (per approved Final Data Audit):
--   * Every column is nullable OR has a neutral DEFAULT — no NOT NULL without default.
--   * No backfill. No data mutation of existing columns.
--   * Existing max_users/max_branches/max_products REMAIN the source of truth
--     until the Phase-2 code cutover (resource_limits runs dual-source).
--   * provision_tenant RPC is NOT modified (columns fill via DEFAULT).
--
-- ADDITIVE · IDEMPOTENT (ADD COLUMN IF NOT EXISTS) · reversible (see ROLLBACK).
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. Extensible resource quotas (supersedes max_* at Phase-2 cutover)
--    Empty '{}' = "no override; fall back to max_* columns".
-- --------------------------------------------------------------------------
ALTER TABLE public.tenant_packages
    ADD COLUMN IF NOT EXISTS resource_limits JSONB NOT NULL DEFAULT '{}';

-- New quota dimensions requested by the blueprint (nullable = unset/unlimited).
ALTER TABLE public.tenant_packages
    ADD COLUMN IF NOT EXISTS max_storage_mb INTEGER;

ALTER TABLE public.tenant_packages
    ADD COLUMN IF NOT EXISTS max_cashier INTEGER;

-- --------------------------------------------------------------------------
-- 2. Billing interval (existing tiers are monthly-priced → default 'month')
-- --------------------------------------------------------------------------
ALTER TABLE public.tenant_packages
    ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20) DEFAULT 'month';

-- CHECK allows NULL (safety rule) plus the known interval set.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_tenant_packages_billing_interval'
    ) THEN
        ALTER TABLE public.tenant_packages
            ADD CONSTRAINT chk_tenant_packages_billing_interval
            CHECK (billing_interval IS NULL
                   OR billing_interval IN ('month','quarter','year','lifetime','custom'));
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 3. Package versioning (all existing packages become v1 / current)
-- --------------------------------------------------------------------------
ALTER TABLE public.tenant_packages
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.tenant_packages
    ADD COLUMN IF NOT EXISTS parent_package_id UUID
        REFERENCES public.tenant_packages(id) ON DELETE SET NULL;

ALTER TABLE public.tenant_packages
    ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.tenant_packages
    ADD COLUMN IF NOT EXISTS is_trial_package BOOLEAN NOT NULL DEFAULT false;

-- --------------------------------------------------------------------------
-- 4. Column comments
-- --------------------------------------------------------------------------
COMMENT ON COLUMN public.tenant_packages.resource_limits IS 'Extensible quota map {resource_key: limit}. Empty {} = fall back to max_* columns (dual-source until Phase-2 cutover).';
COMMENT ON COLUMN public.tenant_packages.max_storage_mb IS 'Storage quota (MB); NULL = unset. Mirrors resource_limits.storage_mb during transition.';
COMMENT ON COLUMN public.tenant_packages.max_cashier IS 'Cashier quota; NULL = unset.';
COMMENT ON COLUMN public.tenant_packages.billing_interval IS 'month | quarter | year | lifetime | custom. Default month for existing tiers.';
COMMENT ON COLUMN public.tenant_packages.version IS 'Package version within a family; existing tiers = 1.';
COMMENT ON COLUMN public.tenant_packages.parent_package_id IS 'Self-FK to the previous version of this package family; NULL for v1.';
COMMENT ON COLUMN public.tenant_packages.is_current IS 'True = the version offered to new customers for this family.';
COMMENT ON COLUMN public.tenant_packages.is_trial_package IS 'True = a trial-oriented package variant.';

-- --------------------------------------------------------------------------
-- 5. Helpful index for package-family / current lookups
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tenant_packages_family
    ON public.tenant_packages (name, version DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_packages_current
    ON public.tenant_packages (is_current) WHERE is_current = true;

COMMIT;

-- ============================================================================
-- ROLLBACK (manual, if ever needed — safe, no data loss):
-- ============================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS public.idx_tenant_packages_current;
-- DROP INDEX IF EXISTS public.idx_tenant_packages_family;
-- ALTER TABLE public.tenant_packages DROP CONSTRAINT IF EXISTS chk_tenant_packages_billing_interval;
-- ALTER TABLE public.tenant_packages DROP COLUMN IF EXISTS is_trial_package;
-- ALTER TABLE public.tenant_packages DROP COLUMN IF EXISTS is_current;
-- ALTER TABLE public.tenant_packages DROP COLUMN IF EXISTS parent_package_id;
-- ALTER TABLE public.tenant_packages DROP COLUMN IF EXISTS version;
-- ALTER TABLE public.tenant_packages DROP COLUMN IF EXISTS billing_interval;
-- ALTER TABLE public.tenant_packages DROP COLUMN IF EXISTS max_cashier;
-- ALTER TABLE public.tenant_packages DROP COLUMN IF EXISTS max_storage_mb;
-- ALTER TABLE public.tenant_packages DROP COLUMN IF EXISTS resource_limits;
-- COMMIT;
