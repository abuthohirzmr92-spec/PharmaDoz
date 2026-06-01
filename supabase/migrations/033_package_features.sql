-- ============================================================================
-- 033_package_features.sql
-- SaaS Package & Feature Management
--
-- Enhances the subscription/package system with:
--   package_features    — Maps features to packages (flexible feature assignment)
--   subscription_events — Append-only lifecycle event log
--   invoices            — Billing invoices (payment gateway ready)
--
-- Also enhances existing tables:
--   tenant_packages     — is_custom, feature_flags, sort_order
--   subscriptions       — previous_package_id, changed_at, changed_by
--
-- MIGRATION SAFETY: Auto-assigns basic package to any tenant without one.
--
-- IDEMPOTENT: safe to run multiple times.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. Enhance tenant_packages — allow custom packages + feature flags
-- --------------------------------------------------------------------------

-- is_custom: false for built-in 3 tiers, true for super-admin-created packages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenant_packages' AND column_name = 'is_custom'
    ) THEN
        ALTER TABLE tenant_packages ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- feature_flags: JSONB map of feature_key → enabled (overrides package_features)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenant_packages' AND column_name = 'feature_flags'
    ) THEN
        ALTER TABLE tenant_packages ADD COLUMN feature_flags JSONB DEFAULT '{}';
    END IF;
END $$;

-- sort_order: display ordering for package selection UIs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenant_packages' AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE tenant_packages ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Set default sort order for existing packages
UPDATE tenant_packages SET sort_order = 1 WHERE name = 'basic' AND sort_order = 0;
UPDATE tenant_packages SET sort_order = 2 WHERE name = 'professional' AND sort_order = 0;
UPDATE tenant_packages SET sort_order = 3 WHERE name = 'enterprise' AND sort_order = 0;

