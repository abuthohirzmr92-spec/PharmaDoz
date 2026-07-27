-- ============================================================================
-- 071_sle_expand_subscription_events_check.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 4 (GATE 5 of 6)
-- ============================================================================
-- Expands subscription_events.event_type CHECK to the full SLE event set
-- (Rev #2/#6/#9). Superset of the original (033) list — accepts all existing
-- values, so no existing row is invalidated.
--
-- IDEMPOTENT: DROP CONSTRAINT IF EXISTS + guarded ADD. Re-run = no-op.
-- RISK: MEDIUM — constraint recreate (done inside a single transaction).
-- ============================================================================

BEGIN;

-- Drop the original inline CHECK (auto-named by Postgres in migration 033).
ALTER TABLE public.subscription_events
    DROP CONSTRAINT IF EXISTS subscription_events_event_type_check;

-- Add the expanded, explicitly-named constraint.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_subscription_events_event_type'
    ) THEN
        ALTER TABLE public.subscription_events
            ADD CONSTRAINT chk_subscription_events_event_type
            CHECK (event_type IN (
                -- original (033)
                'trial_started','trial_ended','trial_converted',
                'subscription_created','subscription_updated',
                'upgraded','downgraded',
                'suspended','reactivated',
                'canceled','expired',
                'renewed','package_changed',
                -- SLE additions
                'trial_requested','trial_reviewing','trial_approved','trial_rejected',
                'provisioning_started','provisioning_completed','trial_activated',
                'grace_started','read_only_started',
                'archived','terminated',
                'payment_received','reminder_sent','promotion_applied'
            ));
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK (restore the original 033 constraint set):
-- BEGIN;
--   ALTER TABLE public.subscription_events DROP CONSTRAINT IF EXISTS chk_subscription_events_event_type;
--   ALTER TABLE public.subscription_events ADD CONSTRAINT subscription_events_event_type_check
--     CHECK (event_type IN ('trial_started','trial_ended','trial_converted',
--       'subscription_created','subscription_updated','upgraded','downgraded',
--       'suspended','reactivated','canceled','expired','renewed','package_changed'));
-- COMMIT;
-- ============================================================================
