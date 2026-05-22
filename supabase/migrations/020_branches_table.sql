-- ============================================================================
-- 020_branches_table.sql
-- Medisync SaaS — Branches Table for Multi-Branch Tenancy
-- ============================================================================
-- Every tenant gets at least one branch (the "main" branch) during provisioning.
-- Branches represent physical pharmacy locations under a single tenant.
--
-- DESIGN:
--   - tenant_id FK → tenants(id) ON DELETE CASCADE
--   - code is UNIQUE across all tenants (for global lookup)
--   - is_main = true for the default branch created at provisioning
--   - Soft-delete via deleted_at for audit trail
--   - Indexed on tenant_id for high-traffic tenant-scoped queries
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. Create branches table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS branches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    code            VARCHAR(20) NOT NULL,
    address         TEXT,
    phone           VARCHAR(30),
    email           VARCHAR(100),
    is_main         BOOLEAN DEFAULT false,
    is_active       BOOLEAN DEFAULT true,
    opening_time    TIME,
    closing_time    TIME,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

-- --------------------------------------------------------------------------
-- 2. Indexes (hardened for high-traffic)
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_branches_tenant_id ON branches (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_code ON branches (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_branches_tenant_active ON branches (tenant_id, is_active) WHERE is_active = true;

-- --------------------------------------------------------------------------
-- 3. RLS — enable row-level security
-- --------------------------------------------------------------------------
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- 3a. SELECT: tenant members see their own branches; super_admin sees all
CREATE POLICY "branches_select" ON branches
    FOR SELECT
    USING (public.has_tenant_access(tenant_id));

-- 3b. INSERT: only super_admin can create branches (provisioning path)
CREATE POLICY "branches_insert" ON branches
    FOR INSERT
    WITH CHECK (public.is_super_admin());

-- 3c. UPDATE: tenant access required
CREATE POLICY "branches_update" ON branches
    FOR UPDATE
    USING (public.has_tenant_access(tenant_id))
    WITH CHECK (public.has_tenant_access(tenant_id));

-- 3d. DELETE: only super_admin (soft-delete handled at application level)
CREATE POLICY "branches_delete" ON branches
    FOR DELETE
    USING (public.is_super_admin());

-- --------------------------------------------------------------------------
-- 4. Trigger for updated_at
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_branches_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_branches_updated_at ON branches;
CREATE TRIGGER trg_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_branches_updated_at();

COMMIT;
