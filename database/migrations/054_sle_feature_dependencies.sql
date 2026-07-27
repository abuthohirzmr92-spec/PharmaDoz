-- ============================================================================
-- 054_sle_feature_dependencies.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 3A (GATE 3 of 5)
-- ============================================================================
-- Feature dependency graph (ADR-21). A feature may require other features
-- (e.g. ai.ocr requires ai.assistant + integration.api + inventory.fefo).
--
-- REFERENTIAL CONSISTENCY (Product Owner Rev #1): both feature_key and
-- requires_feature_key FK to service_features(feature_key). Because that column
-- is globally UNIQUE, a dependency can only reference a REGISTERED feature —
-- orphan dependency records are impossible.
--
-- ADDITIVE · IDEMPOTENT · depends on service_features (053).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.feature_dependencies (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key          VARCHAR(100) NOT NULL
                             REFERENCES public.service_features(feature_key) ON DELETE CASCADE,
    requires_feature_key VARCHAR(100) NOT NULL
                             REFERENCES public.service_features(feature_key) ON DELETE CASCADE,
    dependency_type      VARCHAR(20) NOT NULL DEFAULT 'required'
                             CHECK (dependency_type IN ('required','optional')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (feature_key, requires_feature_key),
    -- A feature cannot depend on itself.
    CONSTRAINT chk_feature_dependencies_no_self CHECK (feature_key <> requires_feature_key)
);

COMMENT ON TABLE public.feature_dependencies IS 'Directed feature dependency graph. Both keys FK to service_features(feature_key) (globally unique) — guarantees no orphan dependencies (Rev #1).';
COMMENT ON COLUMN public.feature_dependencies.dependency_type IS 'required = must also be enabled; optional = enhances but not mandatory.';

CREATE INDEX IF NOT EXISTS idx_feature_dependencies_feature
    ON public.feature_dependencies (feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_dependencies_requires
    ON public.feature_dependencies (requires_feature_key);

ALTER TABLE public.feature_dependencies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feature_dependencies' AND policyname = 'feature_dependencies_select') THEN
        CREATE POLICY feature_dependencies_select ON public.feature_dependencies
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feature_dependencies' AND policyname = 'feature_dependencies_write') THEN
        CREATE POLICY feature_dependencies_write ON public.feature_dependencies
            FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK: BEGIN; DROP TABLE IF EXISTS public.feature_dependencies CASCADE; COMMIT;
-- ============================================================================