-- --------------------------------------------------------------------------
-- 2. Enhance subscriptions — track who changed what and when
-- --------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscriptions' AND column_name = 'previous_package_id'
    ) THEN
        ALTER TABLE subscriptions ADD COLUMN previous_package_id UUID REFERENCES tenant_packages(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscriptions' AND column_name = 'changed_at'
    ) THEN
        ALTER TABLE subscriptions ADD COLUMN changed_at TIMESTAMPTZ;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscriptions' AND column_name = 'changed_by'
    ) THEN
        ALTER TABLE subscriptions ADD COLUMN changed_by UUID;
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 3. package_features — Maps features to packages
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS package_features (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id  UUID NOT NULL REFERENCES tenant_packages(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    is_enabled  BOOLEAN NOT NULL DEFAULT true,
    config      JSONB DEFAULT '{}',

    UNIQUE (package_id, feature_key)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_package_features_package
    ON package_features (package_id);
CREATE INDEX IF NOT EXISTS idx_package_features_key
    ON package_features (feature_key, is_enabled);

-- RLS: Enable
ALTER TABLE package_features ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT — all authenticated users can see feature mappings
CREATE POLICY package_features_select ON package_features
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- RLS: INSERT — only super_admin
CREATE POLICY package_features_insert ON package_features
    FOR INSERT
    WITH CHECK (public.is_super_admin());

-- RLS: UPDATE — only super_admin
CREATE POLICY package_features_update ON package_features
    FOR UPDATE
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- RLS: DELETE — only super_admin
CREATE POLICY package_features_delete ON package_features
    FOR DELETE
    USING (public.is_super_admin());

-- --------------------------------------------------------------------------
-- 4. subscription_events — Append-only lifecycle log
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subscription_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id     UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type          VARCHAR(50) NOT NULL CHECK (event_type IN (
                            'trial_started', 'trial_ended', 'trial_converted',
                            'subscription_created', 'subscription_updated',
                            'upgraded', 'downgraded',
                            'suspended', 'reactivated',
                            'canceled', 'expired',
                            'renewed', 'package_changed'
                        )),
    previous_package_id UUID REFERENCES tenant_packages(id) ON DELETE SET NULL,
    new_package_id      UUID REFERENCES tenant_packages(id) ON DELETE SET NULL,
    actor_id            UUID,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription
    ON subscription_events (subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_tenant
    ON subscription_events (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type
    ON subscription_events (event_type);

-- RLS: Enable
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT — tenant users see own events, super_admin sees all
CREATE POLICY subscription_events_select ON subscription_events
    FOR SELECT
    USING (
        public.is_super_admin()
        OR public.has_tenant_access(tenant_id)
    );

-- RLS: INSERT — only super_admin can insert
CREATE POLICY subscription_events_insert ON subscription_events
    FOR INSERT
    WITH CHECK (public.is_super_admin() OR public.has_tenant_access(tenant_id));

-- RLS: No UPDATE or DELETE — append-only

-- --------------------------------------------------------------------------
-- 5. invoices — Billing invoices (payment gateway ready)
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices (subscription_id);

-- RLS: Enable
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT — tenant users see own invoices
CREATE POLICY invoices_select ON invoices
    FOR SELECT
    USING (public.has_tenant_access(tenant_id));

-- RLS: INSERT — super_admin only (manual invoice creation)
CREATE POLICY invoices_insert ON invoices
    FOR INSERT
    WITH CHECK (public.is_super_admin());

-- RLS: UPDATE — super_admin only
CREATE POLICY invoices_update ON invoices
    FOR UPDATE
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- RLS: No DELETE (invoices should never be deleted, only cancelled)

-- --------------------------------------------------------------------------
-- 6. Seed package_features — Map existing packages to feature keys
-- --------------------------------------------------------------------------

-- Feature keys reference (centralized in src/lib/features/registry.ts):
--   financial_wallet, cashflow_dashboard, ai_diagnostics, maintenance_automation,
--   advanced_reporting, stock_transfer, dashboard_analytics, white_label,
--   api_access, priority_support

DO $$
DECLARE
    basic_id UUID;
    prof_id UUID;
    ent_id UUID;
BEGIN
    SELECT id INTO basic_id FROM tenant_packages WHERE name = 'basic' LIMIT 1;
    SELECT id INTO prof_id FROM tenant_packages WHERE name = 'professional' LIMIT 1;
    SELECT id INTO ent_id FROM tenant_packages WHERE name = 'enterprise' LIMIT 1;

    -- Basic features (core operations only)
    IF basic_id IS NOT NULL THEN
        INSERT INTO package_features (package_id, feature_key, is_enabled, config) VALUES
            (basic_id, 'dashboard_analytics', false, '{}'),
            (basic_id, 'advanced_reporting', false, '{}'),
            (basic_id, 'stock_transfer', false, '{}'),
            (basic_id, 'financial_wallet', false, '{}'),
            (basic_id, 'cashflow_dashboard', false, '{}'),
            (basic_id, 'ai_diagnostics', false, '{}'),
            (basic_id, 'maintenance_automation', false, '{}'),
            (basic_id, 'white_label', false, '{}'),
            (basic_id, 'api_access', false, '{}'),
            (basic_id, 'priority_support', false, '{}')
        ON CONFLICT (package_id, feature_key) DO NOTHING;
    END IF;

    -- Professional features (analytics + advanced operations)
    IF prof_id IS NOT NULL THEN
        INSERT INTO package_features (package_id, feature_key, is_enabled, config) VALUES
            (prof_id, 'dashboard_analytics', true, '{}'),
            (prof_id, 'advanced_reporting', true, '{}'),
            (prof_id, 'stock_transfer', true, '{}'),
            (prof_id, 'financial_wallet', true, '{}'),
            (prof_id, 'cashflow_dashboard', false, '{}'),
            (prof_id, 'ai_diagnostics', false, '{}'),
            (prof_id, 'maintenance_automation', false, '{}'),
            (prof_id, 'white_label', false, '{}'),
            (prof_id, 'api_access', false, '{}'),
            (prof_id, 'priority_support', true, '{}')
        ON CONFLICT (package_id, feature_key) DO NOTHING;
    END IF;

    -- Enterprise features (everything enabled)
    IF ent_id IS NOT NULL THEN
        INSERT INTO package_features (package_id, feature_key, is_enabled, config) VALUES
            (ent_id, 'dashboard_analytics', true, '{}'),
            (ent_id, 'advanced_reporting', true, '{}'),
            (ent_id, 'stock_transfer', true, '{}'),
            (ent_id, 'financial_wallet', true, '{}'),
            (ent_id, 'cashflow_dashboard', true, '{}'),
            (ent_id, 'ai_diagnostics', true, '{}'),
            (ent_id, 'maintenance_automation', true, '{}'),
            (ent_id, 'white_label', true, '{}'),
            (ent_id, 'api_access', true, '{}'),
            (ent_id, 'priority_support', true, '{}')
        ON CONFLICT (package_id, feature_key) DO NOTHING;
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 7. MIGRATION SAFETY — auto-assign basic to tenants without package
-- --------------------------------------------------------------------------

DO $$
DECLARE
    basic_id UUID;
BEGIN
    SELECT id INTO basic_id FROM tenant_packages WHERE name = 'basic' LIMIT 1;

    IF basic_id IS NOT NULL THEN
        UPDATE tenants
        SET package_id = basic_id
        WHERE package_id IS NULL;

        RAISE NOTICE 'Assigned basic package to % tenants without a package.',
            (SELECT COUNT(*) FROM tenants WHERE package_id = basic_id);
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 8. Mark existing 3 packages as non-custom (protected from deletion)
-- --------------------------------------------------------------------------

UPDATE tenant_packages SET is_custom = false WHERE name IN ('basic', 'professional', 'enterprise');

COMMIT;
