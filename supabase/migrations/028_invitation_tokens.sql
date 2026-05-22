-- ============================================================================
-- 028_invitation_tokens.sql
-- Medisync SaaS — Token-based User Invitation System
-- ============================================================================
-- invitation_tokens menyimpan token undangan untuk user baru dalam tenant.
-- Tenant owner/admin membuat token → user accept via link → tenant_users dibuat.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.invitation_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin','pharmacist','cashier','staff')),
    assigned_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    invited_by UUID NOT NULL REFERENCES profiles(id),
    is_used BOOLEAN DEFAULT false,
    used_by UUID REFERENCES profiles(id),
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk lookup token + expiry check
CREATE INDEX IF NOT EXISTS idx_invitation_token ON invitation_tokens (token) WHERE is_used = false;
CREATE INDEX IF NOT EXISTS idx_invitation_tenant ON invitation_tokens (tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitation_email ON invitation_tokens (email, tenant_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT: tenant_owner/admin bisa lihat invitation dalam tenant mereka
CREATE POLICY "invitation_tokens_select_tenant_staff" ON invitation_tokens
    FOR SELECT
    USING (
        public.has_tenant_access(tenant_id)
        AND public.user_tenant_role() IN ('tenant_owner', 'admin')
    );

-- SELECT: siapa pun bisa baca token yang valid (untuk accept invitation)
CREATE POLICY "invitation_tokens_select_token" ON invitation_tokens
    FOR SELECT
    USING (
        is_used = false
        AND expires_at > NOW()
    );

-- INSERT: tenant_owner/admin bisa membuat invitation
CREATE POLICY "invitation_tokens_insert_tenant_staff" ON invitation_tokens
    FOR INSERT
    WITH CHECK (
        public.has_tenant_access(tenant_id)
        AND public.user_tenant_role() IN ('tenant_owner', 'admin')
    );

-- UPDATE: hanya via SECURITY DEFINER function (tidak ada direct update policy)

COMMIT;
