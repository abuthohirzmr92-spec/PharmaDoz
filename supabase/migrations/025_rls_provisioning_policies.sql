-- ============================================================================
-- 025_rls_provisioning_policies.sql
-- Medisync SaaS — RLS Refinements for Provisioning Era
-- ============================================================================
-- PROVISIONING RLS ARCHITECTURE:
--   Primary path:  SECURITY DEFINER provision_tenant() — bypasses all RLS.
--                   Authorization is checked inside the function itself.
--   Safety net:    Standard RLS policies on each table. super_admin can
--                   perform CRUD on all tenant-scoped tables via has_tenant_access().
--   First user:    The tenant_owner is inserted by the SECURITY DEFINER
--                   function. After that, standard RLS policies handle
--                   subsequent membership operations.
--
-- This migration is ADDITIVE only — it does not modify or drop existing
-- policies. It adds missing safeguards uncovered during provisioning design.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. TENANT_USERS — Add explicit super_admin provisioning bypass
-- --------------------------------------------------------------------------
-- The existing tenant_users_insert policy (014) uses has_tenant_access()
-- which works for super_admin. This additional policy makes the super_admin
-- provisioning path explicit and serves as a safety net in case the existing
-- policy is ever tightened.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'tenant_users_insert_provisioning'
          AND tablename = 'tenant_users'
    ) THEN
        CREATE POLICY "tenant_users_insert_provisioning" ON tenant_users
            FOR INSERT
            WITH CHECK (public.is_super_admin());
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 2. ACTIVITY_LOGS — Ensure platform-level (tenant_id IS NULL) logs can be
--    inserted by super_admin. The existing policy uses has_tenant_access()
--    which works for super_admin via the OR is_super_admin() clause, but
--    this explicit policy removes ambiguity.
-- --------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'activity_logs_insert_platform'
          AND tablename = 'activity_logs'
    ) THEN
        CREATE POLICY "activity_logs_insert_platform" ON activity_logs
            FOR INSERT
            WITH CHECK (
                tenant_id IS NULL AND public.is_super_admin()
            );
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 3. PROFILES — Add self-update policy for platform users
-- --------------------------------------------------------------------------
-- Platform users (system_role = super_admin/developer/support_ai) have
-- tenant_id = NULL. The existing profiles_update policy uses
-- has_tenant_access(tenant_id) which works for super_admin but may not
-- cover edge cases. This policy ensures any authenticated user can
-- update their own profile regardless of tenant context.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'profiles_update_own'
          AND tablename = 'profiles'
    ) THEN
        CREATE POLICY "profiles_update_own" ON profiles
            FOR UPDATE
            USING (id = auth.uid())
            WITH CHECK (id = auth.uid());
    END IF;
END $$;

COMMIT;
