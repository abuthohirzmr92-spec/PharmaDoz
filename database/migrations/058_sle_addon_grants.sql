-- ============================================================================
-- 058_sle_addon_grants.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 3B (GATE 2 of 5)
-- ============================================================================
-- What each add-on GRANTS (Product Owner Rev #2): a feature, a service, or a
-- quota increment. Capability resolution reads this table — no hardcoded
-- feature mapping. Billing merely activates the add-on; grants define effect.
--
-- ADDITIVE · IDEMPOTENT · depends on addons (057).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.addon_grants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    addon_key   VARCHAR(50) NOT NULL REFERENCES public.addons(addon_key) ON DELETE CASCADE,
    grant_type  VARCHAR(20) NOT NULL CHECK (grant_type IN ('feature','service','quota_increment')),
    grant_key   VARCHAR(100) NOT NULL,   -- feature_key | service_key | resource_key
    grant_value JSONB NOT NULL DEFAULT '{}',  -- e.g. {"storage_mb": 5000} for quota_increment
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (addon_key, grant_type, grant_key)
);

COMMENT ON TABLE public.addon_grants IS 'Capabilities granted by an add-on: feature/service unlock or quota increment. Single source for add-on capability resolution.';
COMMENT ON COLUMN public.addon_grants.grant_key IS 'feature_key (registry), service_key (service_catalog), or resource_key (resource_definitions) depending on grant_type.';
COMMENT ON COLUMN public.addon_grants.grant_value IS 'For quota_increment: {resource_key: amount}. For feature/service: usually {} (presence = unlock).';

CREATE INDEX IF NOT EXISTS idx_addon_grants_addon ON public.addon_grants (addon_key);
CREATE INDEX IF NOT EXISTS idx_addon_grants_type ON public.addon_grants (grant_type, grant_key);

ALTER TABLE public.addon_grants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'addon_grants' AND policyname = 'addon_grants_select') THEN
        CREATE POLICY addon_grants_select ON public.addon_grants
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'addon_grants' AND policyname = 'addon_grants_write') THEN
        CREATE POLICY addon_grants_write ON public.addon_grants
            FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK: BEGIN; DROP TABLE IF EXISTS public.addon_grants CASCADE; COMMIT;
-- ============================================================================
