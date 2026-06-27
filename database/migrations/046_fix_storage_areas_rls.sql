-- ============================================================================
-- Migration 046 — Recovery: Fix Missing storage_areas RLS Policies
-- ============================================================================
-- BACKGROUND:
--   Production database has storage_areas table with RLS ENABLED but
--   pg_policy is empty — all 4 policies are missing. This causes 42501
--   errors on INSERT/UPDATE/DELETE even for authenticated users with
--   valid JWT and tenant access.
--
--   Root cause: policies defined in 042_create_storage_areas.sql were
--   never applied to production (table was created separately/manually).
--
-- SAFETY:
--   - Does NOT alter table structure
--   - Does NOT modify or delete data
--   - Does NOT recreate indexes or triggers
--   - DROP IF EXISTS + CREATE = idempotent, safe to re-run
--   - Policy logic identical to 042_create_storage_areas.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. SELECT — tenant members see their own storage areas
-- ============================================================================
DROP POLICY IF EXISTS storage_areas_select ON public.storage_areas;
CREATE POLICY storage_areas_select ON public.storage_areas
    FOR SELECT
    USING (public.has_tenant_access(tenant_id));

-- ============================================================================
-- 2. INSERT — tenant members can create storage areas
-- ============================================================================
DROP POLICY IF EXISTS storage_areas_insert ON public.storage_areas;
CREATE POLICY storage_areas_insert ON public.storage_areas
    FOR INSERT
    WITH CHECK (public.has_tenant_access(tenant_id));

-- ============================================================================
-- 3. UPDATE — tenant members can update their storage areas
-- ============================================================================
DROP POLICY IF EXISTS storage_areas_update ON public.storage_areas;
CREATE POLICY storage_areas_update ON public.storage_areas
    FOR UPDATE
    USING (public.has_tenant_access(tenant_id))
    WITH CHECK (public.has_tenant_access(tenant_id));

-- ============================================================================
-- 4. DELETE — super_admin only (soft-delete handled at application level)
-- ============================================================================
DROP POLICY IF EXISTS storage_areas_delete ON public.storage_areas;
CREATE POLICY storage_areas_delete ON public.storage_areas
    FOR DELETE
    USING (public.is_super_admin());

COMMIT;

-- ============================================================================
-- VALIDATION
-- ============================================================================
-- Run after migration to verify all 4 policies exist:
--
-- SELECT polname, polcmd
-- FROM pg_policy
-- WHERE polrelid = 'public.storage_areas'::regclass
-- ORDER BY polname;
--
-- Expected output:
--   storage_areas_delete   DELETE
--   storage_areas_insert   INSERT
--   storage_areas_select   SELECT
--   storage_areas_update   UPDATE

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- BEGIN;
-- DROP POLICY IF EXISTS storage_areas_delete ON public.storage_areas;
-- DROP POLICY IF EXISTS storage_areas_update ON public.storage_areas;
-- DROP POLICY IF EXISTS storage_areas_insert ON public.storage_areas;
-- DROP POLICY IF EXISTS storage_areas_select ON public.storage_areas;
-- COMMIT;
