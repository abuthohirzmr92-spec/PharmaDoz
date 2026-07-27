-- ============================================================================
-- 066_sle_integrations.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 3C (GATE 5 of 5)
-- ============================================================================
-- Integration Registry (Rev #8 / ADR-36): generalizes the adapter pattern.
-- Payment is a subtype (category='payment'); WhatsApp/Drive/BPJS/marketplace/
-- API register here too. Per-tenant installs (tenant_integrations) are DEFERRED
-- (postponed set) — they require secret handling.
--
-- ADDITIVE · IDEMPOTENT · no FK (registry root). New table.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.integrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_key VARCHAR(50) NOT NULL UNIQUE,
    category        VARCHAR(30) NOT NULL
                        CHECK (category IN ('payment','messaging','storage','health','marketplace','api')),
    label           VARCHAR(120) NOT NULL,
    description     TEXT,
    status          VARCHAR(15) NOT NULL DEFAULT 'available'
                        CHECK (status IN ('available','active','deprecated')),
    config_schema   JSONB NOT NULL DEFAULT '{}',   -- describes required config keys (no secrets stored here)
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.integrations IS 'Integration Registry — adapter catalog (payment/messaging/storage/health/marketplace/api). Per-tenant installs (tenant_integrations) deferred. Secrets never stored here.';
COMMENT ON COLUMN public.integrations.config_schema IS 'Declares required config keys for the adapter; actual secrets live in env/vault, referenced not stored.';

CREATE INDEX IF NOT EXISTS idx_integrations_category ON public.integrations (category, is_active);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integrations' AND policyname = 'integrations_select') THEN
        CREATE POLICY integrations_select ON public.integrations
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integrations' AND policyname = 'integrations_write') THEN
        CREATE POLICY integrations_write ON public.integrations
            FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

-- Seed the registry (all Coming Soon; only payment.midtrans intended active in Phase 5).
INSERT INTO public.integrations (integration_key, category, label, description, status, sort_order) VALUES
    ('payment.midtrans',    'payment',     'Midtrans',        'Payment gateway (QRIS, VA, e-wallet, card)', 'available', 1),
    ('payment.xendit',      'payment',     'Xendit',          'Payment gateway',                            'available', 2),
    ('payment.flip',        'payment',     'Flip',            'Bank transfer / disbursement',               'available', 3),
    ('payment.stripe',      'payment',     'Stripe',          'International card payments',                'available', 4),
    ('messaging.whatsapp',  'messaging',   'WhatsApp Gateway','Transactional WhatsApp notifications',       'available', 5),
    ('storage.google_drive','storage',     'Google Drive',    'Backup & document storage',                  'available', 6),
    ('health.bpjs',         'health',      'BPJS',            'Peserta verification & claims',              'available', 7),
    ('marketplace.default', 'marketplace', 'Marketplace',     'Online marketplace sync',                    'available', 8),
    ('api.webhook',         'api',         'Developer API',   'Webhooks & REST integration',                'available', 9)
ON CONFLICT (integration_key) DO NOTHING;

COMMIT;

-- ============================================================================
-- ROLLBACK: BEGIN; DROP TABLE IF EXISTS public.integrations CASCADE; COMMIT;
-- ============================================================================
