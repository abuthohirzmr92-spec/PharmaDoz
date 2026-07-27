-- ============================================================================
-- 053_sle_service_features.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 3A (GATE 2 of 5)
-- ============================================================================
-- Maps FEATURES (code registry keys) to SERVICES (service_catalog).
--
-- feature_key is UNIQUE GLOBALLY: a feature belongs to exactly one service.
-- This uniqueness is what lets feature_dependencies (054) FK to this table and
-- guarantees zero orphan dependency records (Product Owner Rev #1).
--
-- NOTE: rows are NOT seeded here. Feature keys are standardized (dot-notation)
-- in a later step; seeding mappings then avoids coupling to the rename now.
--
-- ADDITIVE · IDEMPOTENT · depends on service_catalog (052).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.service_features (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_key VARCHAR(50) NOT NULL REFERENCES public.service_catalog(service_key) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL UNIQUE,   -- global uniqueness: one feature → one service
    label       VARCHAR(120),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.service_features IS 'Feature-to-service mapping. feature_key is globally unique so feature_dependencies can reference it (no orphan deps).';
COMMENT ON COLUMN public.service_features.feature_key IS 'Registry feature key (e.g. inventory.fefo). Globally unique — a feature belongs to exactly one service.';

CREATE INDEX IF NOT EXISTS idx_service_features_service
    ON public.service_features (service_key);

ALTER TABLE public.service_features ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_features' AND policyname = 'service_features_select') THEN
        CREATE POLICY service_features_select ON public.service_features
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_features' AND policyname = 'service_features_write') THEN
        CREATE POLICY service_features_write ON public.service_features
            FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK: BEGIN; DROP TABLE IF EXISTS public.service_features CASCADE; COMMIT;
-- ============================================================================
