-- ============================================================================
-- 069_sle_backfill_tenant_status.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 4 (GATE 3 of 6)
-- ============================================================================
-- BACKFILL tenants.status (access gate) with layered precedence:
--   deleted_at → is_active=false → derive from current subscription → fallback.
-- DOES NOT modify is_active or onboarding_status (dual-source).
--
-- IDEMPOTENT: every UPDATE guarded by "status IS NULL". Re-run = no-op.
-- RISK: MEDIUM — AM-3 (no subscription) & AM-4 (is_active vs sub conflict)
--       surfaced via the Backfill Exception Report (critical severity).
-- Note: legacy 'expired' subscriptions map to 'non_active' (deny access) since
-- grace applicability is unknown historically — flagged for review.
-- ============================================================================

BEGIN;

-- 1. Soft-deleted tenants (highest precedence).
UPDATE public.tenants
SET status = 'deleted', status_changed_at = NOW()
WHERE status IS NULL AND deleted_at IS NOT NULL;

-- 2. Explicitly inactive tenants.
UPDATE public.tenants
SET status = 'non_active', status_changed_at = NOW()
WHERE status IS NULL AND is_active = false;

-- 3. Derive from the CURRENT subscription's lifecycle_state.
UPDATE public.tenants t
SET status = sub.gate, status_changed_at = NOW()
FROM (
    SELECT DISTINCT ON (s.tenant_id)
        s.tenant_id,
        CASE s.lifecycle_state
            WHEN 'trial_active'  THEN 'trial'
            WHEN 'active'        THEN 'active'
            WHEN 'grace_period'  THEN 'active'      -- still has access during grace
            WHEN 'read_only'     THEN 'active'      -- login allowed; write-block at app layer
            WHEN 'suspended'     THEN 'suspended'
            WHEN 'expired'       THEN 'non_active'  -- deny (grace history unknown) — flagged
            WHEN 'terminated'    THEN 'non_active'
            WHEN 'archived'      THEN 'non_active'
            ELSE 'active'
        END AS gate
    FROM public.subscriptions s
    ORDER BY s.tenant_id,
             CASE WHEN s.status IN ('active','trialing','past_due') THEN 0 ELSE 1 END,
             s.current_period_end DESC
) sub
WHERE t.status IS NULL AND t.id = sub.tenant_id;

-- 4. Remaining tenants with no subscription at all (AM-3).
UPDATE public.tenants
SET status = 'non_active', status_changed_at = NOW()
WHERE status IS NULL;

COMMIT;

-- ============================================================================
-- ROLLBACK (safe — nulls derived column; is_active/onboarding_status untouched):
-- BEGIN;
--   UPDATE public.tenants SET status = NULL, status_changed_at = NULL;
-- COMMIT;
-- ============================================================================
