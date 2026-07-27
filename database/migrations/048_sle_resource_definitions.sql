-- ============================================================================
-- 048_sle_resource_definitions.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 1
-- ============================================================================
-- Catalog of quota-able resources (Rev #2 — Extensible Resource Quota).
--
-- Adding a new quota type in the future = INSERT one row here + reference the
-- key in tenant_packages.resource_limits JSONB. NO schema redesign required.
--
-- This table is the ALLOWLIST that validates keys used in resource_limits and
-- tenant_quota_usage (introduced in a later Batch).
--
-- ADDITIVE · IDEMPOTENT · reuses is_super_admin().
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. resource_definitions — catalog of quotable resources
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.resource_definitions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_key VARCHAR(50) NOT NULL UNIQUE,
    label        VARCHAR(100) NOT NULL,
    unit         VARCHAR(20) NOT NULL DEFAULT 'count',   -- count | mb | requests
    description  TEXT,
    category     VARCHAR(50) NOT NULL DEFAULT 'general',
    sort_order   INTEGER NOT NULL DEFAULT 0,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.resource_definitions IS 'Catalog of quota-able resources. Allowlist for tenant_packages.resource_limits keys. Extensible without schema change.';
COMMENT ON COLUMN public.resource_definitions.resource_key IS 'Stable key referenced by resource_limits JSONB (e.g. users, storage_mb).';
COMMENT ON COLUMN public.resource_definitions.unit IS 'Measurement unit: count | mb | requests.';

CREATE INDEX IF NOT EXISTS idx_resource_definitions_active
    ON public.resource_definitions (is_active, sort_order);

-- --------------------------------------------------------------------------
-- 2. RLS — readable by authenticated, writable by super_admin only
-- --------------------------------------------------------------------------

ALTER TABLE public.resource_definitions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'resource_definitions' AND policyname = 'resource_definitions_select') THEN
        CREATE POLICY resource_definitions_select ON public.resource_definitions
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'resource_definitions' AND policyname = 'resource_definitions_write') THEN
        CREATE POLICY resource_definitions_write ON public.resource_definitions
            FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 3. Seed the initial resource catalog
-- --------------------------------------------------------------------------

INSERT INTO public.resource_definitions (resource_key, label, unit, description, category, sort_order) VALUES
    ('users',               'Pengguna',        'count',    'Jumlah maksimum akun pengguna',            'identity', 1),
    ('branches',            'Cabang',          'count',    'Jumlah maksimum cabang',                   'identity', 2),
    ('cashiers',            'Kasir',           'count',    'Jumlah maksimum sesi/perangkat kasir',     'operations', 3),
    ('products',            'Produk',          'count',    'Jumlah maksimum produk katalog',           'catalog', 4),
    ('suppliers',           'Pemasok',         'count',    'Jumlah maksimum pemasok',                  'catalog', 5),
    ('customers',           'Pelanggan',       'count',    'Jumlah maksimum pelanggan terdaftar',      'catalog', 6),
    ('storage_mb',          'Penyimpanan',     'mb',       'Kuota penyimpanan (MB) untuk aset & file', 'storage', 7),
    ('api_calls_monthly',   'API Calls',       'requests', 'Kuota panggilan API per bulan',            'integration', 8),
    ('ai_requests_monthly', 'AI Requests',     'requests', 'Kuota permintaan AI per bulan',            'ai', 9)
ON CONFLICT (resource_key) DO NOTHING;

COMMIT;

-- ============================================================================
-- ROLLBACK (manual, if ever needed):
-- ============================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS public.resource_definitions CASCADE;
-- COMMIT;
