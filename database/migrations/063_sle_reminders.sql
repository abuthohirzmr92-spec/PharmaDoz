-- ============================================================================
-- 063_sle_reminders.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 3C (GATE 2 of 5)
-- ============================================================================
-- Reminder Engine (Rev #8): channel-agnostic reminders with priority, retry,
-- template, channels, language, schedule. The Subscription Engine never knows
-- the delivery channel — it only schedules a reminder; channels are pluggable.
--
-- ADDITIVE · IDEMPOTENT · depends on subscriptions (exists) + tenants (exists).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.reminders (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id        UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    tenant_id              UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    kind                   VARCHAR(40) NOT NULL,   -- expiry_7d | expiry_3d | expiry_0d | grace_start | read_only_warning | ...
    priority               VARCHAR(10) NOT NULL DEFAULT 'normal'
                               CHECK (priority IN ('low','normal','high','critical')),
    channels               JSONB NOT NULL DEFAULT '["email"]',  -- email|whatsapp|in_app|push|webhook
    template_key           VARCHAR(100),
    language               VARCHAR(5) NOT NULL DEFAULT 'id',
    scheduled_for          TIMESTAMPTZ NOT NULL,
    sent_at                TIMESTAMPTZ,
    status                 VARCHAR(15) NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','sending','sent','failed','retrying')),
    max_retries            INTEGER NOT NULL DEFAULT 3,
    retry_count            INTEGER NOT NULL DEFAULT 0,
    retry_interval_minutes INTEGER NOT NULL DEFAULT 60,
    last_error             TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.reminders IS 'Channel-agnostic reminders. Subscription Engine schedules; delivery channels are pluggable adapters (Rev #8).';
COMMENT ON COLUMN public.reminders.channels IS 'JSON array of channels: email|whatsapp|in_app|push|webhook.';
COMMENT ON COLUMN public.reminders.kind IS 'Reminder type (expiry_7d, grace_start, ...); config-driven schedule from subscription_settings.';

CREATE INDEX IF NOT EXISTS idx_reminders_due
    ON public.reminders (scheduled_for) WHERE status IN ('pending','retrying');
CREATE INDEX IF NOT EXISTS idx_reminders_subscription ON public.reminders (subscription_id);
CREATE INDEX IF NOT EXISTS idx_reminders_tenant ON public.reminders (tenant_id);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reminders' AND policyname = 'reminders_select') THEN
        CREATE POLICY reminders_select ON public.reminders
            FOR SELECT USING (public.is_super_admin() OR public.has_tenant_access(tenant_id));
    END IF;
    -- Writes performed by the reminder dispatcher (super_admin / service role).
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reminders' AND policyname = 'reminders_write') THEN
        CREATE POLICY reminders_write ON public.reminders
            FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK: BEGIN; DROP TABLE IF EXISTS public.reminders CASCADE; COMMIT;
-- ============================================================================
