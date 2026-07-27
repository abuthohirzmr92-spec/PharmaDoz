-- ============================================================================
-- 076_recover_missing_subscription_tables.sql
-- EEOS v2.0 — Production Recovery Migration
-- ============================================================================
-- RESTORES three tables originally created by migration 033 that are missing
-- from the production database: package_features, subscription_events, invoices.
--
-- Schema is IDENTICAL to migration 033 (same columns, types, FKs, CHECKs,
-- UNIQUEs, defaults, indexes, RLS policies). All statements are guarded by
-- IF NOT EXISTS or DO $$ IF NOT EXISTS. This migration is safe to run
-- repeatedly (fully idempotent).
--
-- RECOVERY RULES (Production First):
--   * CREATE TABLE IF NOT EXISTS — exact 033 schema.
--   * N0 UPDATE, NO INSERT, NO DELETE, NO SEED, NO data mutations of any kind.
--   * NO auto-assign package, NO migration safety UPDATE, NO cleanup UPDATE.
--   * COMMENT on every table, stating it was restored via recovery migration.
--   * Policies guarded via DO $$ IF NOT EXISTS — idempotent.
--   * Wrapped in BEGIN…COMMIT. Rollback = DROP TABLE IF EXISTS ×3.
-- ============================================================================

BEGIN;

-- =====================================================================
-- 1. package_features — Maps features to packages (from 033 Section 3)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.package_features (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id  UUID NOT NULL REFERENCES public.tenant_packages(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    is_enabled  BOOLEAN NOT NULL DEFAULT true,
    config      JSONB DEFAULT '{}',

    UNIQUE (package_id, feature_key)
);

COMMENT ON TABLE public.package_features IS 'RECOVERED by 076_recover_missing_subscription_tables.sql — originally created in migration 033. Maps feature keys to packages with enable/disable and optional config.';

CREATE INDEX IF NOT EXISTS idx_package_features_package
    ON public.package_features (package_id);
CREATE INDEX IF NOT EXISTS idx_package_features_key
    ON public.package_features (feature_key, is_enabled);

ALTER TABLE public.package_features ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'package_features' AND policyname = 'package_features_select') THEN
        CREATE POLICY package_features_select ON public.package_features
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'package_features' AND policyname = 'package_features_insert') THEN
        CREATE POLICY package_features_insert ON public.package_features
            FOR INSERT WITH CHECK (public.is_super_admin());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'package_features' AND policyname = 'package_features_update') THEN
        CREATE POLICY package_features_update ON public.package_features
            FOR UPDATE USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'package_features' AND policyname = 'package_features_delete') THEN
        CREATE POLICY package_features_delete ON public.package_features
            FOR DELETE USING (public.is_super_admin());
    END IF;
END $$;

-- =====================================================================
-- 2. subscription_events — Append-only lifecycle event log (033 Sec 4)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.subscription_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id     UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    event_type          VARCHAR(50) NOT NULL CHECK (event_type IN (
                            'trial_started', 'trial_ended', 'trial_converted',
                            'subscription_created', 'subscription_updated',
                            'upgraded', 'downgraded',
                            'suspended', 'reactivated',
                            'canceled', 'expired',
                            'renewed', 'package_changed'
                        )),
    previous_package_id UUID REFERENCES public.tenant_packages(id) ON DELETE SET NULL,
    new_package_id      UUID REFERENCES public.tenant_packages(id) ON DELETE SET NULL,
    actor_id            UUID,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.subscription_events IS 'RECOVERED by 076_recover_missing_subscription_tables.sql — originally created in migration 033. Append-only lifecycle event log.';

CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription
    ON public.subscription_events (subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_tenant
    ON public.subscription_events (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type
    ON public.subscription_events (event_type);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_events' AND policyname = 'subscription_events_select') THEN
        CREATE POLICY subscription_events_select ON public.subscription_events
            FOR SELECT USING (public.is_super_admin() OR public.has_tenant_access(tenant_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_events' AND policyname = 'subscription_events_insert') THEN
        CREATE POLICY subscription_events_insert ON public.subscription_events
            FOR INSERT WITH CHECK (public.is_super_admin() OR public.has_tenant_access(tenant_id));
    END IF;
END $$;

-- =====================================================================
-- 3. invoices — Billing invoices (033 Section 5)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    invoice_number  VARCHAR(100) UNIQUE NOT NULL,
    amount          DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency        VARCHAR(3) NOT NULL DEFAULT 'IDR',
    status          VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
                        'draft', 'sent', 'paid', 'overdue', 'canceled', 'refunded'
                    )),
    due_date        DATE,
    paid_at         TIMESTAMPTZ,
    payment_method  VARCHAR(50),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.invoices IS 'RECOVERED by 076_recover_missing_subscription_tables.sql — originally created in migration 033. Billing invoices (payment gateway ready).';

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON public.invoices (subscription_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_select') THEN
        CREATE POLICY invoices_select ON public.invoices
            FOR SELECT USING (public.has_tenant_access(tenant_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_insert') THEN
        CREATE POLICY invoices_insert ON public.invoices
            FOR INSERT WITH CHECK (public.is_super_admin());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_update') THEN
        CREATE POLICY invoices_update ON public.invoices
            FOR UPDATE USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK (manual, only if recovery must be reverted — safe, no data loss
-- since tables start empty):
-- BEGIN;
--   DROP TABLE IF EXISTS public.package_features CASCADE;
--   DROP TABLE IF EXISTS public.subscription_events CASCADE;
--   DROP TABLE IF EXISTS public.invoices CASCADE;
-- COMMIT;
-- ============================================================================
