-- ============================================================================
-- 055_sle_package_services.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 3A (GATE 4 of 5)
-- ============================================================================
-- Packages activate SERVICES (ADR-31). Resolution: package_services →
-- service_features → feature_key. Replaces manual per-feature listing.
-- Consumed by FeatureResolver at Phase-2 (existing package_features remains a
-- valid override layer — dual-source, no conflict).
--
-- ADDITIVE · IDEMPOTENT · depends on tenant_packages (exists) + service_catalog (052).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.package_services (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id  UUID NOT NULL REFERENCES public.tenant_packages(id) ON DELETE CASCADE,
    service_key VARCHAR(50) NOT NULL REFERENCES public.service_catalog(service_key) ON DELETE CASCADE,
    is_enabled  BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (package_id, service_key)
);

COMMENT ON TABLE public.package_services IS 'Which services a package activates. Feature set resolves via service_features. No hardcoded per-feature listing.';

CREATE INDEX IF NOT EXISTS idx_package_services_package
    ON public.package_services (package_id);
CREATE INDEX IF NOT EXISTS idx_package_services_service
    ON public.package_services (service_key);

ALTER TABLE public.package_services ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'package_services' AND policyname = 'package_services_select') THEN
        CREATE POLICY package_services_select ON public.package_services
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'package_services' AND policyname = 'package_services_write') THEN
        CREATE POLICY package_services_write ON public.package_services
            FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK: BEGIN; DROP TABLE IF EXISTS public.package_services CASCADE; COMMIT;
-- ============================================================================
