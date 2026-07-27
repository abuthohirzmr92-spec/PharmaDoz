-- ============================================================================
-- 050_sle_subscriptions_columns.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 2 (GATE 2 of 3)
-- ============================================================================
-- ADDITIVE columns on subscriptions for the FSM lifecycle_state (new SoT,
-- populated at Batch 4), subscription_type, grace/read-only timing, and
-- renewal control.
--
-- SAFETY CONTRACT (per approved Final Data Audit):
--   * DOES NOT touch existing `status` column or its CHECK (009). Commercial
--     status remains authoritative until Batch 4 cutover — lifecycle_state
--     runs dual-source (NULL = derive from status).
--   * Semantic columns (subscription_type, lifecycle_state) DEFAULT NULL — a
--     single static default cannot be correct per-row; backfilled in Batch 4.
--   * System-behavior flags default to the safe value (auto_renew = false)
--     so no charge/renewal is ever triggered pre-billing.
--   * No backfill. provision_tenant RPC NOT modified (new columns → DEFAULT).
--
-- ADDITIVE · IDEMPOTENT · reversible (see ROLLBACK).
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. Commercial subscription type (backfilled from is_trial/interval @ Batch 4)
-- --------------------------------------------------------------------------
ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(20);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_subscriptions_subscription_type'
    ) THEN
        ALTER TABLE public.subscriptions
            ADD CONSTRAINT chk_subscriptions_subscription_type
            CHECK (subscription_type IS NULL
                   OR subscription_type IN ('trial','monthly','quarterly','yearly','lifetime','custom'));
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 2. FSM lifecycle_state (NEW source of truth; NULL until Batch 4 backfill)
--    Kept separate from existing `status` (commercial). CHECK allows NULL.
-- --------------------------------------------------------------------------
ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS lifecycle_state VARCHAR(30);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_subscriptions_lifecycle_state'
    ) THEN
        ALTER TABLE public.subscriptions
            ADD CONSTRAINT chk_subscriptions_lifecycle_state
            CHECK (lifecycle_state IS NULL
                   OR lifecycle_state IN (
                        'pending','reviewing','approved','provisioning',
                        'trial_active','trial_expired','converted','rejected',
                        'active','expired','grace_period','read_only',
                        'suspended','archived','terminated'
                   ));
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 3. Timing gates (NULL until computed by the engine)
-- --------------------------------------------------------------------------
ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS grace_until TIMESTAMPTZ;

ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS read_only_at TIMESTAMPTZ;

-- --------------------------------------------------------------------------
-- 4. Renewal control (safe defaults — never auto-charge pre-billing)
-- --------------------------------------------------------------------------
ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

-- --------------------------------------------------------------------------
-- 5. Comments
-- --------------------------------------------------------------------------
COMMENT ON COLUMN public.subscriptions.subscription_type IS 'trial|monthly|quarterly|yearly|lifetime|custom. NULL until Batch 4 backfill (derive from is_trial + package billing_interval).';
COMMENT ON COLUMN public.subscriptions.lifecycle_state IS 'FSM lifecycle state — the new source of truth. NULL = derive from status until Batch 4 backfill. Does NOT replace commercial status yet.';
COMMENT ON COLUMN public.subscriptions.grace_until IS 'Timestamp when GRACE_PERIOD ends; NULL if not applicable.';
COMMENT ON COLUMN public.subscriptions.read_only_at IS 'Timestamp when READ_ONLY started; NULL if not applicable.';
COMMENT ON COLUMN public.subscriptions.auto_renew IS 'Whether the subscription auto-renews. Default false (safe: no charge until billing live).';
COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS 'If true, cancel at the end of the current period instead of renewing.';

-- --------------------------------------------------------------------------
-- 6. Index for scheduler sweeps (lifecycle + timing lookups)
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_subscriptions_lifecycle_state
    ON public.subscriptions (lifecycle_state);
CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_until
    ON public.subscriptions (grace_until) WHERE grace_until IS NOT NULL;

COMMIT;

-- ============================================================================
-- ROLLBACK (manual, if ever needed — safe, no data loss):
-- ============================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS public.idx_subscriptions_grace_until;
-- DROP INDEX IF EXISTS public.idx_subscriptions_lifecycle_state;
-- ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS chk_subscriptions_lifecycle_state;
-- ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS chk_subscriptions_subscription_type;
-- ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS cancel_at_period_end;
-- ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS auto_renew;
-- ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS read_only_at;
-- ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS grace_until;
-- ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS lifecycle_state;
-- ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS subscription_type;
-- COMMIT;
