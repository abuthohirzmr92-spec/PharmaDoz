-- ============================================================================
-- 052_sle_service_catalog.sql
-- Subscription Lifecycle Engine (SLE) — Phase 1, Batch 3A (GATE 1 of 5)
-- ============================================================================
-- Service Catalog (ADR-31): packages activate SERVICES, which group FEATURES.
-- Root table of the capability hierarchy: Service > Module > Feature > Quota.
--
-- ADDITIVE · IDEMPOTENT · reuses is_super_admin(). New table — zero data impact.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.service_catalog (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_key VARCHAR(50) NOT NULL UNIQUE,
    label       VARCHAR(100) NOT NULL,
    description TEXT,
    category    VARCHAR(50) NOT NULL DEFAULT 'general',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.service_catalog IS 'Top-level services (Inventory, Finance, AI, ...). Packages activate services; services group features via service_features.';
COMMENT ON COLUMN public.service_catalog.service_key IS 'Stable key referenced by service_features.service_key and package_services.service_key.';

CREATE INDEX IF NOT EXISTS idx_service_catalog_active
    ON public.service_catalog (is_active, sort_order);

ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_catalog' AND policyname = 'service_catalog_select') THEN
        CREATE POLICY service_catalog_select ON public.service_catalog
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_catalog' AND policyname = 'service_catalog_write') THEN
        CREATE POLICY service_catalog_write ON public.service_catalog
            FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    END IF;
END $$;

-- Seed the initial service list (labels in Indonesian UI context).
INSERT INTO public.service_catalog (service_key, label, description, category, sort_order) VALUES
    ('inventory',   'Inventory',   'Manajemen stok, batch, FEFO, multi-storage',   'operations', 1),
    ('sales',       'Penjualan',   'Kasir, multi-cashier, resep elektronik',       'operations', 2),
    ('finance',     'Keuangan',    'Buku besar, arus kas, analisis profit, pajak', 'finance',    3),
    ('reports',     'Laporan',     'Dashboard eksekutif, laporan penjualan & keuangan', 'analytics', 4),
    ('ai',          'AI',          'Asisten, OCR, forecast, diagnostics',          'ai',         5),
    ('integration', 'Integrasi',   'BPJS, WhatsApp, Google Drive, API, marketplace','integration',6),
    ('backup',      'Backup',      'Backup otomatis & terjadwal',                  'platform',   7),
    ('support',     'Support',     'Dukungan prioritas & dedicated',               'platform',   8),
    ('security',    'Keamanan',    'White-label, custom domain, audit lanjutan',   'platform',   9)
ON CONFLICT (service_key) DO NOTHING;

COMMIT;

-- ============================================================================
-- ROLLBACK: BEGIN; DROP TABLE IF EXISTS public.service_catalog CASCADE; COMMIT;
-- ============================================================================
