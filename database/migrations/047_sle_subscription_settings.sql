-- ============================================================================
-- 047_sle_subscription_settings.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 1
-- ============================================================================
-- Versioned, configuration-driven business rules for the SLE.
--
-- ALL business rules (trial duration, grace/read-only/suspend timing, reminder
-- schedule, renewal/billing policy, default trial package, payment providers)
-- are read from this table. NO hardcode. NO .env for business rules.
--
-- Rev #4 / #11 (Product Owner): supports policy scheduling via effective_from /
-- effective_until — e.g. "trial = 30d in August, 14d from September".
--
-- ADDITIVE · IDEMPOTENT · reuses is_super_admin() from prior migrations.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. subscription_settings — versioned key/value config
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscription_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key             VARCHAR(100) NOT NULL,
    value           JSONB NOT NULL DEFAULT '{}',
    description     TEXT,
    version         INTEGER NOT NULL DEFAULT 1,
    effective_from  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    updated_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One row per (key, version): re-seeding version 1 is idempotent.
    UNIQUE (key, version)
);

COMMENT ON TABLE public.subscription_settings IS 'Versioned, config-driven business rules for the Subscription Lifecycle Engine. Single source of truth — no hardcode.';
COMMENT ON COLUMN public.subscription_settings.key IS 'Setting key, dot-namespaced (e.g. trial.default_duration_days).';
COMMENT ON COLUMN public.subscription_settings.value IS 'JSONB value; shape depends on key.';
COMMENT ON COLUMN public.subscription_settings.version IS 'Monotonic version per key; active row = highest version within the effective window.';
COMMENT ON COLUMN public.subscription_settings.effective_from IS 'When this setting version starts to apply.';
COMMENT ON COLUMN public.subscription_settings.effective_until IS 'When this setting version stops applying (NULL = indefinitely).';

-- Active-setting lookup: WHERE key = ? AND effective_from <= now
--                        AND (effective_until IS NULL OR effective_until > now)
--                        ORDER BY version DESC LIMIT 1
CREATE INDEX IF NOT EXISTS idx_subscription_settings_key
    ON public.subscription_settings (key, effective_from DESC, version DESC);

-- --------------------------------------------------------------------------
-- 2. RLS — readable by authenticated users, writable by super_admin only
-- --------------------------------------------------------------------------

ALTER TABLE public.subscription_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_settings' AND policyname = 'subscription_settings_select') THEN
        CREATE POLICY subscription_settings_select ON public.subscription_settings
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_settings' AND policyname = 'subscription_settings_insert') THEN
        CREATE POLICY subscription_settings_insert ON public.subscription_settings
            FOR INSERT WITH CHECK (public.is_super_admin());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_settings' AND policyname = 'subscription_settings_update') THEN
        CREATE POLICY subscription_settings_update ON public.subscription_settings
            FOR UPDATE USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
    -- No DELETE policy: settings are versioned, never hard-deleted.
END $$;

-- --------------------------------------------------------------------------
-- 3. Seed default settings (version 1). App-layer defaults act as a safety net
--    if a row is ever missing, but this table is the source of truth.
-- --------------------------------------------------------------------------

INSERT INTO public.subscription_settings (key, value, description, version) VALUES
    ('trial.enabled',                '{"enabled": true}',                     'Master switch for trial signups',                 1),
    ('trial.default_duration_days',  '{"days": 14}',                          'Default trial length (overridable at approval)',  1),
    ('trial.approval_mode',          '{"mode": "manual"}',                    'manual | automatic',                              1),
    ('trial.default_plan_key',       '{"plan": "trial_basic"}',               'Default package assigned on trial approval',      1),
    ('grace.period_days',            '{"days": 7}',                           'Days in GRACE_PERIOD after expiry',               1),
    ('grace.read_only_days',         '{"days": 14}',                          'Days in READ_ONLY after grace',                   1),
    ('suspension.total_days',        '{"days": 21}',                          'Total days (grace+readonly) before SUSPENDED',    1),
    ('reminder.schedule',            '{"days_before": [7, 3, 0]}',            'Days before expiry to send reminders',            1),
    ('reminder.channels',            '{"channels": ["email"]}',               'Enabled reminder channels',                       1),
    ('billing.auto_suspend',         '{"enabled": true}',                     'Auto-suspend after suspension window',            1),
    ('billing.renewal_policy',       '{"mode": "auto"}',                      'auto | manual | disabled',                        1),
    ('billing.proration_policy',     '{"mode": "standard"}',                  'standard | instant | none',                       1),
    ('payment.retry.max_attempts',   '{"attempts": 3}',                       'Max automatic payment retries',                   1),
    ('payment.retry.backoff_hours',  '{"hours": [24, 72, 168]}',              'Escalating retry backoff before manual review',   1),
    ('payment.retry.action_on_fail', '{"action": "manual_review"}',           'Action after final failed retry',                 1),
    ('payment.providers.active',     '{"providers": ["midtrans"]}',           'Currently active payment providers',              1),
    ('payment.providers.available',  '{"providers": ["midtrans","xendit","flip","stripe"]}', 'Registered payment providers', 1),
    ('capability.cache.ttl_seconds', '{"seconds": 300}',                      'Capability snapshot cache TTL',                   1),
    ('capability.cache.strategy',    '{"strategy": "memory"}',                'memory | redis',                                  1)
ON CONFLICT (key, version) DO NOTHING;

COMMIT;

-- ============================================================================
-- ROLLBACK (manual, if ever needed):
-- ============================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS public.subscription_settings CASCADE;
-- COMMIT;
