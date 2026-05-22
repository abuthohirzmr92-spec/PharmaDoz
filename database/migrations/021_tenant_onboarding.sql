-- ============================================================================
-- 021_tenant_onboarding.sql
-- Medisync SaaS — Tenant Onboarding State Tracking
-- ============================================================================
-- Tracks onboarding progress for newly provisioned tenants. The owner sees
-- a step-by-step wizard after first login.
--
-- Steps: welcome → profile_setup → branch_setup → product_setup → team_invite → done
--
-- DESIGN:
--   - One row per tenant (UNIQUE on tenant_id)
--   - CASCADE delete with tenant (no orphaned onboarding)
--   - JSONB steps_completed for audit trail of completed steps
--   - JSONB data for provisioning metadata (provisioned_by, package, trial info)
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS tenant_onboarding (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    current_step    VARCHAR(50) NOT NULL DEFAULT 'welcome',
    steps_completed JSONB DEFAULT '[]'::jsonb,
    data            JSONB DEFAULT '{}'::jsonb,
    is_completed    BOOLEAN DEFAULT false,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id)
);

-- --------------------------------------------------------------------------
-- Indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tenant_onboarding_tenant ON tenant_onboarding (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_onboarding_step ON tenant_onboarding (current_step) WHERE NOT is_completed;

-- --------------------------------------------------------------------------
-- RLS
-- --------------------------------------------------------------------------
ALTER TABLE tenant_onboarding ENABLE ROW LEVEL SECURITY;

-- SELECT: tenant members see their own onboarding; super_admin sees all
CREATE POLICY "tenant_onboarding_select" ON tenant_onboarding
    FOR SELECT
    USING (public.has_tenant_access(tenant_id));

-- INSERT: only super_admin (provisioning creates this)
CREATE POLICY "tenant_onboarding_insert" ON tenant_onboarding
    FOR INSERT
    WITH CHECK (public.is_super_admin());

-- UPDATE: tenant users can advance their own onboarding steps
CREATE POLICY "tenant_onboarding_update" ON tenant_onboarding
    FOR UPDATE
    USING (public.has_tenant_access(tenant_id))
    WITH CHECK (public.has_tenant_access(tenant_id));

-- DELETE: only super_admin
CREATE POLICY "tenant_onboarding_delete" ON tenant_onboarding
    FOR DELETE
    USING (public.is_super_admin());

COMMIT;
