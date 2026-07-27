-- ============================================================================
-- 068_sle_backfill_subscription_state.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 4 (GATE 2 of 6)
-- ============================================================================
-- BACKFILL subscriptions.subscription_type and lifecycle_state from legacy
-- `status` + `is_trial` + period span. DOES NOT modify `status` (dual-source).
--
-- IDEMPOTENT: every UPDATE guarded by "<col> IS NULL". Re-run = no-op.
-- RISK: MEDIUM — AM-1 (interval guessed from span) and AM-2 (canceled→terminated)
--       are surfaced via the Backfill Exception Report (warning severity).
-- ============================================================================

BEGIN;

-- 1. subscription_type — trials first (authoritative signal).
UPDATE public.subscriptions
SET subscription_type = 'trial'
WHERE subscription_type IS NULL
  AND (is_trial = true OR status = 'trialing');

-- 2. subscription_type — paid subs derived from billing period span (AM-1).
UPDATE public.subscriptions
SET subscription_type = CASE
        WHEN (current_period_end - current_period_start) <= INTERVAL '45 days'  THEN 'monthly'
        WHEN (current_period_end - current_period_start) <= INTERVAL '135 days' THEN 'quarterly'
        WHEN (current_period_end - current_period_start) <= INTERVAL '400 days' THEN 'yearly'
        ELSE 'lifetime'
    END
WHERE subscription_type IS NULL;

-- 3. lifecycle_state — deterministic map from commercial status (AM-2 for canceled).
UPDATE public.subscriptions
SET lifecycle_state = CASE status
        WHEN 'trialing' THEN 'trial_active'
        WHEN 'active'   THEN 'active'
        WHEN 'past_due' THEN 'grace_period'
        WHEN 'expired'  THEN 'expired'
        WHEN 'canceled' THEN 'terminated'
        ELSE 'active'
    END
WHERE lifecycle_state IS NULL;

COMMIT;

-- ============================================================================
-- ROLLBACK (safe — nulls derived columns; status/is_trial untouched):
-- BEGIN;
--   UPDATE public.subscriptions SET subscription_type = NULL, lifecycle_state = NULL;
-- COMMIT;
-- ============================================================================
