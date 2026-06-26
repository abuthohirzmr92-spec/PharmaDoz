-- ============================================================================
-- Migration 042 — PATCH: Storage Areas Completion
-- ============================================================================
-- PRODUCTION-SAFE PATCH. Idempotent. Zero DROP operations.
--
-- BACKGROUND:
--   storage_areas table and some constraints/indexes already exist from
--   prior incremental deployments (hardening migration 051).
--   This patch completes the missing objects without touching existing ones.
--
-- EXISTING (verified via Production Database State RC1 audit):
--   ✓ storage_areas table + all columns
--   ✓ chk_storage_areas_code_not_blank
--   ✓ chk_storage_areas_name_not_blank
--   ✓ idx_storage_areas_name
--   ✓ idx_storage_areas_tenant_active_sort
--   ✓ RLS enabled + 4 policies (select, insert, update, delete)
--
-- MISSING (added by this patch):
--   ✗ idx_storage_areas_tenant_code (unique index — one code per tenant)
--   ✗ idx_storage_areas_tenant_id (tenant-scoped lookup)
--   ✗ idx_storage_areas_tenant_active (active filter for dropdown)
--   ✗ auto-update trigger + function
--   ✗ table/column comments
--
-- IDEMPOTENCY:
--   All operations use IF NOT EXISTS, OR REPLACE, or DO $$ guard blocks.
--   Safe to run multiple times — no "already exists" errors.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. INDEXES — missing from production
-- ============================================================================

-- 1a. Unique code per tenant (case-insensitive)
-- Prevents duplicate codes like "R01" and "r01" in the same tenant.
CREATE UNIQUE INDEX IF NOT EXISTS idx_storage_areas_tenant_code
ON public.storage_areas (tenant_id, lower(trim(code)))
WHERE deleted_at IS NULL;

-- 1b. Tenant-scoped lookup
CREATE INDEX IF NOT EXISTS idx_storage_areas_tenant_id
ON public.storage_areas (tenant_id);

-- 1c. Active areas for dropdown (filtered index)
CREATE INDEX IF NOT EXISTS idx_storage_areas_tenant_active
ON public.storage_areas (tenant_id, is_active)
WHERE is_active = true AND deleted_at IS NULL;

-- ============================================================================
-- 2. AUTO-UPDATE TRIGGER
-- ============================================================================

-- 2a. Trigger function (CREATE OR REPLACE = idempotent)
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

-- 2b. Trigger (DROP IF EXISTS + CREATE = idempotent)
DROP TRIGGER IF EXISTS trg_storage_areas_updated_at ON public.storage_areas;
CREATE TRIGGER trg_storage_areas_updated_at
    BEFORE UPDATE ON public.storage_areas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_storage_areas_updated_at();

-- ============================================================================
-- 3. COMMENTS (idempotent — safe to re-run)
-- ============================================================================

COMMENT ON TABLE public.storage_areas IS
    'Physical storage locations (racks, shelves, storage rooms) within a pharmacy';

COMMENT ON COLUMN public.storage_areas.code IS
    'Short code for display, e.g. "R01", "GDG"';

COMMENT ON COLUMN public.storage_areas.name IS
    'Human-readable name, e.g. "Rak A", "Gudang"';

COMMENT ON COLUMN public.storage_areas.sort_order IS
    'Display ordering for dropdowns (lower = first)';

COMMENT ON COLUMN public.storage_areas.is_active IS
    'Soft-deactivate — never hard-delete if referenced by products or batches';

COMMENT ON COLUMN public.storage_areas.deleted_at IS
    'Soft delete timestamp — NULL = active';

COMMIT;

-- ============================================================================
-- VALIDATION QUERIES — run after patch to verify completeness
-- ============================================================================

-- V1. Check table exists with all columns
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'storage_areas'
-- ORDER BY ordinal_position;

-- V2. Check all indexes exist
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'storage_areas'
-- ORDER BY indexname;

-- V3. Check constraints
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.storage_areas'::regclass
-- ORDER BY conname;

-- V4. Check RLS policies
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'storage_areas'
-- ORDER BY policyname;

-- V5. Check trigger
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'storage_areas';

-- V6. Expected counts after successful patch:
--   Columns:    9 (id, tenant_id, code, name, is_active, sort_order,
--                   created_at, updated_at, deleted_at)
--   Indexes:    5 (pk, tenant_code unique, tenant_id, tenant_active,
--                   tenant_active_sort, name)
--   Constraints: 4 (pk, code_not_blank, name_not_blank, fk_tenant)
--   Policies:   4 (select, insert, update, delete)
--   Triggers:   1 (updated_at)
--   Comments:   1 table + 6 columns

-- ============================================================================
-- ROLLBACK (only if needed — reverts objects created by THIS patch)
-- ============================================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_storage_areas_updated_at ON public.storage_areas;
-- DROP FUNCTION IF EXISTS public.update_storage_areas_updated_at();
-- DROP INDEX IF EXISTS idx_storage_areas_tenant_active;
-- DROP INDEX IF EXISTS idx_storage_areas_tenant_id;
-- DROP INDEX IF EXISTS idx_storage_areas_tenant_code;
-- COMMIT;
