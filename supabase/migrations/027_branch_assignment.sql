-- ============================================================================
-- 027_branch_assignment.sql
-- Medisync SaaS — Branch-Scoped User Assignment
-- ============================================================================
-- Adds assigned_branch_id to tenant_users, enabling branch-scoped roles.
-- tenant_owner/admin: assigned_branch_id = NULL (access all branches)
-- pharmacist/cashier/staff: assigned_branch_id set to specific branch
-- ============================================================================

BEGIN;

ALTER TABLE public.tenant_users
    ADD COLUMN IF NOT EXISTS assigned_branch_id UUID
    REFERENCES branches(id) ON DELETE SET NULL;

-- Index for efficient lookup of users by branch
CREATE INDEX IF NOT EXISTS idx_tenant_users_branch
    ON tenant_users (assigned_branch_id)
    WHERE assigned_branch_id IS NOT NULL;

COMMIT;
