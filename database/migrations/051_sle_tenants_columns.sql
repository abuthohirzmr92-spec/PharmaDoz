-- ============================================================================
-- 051_sle_tenants_columns.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 2 (GATE 3 of 3)
-- ============================================================================
-- ADDITIVE columns on tenants for the access-gate status (Tenant Status
-- domain), kept SEPARATE from existing is_active and onboarding_status.
--
-- SAFETY CONTRACT (per approved Final Data Audit):
--   * `status` DEFAULT NULL — deliberately NOT defaulted to 'active', because a
--     static default would misclassify suspended/trial tenants. Derived and
--     backfilled in Batch 4; NULL = "derive from subscription/is_active".
--   * DOES NOT touch is_active or onboarding_status (different concerns).
--   * No backfill. provision_tenant RPC NOT modified (status → NULL default).
--
-- ADDITIVE · IDEMPOTENT · reversible (see ROLLBACK).
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. Tenant access-gate status (backfilled @ Batch 4)
-- --------------------------------------------------------------------------
ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS status VARCHAR(20);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_tenants_status'
    ) THEN
        ALTER TABLE public.tenants
            ADD CONSTRAINT chk_tenants_status
            CHECK (status IS NULL
                   OR status IN ('active','trial','non_active','suspended','deleted'));
    END IF;
END $$;

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- --------------------------------------------------------------------------
-- 2. Comments
-- --------------------------------------------------------------------------
COMMENT ON COLUMN public.tenants.status IS 'Access-gate status: active|trial|non_active|suspended|deleted. Distinct from is_active (legacy bool) and onboarding_status. NULL until Batch 4 backfill (derive from subscription lifecycle).';
COMMENT ON COLUMN public.tenants.status_changed_at IS 'Timestamp of the last access-gate status change.';

-- --------------------------------------------------------------------------
-- 3. Index for platform dashboards (tenant counts by status)
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tenants_status
    ON public.tenants (status) WHERE status IS NOT NULL;

COMMIT;

-- ============================================================================
-- ROLLBACK (manual, if ever needed — safe, no data loss):
-- ============================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS public.idx_tenants_status;
-- ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS chk_tenants_status;
-- ALTER TABLE public.tenants DROP COLUMN IF EXISTS status_changed_at;
-- ALTER TABLE public.tenants DROP COLUMN IF EXISTS status;
-- COMMIT;
