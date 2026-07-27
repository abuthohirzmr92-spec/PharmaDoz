-- ============================================================================
-- 060_sle_package_bundle.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 3B (GATE 4 of 5)
-- ============================================================================
-- Named bundle = a base package offered together with a set of add-ons at a
-- (optional) special price. Sells combinations without creating new packages.
--
-- included_addons is a JSONB list of addon_key strings (soft reference,
-- validated at the application/seed layer). A hard join table is intentionally
-- deferred (not in the approved Batch 3B scope) to avoid scope creep.
--
-- ADDITIVE · IDEMPOTENT · depends on tenant_packages (exists) + addons (057).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.package_bundle (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_key      VARCHAR(50) NOT NULL UNIQUE,
    label           VARCHAR(120) NOT NULL,
    description     TEXT,
    package_id      UUID NOT NULL REFERENCES public.tenant_packages(id) ON DELETE CASCADE,
    included_addons JSONB NOT NULL DEFAULT '[]',   -- ["whatsapp","ai_ocr"] (soft ref to addons.addon_key)
    price_override  DECIMAL(12,2),                 -- NULL = sum of components
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.package_bundle IS 'Package + add-ons bundle offering. included_addons = JSONB list of addon_key (app-validated). Hard join table deferred by scope.';
COMMENT ON COLUMN public.package_bundle.included_addons IS 'Array of addon_key strings included in the bundle; validated against addons at app/seed layer.';
COMMENT ON COLUMN public.package_bundle.price_override IS 'Fixed bundle price; NULL = compute from package + add-on prices.';

CREATE INDEX IF NOT EXISTS idx_package_bundle_package ON public.package_bundle (package_id);
CREATE INDEX IF NOT EXISTS idx_package_bundle_active ON public.package_bundle (is_active, sort_order);

ALTER TABLE public.package_bundle ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'package_bundle' AND policyname = 'package_bundle_select') THEN
        CREATE POLICY package_bundle_select ON public.package_bundle
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'package_bundle' AND policyname = 'package_bundle_write') THEN
        CREATE POLICY package_bundle_write ON public.package_bundle
            FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK: BEGIN; DROP TABLE IF EXISTS public.package_bundle CASCADE; COMMIT;
-- ============================================================================
