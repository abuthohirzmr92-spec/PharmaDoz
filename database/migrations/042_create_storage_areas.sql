-- ============================================================================
-- Migration 042 — Storage Areas: Location Master Table
-- ============================================================================
-- Creates the master table for physical storage locations within a pharmacy.
--
-- Architecture:
--   storage_areas  ← master (id, tenant_id, code, name, is_active)
--        ↓ FK
--   products.default_storage_area_id  ← product default (suggestion)
--        ↓ FK
--   product_batches.storage_area_id   ← batch reality (actual location)
--
-- ADR-008: Product Default = suggestion, Batch = reality.
-- ADR-001: products.rack_location retained as LEGACY.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. Create storage_areas table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storage_areas (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code         VARCHAR(20) NOT NULL,
    name         VARCHAR(100) NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);

COMMENT ON TABLE public.storage_areas IS 'Physical storage locations (racks, shelves, storage rooms) within a pharmacy';
COMMENT ON COLUMN public.storage_areas.code IS 'Short code for display, e.g. "R01", "GDG"';
COMMENT ON COLUMN public.storage_areas.name IS 'Human-readable name, e.g. "Rak A", "Gudang"';
COMMENT ON COLUMN public.storage_areas.sort_order IS 'Display ordering for dropdowns (lower = first)';

-- --------------------------------------------------------------------------
-- 2. Constraints
-- --------------------------------------------------------------------------

-- Code must not be blank
ALTER TABLE public.storage_areas
ADD CONSTRAINT chk_storage_areas_code_not_blank
CHECK (length(trim(code)) > 0);

-- Name must not be blank
ALTER TABLE public.storage_areas
ADD CONSTRAINT chk_storage_areas_name_not_blank
CHECK (length(trim(name)) > 0);

-- Unique code per tenant (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_storage_areas_tenant_code
ON public.storage_areas (tenant_id, lower(trim(code)))
WHERE deleted_at IS NULL;

-- --------------------------------------------------------------------------
-- 3. Indexes
-- --------------------------------------------------------------------------

-- Tenant-scoped lookup
CREATE INDEX IF NOT EXISTS idx_storage_areas_tenant_id
ON public.storage_areas (tenant_id);

-- Active areas for dropdown
CREATE INDEX IF NOT EXISTS idx_storage_areas_tenant_active
ON public.storage_areas (tenant_id, is_active)
WHERE is_active = true AND deleted_at IS NULL;

-- Composite index for sorted dropdown
CREATE INDEX IF NOT EXISTS idx_storage_areas_tenant_active_sort
ON public.storage_areas (tenant_id, is_active, sort_order);

-- Search by name
CREATE INDEX IF NOT EXISTS idx_storage_areas_name
ON public.storage_areas (name);

-- --------------------------------------------------------------------------
-- 4. RLS — enable + policies
-- --------------------------------------------------------------------------
ALTER TABLE public.storage_areas ENABLE ROW LEVEL SECURITY;

-- SELECT: tenant members see their own storage areas
CREATE POLICY storage_areas_select ON public.storage_areas
    FOR SELECT
    USING (public.has_tenant_access(tenant_id));

-- INSERT: tenant members can create storage areas
CREATE POLICY storage_areas_insert ON public.storage_areas
    FOR INSERT
    WITH CHECK (public.has_tenant_access(tenant_id));

-- UPDATE: tenant members can update their storage areas
CREATE POLICY storage_areas_update ON public.storage_areas
    FOR UPDATE
    USING (public.has_tenant_access(tenant_id))
    WITH CHECK (public.has_tenant_access(tenant_id));

-- DELETE: super_admin only (soft-delete handled at application level)
CREATE POLICY storage_areas_delete ON public.storage_areas
    FOR DELETE
    USING (public.is_super_admin());

-- --------------------------------------------------------------------------
-- 5. Auto-update trigger
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_storage_areas_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_storage_areas_updated_at ON public.storage_areas;
CREATE TRIGGER trg_storage_areas_updated_at
    BEFORE UPDATE ON public.storage_areas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_storage_areas_updated_at();

COMMIT;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_storage_areas_updated_at ON public.storage_areas;
-- DROP FUNCTION IF EXISTS public.update_storage_areas_updated_at();
-- DROP POLICY IF EXISTS storage_areas_delete ON public.storage_areas;
-- DROP POLICY IF EXISTS storage_areas_update ON public.storage_areas;
-- DROP POLICY IF EXISTS storage_areas_insert ON public.storage_areas;
-- DROP POLICY IF EXISTS storage_areas_select ON public.storage_areas;
-- DROP TABLE IF EXISTS public.storage_areas;
-- COMMIT;

-- ============================================================================
-- VALIDATION
-- ============================================================================
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'storage_areas';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'storage_areas';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'storage_areas';
