-- ============================================================================
-- 064_sle_notification_log.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 3C (GATE 3 of 5)
-- ============================================================================
-- Outbound notification audit — one row per delivery attempt, written by the
-- Reminder Engine. Read by the owner in-app notification center.
--
-- ADDITIVE · IDEMPOTENT · depends on tenants (exists) + reminders (063, nullable).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.notification_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    reminder_id   UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
    template_key  VARCHAR(100),
    channel       VARCHAR(20) NOT NULL,   -- email|whatsapp|in_app|push|webhook
    recipient     VARCHAR(200),
    payload       JSONB NOT NULL DEFAULT '{}',
    status        VARCHAR(15) NOT NULL DEFAULT 'sent'
                      CHECK (status IN ('sent','failed','delivered','read')),
    error_message TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notification_log IS 'Outbound notification audit (one row per delivery). Written by Reminder Engine; read by in-app notification center.';
COMMENT ON COLUMN public.notification_log.reminder_id IS 'Originating reminder; NULL for ad-hoc/system notifications.';

CREATE INDEX IF NOT EXISTS idx_notification_log_tenant ON public.notification_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_reminder ON public.notification_log (reminder_id);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_log' AND policyname = 'notification_log_select') THEN
        CREATE POLICY notification_log_select ON public.notification_log
            FOR SELECT USING (public.is_super_admin() OR public.has_tenant_access(tenant_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_log' AND policyname = 'notification_log_write') THEN
        CREATE POLICY notification_log_write ON public.notification_log
            FOR INSERT WITH CHECK (public.is_super_admin());
    END IF;
    -- Append-only: no UPDATE/DELETE policy (status transitions handled by writer role).
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK: BEGIN; DROP TABLE IF EXISTS public.notification_log CASCADE; COMMIT;
-- ============================================================================
