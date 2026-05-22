-- ============================================================================
-- 026_branch_tenant_insert_policy.sql
-- Medisync SaaS — Allow tenant_owner/admin to create branches
-- ============================================================================
-- Existing RLS (migration 020): only super_admin can INSERT branches.
-- This migration adds a policy so tenant_owner and admin can create branches
-- within their own tenant without platform intervention.
-- ============================================================================

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'branches_insert_tenant_owner'
          AND tablename = 'branches'
    ) THEN
        CREATE POLICY "branches_insert_tenant_owner" ON branches
            FOR INSERT
            WITH CHECK (
                public.has_tenant_access(tenant_id)
                AND public.user_tenant_role() IN ('tenant_owner', 'admin')
            );
    END IF;
END $$;

COMMIT;
