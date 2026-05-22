-- ============================================================================
-- 022_provisioning_audit.sql
-- Medisync SaaS — Provisioning Audit Trail
-- ============================================================================
-- Durable record of every tenant provisioning attempt, including failures.
-- Kept separate from activity_logs because:
--   - Failures may have no tenant_id (tenant not yet created)
--   - Contains auth-level info (owner_email, owner_user_id) for manual recovery
--   - Tracks compensation state (NEEDS_MANUAL_REVIEW for orphaned auth users)
--
-- STATUS VALUES:
--   pending              — provisioning started, auth user being created
--   success              — all steps completed, tenant active
--   failed               — provisioning failed, compensation attempted
--   NEEDS_MANUAL_REVIEW  — compensation also failed, human intervention needed
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS provisioning_audit (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        UUID NOT NULL,  -- the super_admin who initiated provisioning
    owner_email     VARCHAR(255) NOT NULL,
    owner_user_id   UUID,           -- auth user created for the owner (NULL if Phase 2 failed)
    tenant_name     VARCHAR(200) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    package_id      UUID,
    tenant_id       UUID,           -- NULL if provisioning failed before tenant creation
    status          VARCHAR(25) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'success', 'failed', 'NEEDS_MANUAL_REVIEW')),
    error_message   TEXT,           -- structured error info for diagnosis
    error_step      VARCHAR(50),    -- which phase failed (auth_creation, rpc_call, compensation)
    compensation_attempted BOOLEAN DEFAULT false,
    compensation_error     TEXT,    -- error from the compensation attempt itself
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ     -- when NEEDS_MANUAL_REVIEW was resolved
);

-- --------------------------------------------------------------------------
-- Indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_provisioning_audit_status ON provisioning_audit (status)
    WHERE status IN ('failed', 'NEEDS_MANUAL_REVIEW');
CREATE INDEX IF NOT EXISTS idx_provisioning_audit_actor ON provisioning_audit (actor_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_audit_email ON provisioning_audit (owner_email);
CREATE INDEX IF NOT EXISTS idx_provisioning_audit_created ON provisioning_audit (created_at);

-- --------------------------------------------------------------------------
-- RLS — super_admin only (read+insert, no update/delete)
-- --------------------------------------------------------------------------
ALTER TABLE provisioning_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provisioning_audit_select" ON provisioning_audit
    FOR SELECT
    USING (public.is_super_admin());

CREATE POLICY "provisioning_audit_insert" ON provisioning_audit
    FOR INSERT
    WITH CHECK (public.is_super_admin());

-- No UPDATE or DELETE policies — provisioning audit is append-only immutable

COMMIT;
