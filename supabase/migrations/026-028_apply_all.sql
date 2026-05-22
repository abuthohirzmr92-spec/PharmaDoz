-- ============================================================================
-- COMBINED MIGRATION: 026 + 027 + 028
-- Medisync SaaS — Phase 3 Operational Readiness
-- ============================================================================
-- 026: Branch INSERT policy untuk tenant_owner/admin
-- 027: Kolom assigned_branch_id di tenant_users
-- 028: Tabel invitation_tokens + RLS
-- ============================================================================
-- CARA PAKAI:
--   1. Buka Supabase Dashboard > SQL Editor
--   2. Copy-paste SELURUH file ini
--   3. Klik "Run"
--   4. Cek hasil: tidak boleh ada error
-- ============================================================================

BEGIN;

-- ============================================================================
-- 026: Branch INSERT Policy
-- ============================================================================
-- Existing RLS hanya mengizinkan super_admin untuk INSERT branches.
-- Policy ini menambah izin untuk tenant_owner dan admin.

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

-- ============================================================================
-- 027: Branch Assignment Column
-- ============================================================================
-- Kolom assigned_branch_id untuk branch-scoped access di tenant_users.

ALTER TABLE public.tenant_users
    ADD COLUMN IF NOT EXISTS assigned_branch_id UUID
    REFERENCES branches(id) ON DELETE SET NULL;

-- Index untuk lookup user by branch
CREATE INDEX IF NOT EXISTS idx_tenant_users_branch
    ON tenant_users (assigned_branch_id)
    WHERE assigned_branch_id IS NOT NULL;

-- ============================================================================
-- 028: Invitation Tokens Table
-- ============================================================================

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

-- RLS Policies untuk invitation_tokens
ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT: tenant_owner/admin bisa lihat invitation dalam tenant mereka
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'invitation_tokens_select_tenant_staff'
          AND tablename = 'invitation_tokens'
    ) THEN
        CREATE POLICY "invitation_tokens_select_tenant_staff" ON invitation_tokens
            FOR SELECT
            USING (
                public.has_tenant_access(tenant_id)
                AND public.user_tenant_role() IN ('tenant_owner', 'admin')
            );
    END IF;
END $$;

-- SELECT: siapa pun bisa baca token yang valid (untuk accept invitation)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'invitation_tokens_select_token'
          AND tablename = 'invitation_tokens'
    ) THEN
        CREATE POLICY "invitation_tokens_select_token" ON invitation_tokens
            FOR SELECT
            USING (
                is_used = false
                AND expires_at > NOW()
            );
    END IF;
END $$;

-- INSERT: tenant_owner/admin bisa membuat invitation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'invitation_tokens_insert_tenant_staff'
          AND tablename = 'invitation_tokens'
    ) THEN
        CREATE POLICY "invitation_tokens_insert_tenant_staff" ON invitation_tokens
            FOR INSERT
            WITH CHECK (
                public.has_tenant_access(tenant_id)
                AND public.user_tenant_role() IN ('tenant_owner', 'admin')
            );
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFIKASI — Jalankan query berikut setelah migration berhasil:
-- ============================================================================

-- -- Cek policy 026:
-- SELECT policyname FROM pg_policies
--  WHERE tablename = 'branches' AND policyname = 'branches_insert_tenant_owner';

-- -- Cek kolom 027:
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_name = 'tenant_users' AND column_name = 'assigned_branch_id';

-- -- Cek tabel 028:
-- SELECT tablename FROM pg_tables WHERE tablename = 'invitation_tokens';

-- -- Cek policies 028:
-- SELECT policyname FROM pg_policies WHERE tablename = 'invitation_tokens';
