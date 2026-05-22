-- ============================================================================
-- 023_subscriptions_add_trial.sql
-- Medisync SaaS — Add is_trial flag to subscriptions
-- ============================================================================
-- Distinguishes trial subscriptions (created at provisioning) from paid ones.
-- Used by the billing system to track trial expiration and conversion.
-- ============================================================================

BEGIN;

ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;

-- Backfill: any existing subscription with status='trialing' is a trial
UPDATE public.subscriptions
SET is_trial = true
WHERE status = 'trialing' AND is_trial = false;

COMMIT;
