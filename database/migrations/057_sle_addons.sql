-- ============================================================================
-- 057_sle_addons.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 3B (GATE 1 of 5)
-- ============================================================================
-- Add-on catalog (Rev #2). An add-on is optional, sold on top of a package.
-- WHAT it grants is defined by addon_grants (058) — NOT hardcoded here.
-- Billing only ACTIVATES an add-on; capability resolution reads addon_grants.
--
-- ADDITIVE · IDEMPOTENT · reuses is_super_admin(). New table.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.addons (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    addon_key        VARCHAR(50) NOT NULL UNIQUE,
    label            VARCHAR(120) NOT NULL,
    description      TEXT,
    category         VARCHAR(50),
    price            DECIMAL(12,2) NOT NULL DEFAULT 0,
    billing_interval VARCHAR(20) DEFAULT 'month',
    is_active        BOOLEAN NOT NULL DEFAULT true,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_addons_billing_interval
        CHECK (billing_interval IS NULL
               OR billing_interval IN ('month','quarter','year','lifetime','custom'))
);

COMMENT ON TABLE public.addons IS 'Optional add-ons sold on top of a package. Capabilities come from addon_grants, not from this row.';

CREATE INDEX IF NOT EXISTS idx_addons_active ON public.addons (is_active, sort_order);

ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'addons' AND policyname = 'addons_select') THEN
        CREATE POLICY addons_select ON public.addons
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'addons' AND policyname = 'addons_write') THEN
        CREATE POLICY addons_write ON public.addons
            FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK: BEGIN; DROP TABLE IF EXISTS public.addons CASCADE; COMMIT;
-- ============================================================================
