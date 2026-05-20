-- ============================================================================
-- 012_functions.sql
-- Medisync SaaS — Helper Functions for RLS & App Logic
-- ============================================================================
-- Migration ini mencakup:
--   1. public.is_super_admin()      — Check if current user is super_admin
--   2. public.user_tenant_id()      — Get current user's tenant_id
--   3. public.user_tenant_role()    — Get current user's role in their tenant
--   4. public.has_tenant_access()   — Check access to a specific tenant
--
-- All functions use SECURITY DEFINER to bypass RLS on underlying tables.
-- This allows the functions to query profiles and tenant_users without
-- being blocked by row-level security policies.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. public.is_super_admin()
-- ============================================================================
-- Returns true if the current authenticated user has tenant_id IS NULL
-- in their profile (super_admins have no tenant affiliation).

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.tenant_id IS NULL
      AND p.is_active = true
  );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS 'Returns true if the current user is a super_admin (tenant_id IS NULL in profiles)';

-- ============================================================================
-- 2. public.user_tenant_id()
-- ============================================================================
-- Returns the tenant_id of the current authenticated user.
-- Returns NULL if the user is a super_admin or not found.

CREATE OR REPLACE FUNCTION public.user_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT tenant_id
  FROM profiles
  WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.user_tenant_id() IS 'Returns the tenant_id of the current authenticated user (NULL for super_admin)';

-- ============================================================================
-- 3. public.user_tenant_role()
-- ============================================================================
-- Returns the role of the current user within their primary tenant.
-- Returns NULL if the user has no active tenant membership.

CREATE OR REPLACE FUNCTION public.user_tenant_role()
RETURNS VARCHAR
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT tu.role
  FROM tenant_users tu
  JOIN profiles p ON p.id = tu.user_id
  WHERE p.id = auth.uid()
    AND tu.is_active = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.user_tenant_role() IS 'Returns the role of the current user in their active tenant (NULL if no membership)';

-- ============================================================================
-- 4. public.has_tenant_access(target_tenant_id UUID)
-- ============================================================================
-- Returns true if the current user has access to the specified tenant.
-- Super_admins have access to all tenants.
-- Regular users must have an active tenant_users membership.

CREATE OR REPLACE FUNCTION public.has_tenant_access(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_users tu
    JOIN profiles p ON p.id = tu.user_id
    WHERE p.id = auth.uid()
      AND tu.tenant_id = target_tenant_id
      AND tu.is_active = true
      AND p.is_active = true
  ) OR public.is_super_admin();
$$;

COMMENT ON FUNCTION public.has_tenant_access(UUID) IS 'Returns true if the current user has access to target_tenant_id (super_admin always has access)';

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;
