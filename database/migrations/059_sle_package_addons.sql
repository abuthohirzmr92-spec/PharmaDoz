-- ============================================================================
-- 059_sle_package_addons.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 3B (GATE 3 of 5)
-- ============================================================================
-- Which add-ons a package offers, and whether they are optional or included.
--
-- ADDITIVE · IDEMPOTENT · depends on tenant_packages (exists) + addons (057).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.package_addons (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id   UUID NOT NULL REFERENCES public.tenant_packages(id) ON DELETE CASCADE,
    addon_key    VARCHAR(50) NOT NULL REFERENCES public.addons(addon_key) ON DELETE CASCADE,
    availability VARCHAR(20) NOT NULL DEFAULT 'optional'
                     CHECK (availability IN ('optional','included')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (package_id, addon_key)
);

COMMENT ON TABLE public.package_addons IS 'Add-ons offered per package: optional (purchasable) or included (bundled free).';

CREATE INDEX IF NOT EXISTS idx_package_addons_package ON public.package_addons (package_id);
CREATE INDEX IF NOT EXISTS idx_package_addons_addon ON public.package_addons (addon_key);

ALTER TABLE public.package_addons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'package_addons' AND policyname = 'package_addons_select') THEN
        CREATE POLICY package_addons_select ON public.package_addons
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'package_addons' AND policyname = 'package_addons_write') THEN
        CREATE POLICY package_addons_write ON public.package_addons
            FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK: BEGIN; DROP TABLE IF EXISTS public.package_addons CASCADE; COMMIT;
-- ============================================================================
