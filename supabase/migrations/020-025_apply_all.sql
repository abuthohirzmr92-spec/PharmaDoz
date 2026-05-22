-- ============================================================================
-- MEDISYNC SaaS — Combined Migration 020-025: Tenant Provisioning System
-- ============================================================================
-- SINGLE-RUN FILE untuk Supabase SQL Editor.
-- Semua migration idempotent — aman dijalankan ulang tanpa error.
--
-- URUTAN:
--   PHASE 020 — branches table + indexes + RLS + trigger
--   PHASE 021 — tenant_onboarding table + indexes + RLS
--   PHASE 022 — provisioning_audit table + indexes + RLS
--   PHASE 023 — subscriptions.is_trial column + backfill
--   PHASE 024 — provision_tenant() SECURITY DEFINER function (THE CORE)
--   PHASE 025 — RLS safety-net policies (tenant_users, activity_logs, profiles)
--   VALIDASI  — verification queries di akhir file
-- ============================================================================

-- ############################################################################
-- PHASE 020 — BRANCHES TABLE
-- ############################################################################
BEGIN;

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_branches_tenant_id ON branches (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_code ON branches (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_branches_tenant_active ON branches (tenant_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'branches_select' AND tablename = 'branches') THEN
        CREATE POLICY "branches_select" ON branches FOR SELECT USING (public.has_tenant_access(tenant_id));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'branches_insert' AND tablename = 'branches') THEN
        CREATE POLICY "branches_insert" ON branches FOR INSERT WITH CHECK (public.is_super_admin());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'branches_update' AND tablename = 'branches') THEN
        CREATE POLICY "branches_update" ON branches FOR UPDATE
            USING (public.has_tenant_access(tenant_id))
            WITH CHECK (public.has_tenant_access(tenant_id));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'branches_delete' AND tablename = 'branches') THEN
        CREATE POLICY "branches_delete" ON branches FOR DELETE USING (public.is_super_admin());
    END IF;
END $$;

-- Trigger: updated_at
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


-- ############################################################################
-- PHASE 021 — TENANT ONBOARDING TABLE
-- ############################################################################
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

CREATE INDEX IF NOT EXISTS idx_tenant_onboarding_tenant ON tenant_onboarding (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_onboarding_step ON tenant_onboarding (current_step) WHERE NOT is_completed;

ALTER TABLE tenant_onboarding ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_onboarding_select' AND tablename = 'tenant_onboarding') THEN
        CREATE POLICY "tenant_onboarding_select" ON tenant_onboarding FOR SELECT USING (public.has_tenant_access(tenant_id));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_onboarding_insert' AND tablename = 'tenant_onboarding') THEN
        CREATE POLICY "tenant_onboarding_insert" ON tenant_onboarding FOR INSERT WITH CHECK (public.is_super_admin());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_onboarding_update' AND tablename = 'tenant_onboarding') THEN
        CREATE POLICY "tenant_onboarding_update" ON tenant_onboarding FOR UPDATE
            USING (public.has_tenant_access(tenant_id))
            WITH CHECK (public.has_tenant_access(tenant_id));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_onboarding_delete' AND tablename = 'tenant_onboarding') THEN
        CREATE POLICY "tenant_onboarding_delete" ON tenant_onboarding FOR DELETE USING (public.is_super_admin());
    END IF;
END $$;

COMMIT;


-- ############################################################################
-- PHASE 022 — PROVISIONING AUDIT TABLE
-- ############################################################################
BEGIN;

CREATE TABLE IF NOT EXISTS provisioning_audit (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        UUID NOT NULL,
    owner_email     VARCHAR(255) NOT NULL,
    owner_user_id   UUID,
    tenant_name     VARCHAR(200) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    package_id      UUID,
    tenant_id       UUID,
    status          VARCHAR(25) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'success', 'failed', 'NEEDS_MANUAL_REVIEW')),
    error_message   TEXT,
    error_step      VARCHAR(50),
    compensation_attempted BOOLEAN DEFAULT false,
    compensation_error     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_provisioning_audit_status ON provisioning_audit (status)
    WHERE status IN ('failed', 'NEEDS_MANUAL_REVIEW');
CREATE INDEX IF NOT EXISTS idx_provisioning_audit_actor ON provisioning_audit (actor_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_audit_email ON provisioning_audit (owner_email);
CREATE INDEX IF NOT EXISTS idx_provisioning_audit_created ON provisioning_audit (created_at);

ALTER TABLE provisioning_audit ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'provisioning_audit_select' AND tablename = 'provisioning_audit') THEN
        CREATE POLICY "provisioning_audit_select" ON provisioning_audit FOR SELECT USING (public.is_super_admin());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'provisioning_audit_insert' AND tablename = 'provisioning_audit') THEN
        CREATE POLICY "provisioning_audit_insert" ON provisioning_audit FOR INSERT WITH CHECK (public.is_super_admin());
    END IF;
END $$;

COMMIT;


-- ############################################################################
-- PHASE 023 — SUBSCRIPTIONS ADD is_trial COLUMN
-- ############################################################################
BEGIN;

ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;

UPDATE public.subscriptions
SET is_trial = true
WHERE status = 'trialing' AND is_trial = false;

COMMIT;


-- ############################################################################
-- PHASE 024 — PROVISION_TENANT() FUNCTION (THE CORE)
-- ############################################################################
BEGIN;

CREATE OR REPLACE FUNCTION public.provision_tenant(
    p_owner_user_id UUID,
    p_name          VARCHAR(200),
    p_slug          VARCHAR(100),
    p_package_id    UUID DEFAULT '00000000-0000-0000-0000-000000000101',
    p_domain        VARCHAR(255) DEFAULT NULL,
    p_settings      JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_tenant_id    UUID;
    v_caller_id    UUID;
    v_branch_code  VARCHAR(20);
BEGIN
    ----------------------------------------------------------------------
    -- 1. Authorization — caller must be an active super_admin
    ----------------------------------------------------------------------
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'authentication_required'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = v_caller_id
          AND p.system_role = 'super_admin'
          AND p.is_active = true
    ) THEN
        RAISE EXCEPTION 'only_super_admin_can_provision'
            USING ERRCODE = '42501';
    END IF;

    ----------------------------------------------------------------------
    -- 2. Validate slug uniqueness (idempotency gate)
    ----------------------------------------------------------------------
    IF EXISTS (
        SELECT 1
        FROM public.tenants
        WHERE slug = p_slug AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'slug_already_taken: %', p_slug
            USING ERRCODE = '23505';
    END IF;

    ----------------------------------------------------------------------
    -- 3. Create tenant
    ----------------------------------------------------------------------
    v_tenant_id := gen_random_uuid();

    INSERT INTO public.tenants (
        id, name, slug, domain, settings, package_id, is_active, created_at, updated_at
    ) VALUES (
        v_tenant_id, p_name, p_slug, p_domain, p_settings, p_package_id,
        true, NOW(), NOW()
    );

    ----------------------------------------------------------------------
    -- 4. Legacy pharmacy sync (same UUID = same logical entity)
    ----------------------------------------------------------------------
    INSERT INTO public.pharmacies (id, name, code, is_active, created_at, updated_at)
    VALUES (
        v_tenant_id, p_name,
        upper(substr(regexp_replace(p_slug, '[^a-z0-9]', '', 'g'), 1, 6)),
        true, NOW(), NOW()
    );

    ----------------------------------------------------------------------
    -- 5. Default branch (main location)
    ----------------------------------------------------------------------
    v_branch_code := 'BR-' || upper(substr(replace(v_tenant_id::text, '-', ''), 1, 8));

    INSERT INTO public.branches (
        tenant_id, name, code, is_main, is_active, created_at, updated_at
    ) VALUES (
        v_tenant_id, p_name || ' - Utama', v_branch_code,
        true, true, NOW(), NOW()
    );

    ----------------------------------------------------------------------
    -- 6. Owner membership (tenant_users)
    ----------------------------------------------------------------------
    INSERT INTO public.tenant_users (
        tenant_id, user_id, role, is_active, joined_at
    ) VALUES (
        v_tenant_id, p_owner_user_id, 'tenant_owner', true, NOW()
    );

    ----------------------------------------------------------------------
    -- 7. Link owner profile to tenant
    ----------------------------------------------------------------------
    UPDATE public.profiles
    SET tenant_id = v_tenant_id, updated_at = NOW()
    WHERE id = p_owner_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'owner_profile_not_found: %', p_owner_user_id
            USING ERRCODE = '02000';
    END IF;

    ----------------------------------------------------------------------
    -- 8. Trial subscription (14-day trial, 30-day billing period)
    ----------------------------------------------------------------------
    INSERT INTO public.subscriptions (
        tenant_id, package_id, status,
        current_period_start, current_period_end, trial_end,
        is_trial, created_at, updated_at
    ) VALUES (
        v_tenant_id, p_package_id, 'trialing',
        NOW(), NOW() + INTERVAL '30 days', NOW() + INTERVAL '14 days',
        true, NOW(), NOW()
    );

    ----------------------------------------------------------------------
    -- 9. Quota initialization
    ----------------------------------------------------------------------
    INSERT INTO public.tenant_quotas (
        tenant_id, pharmacy_id, package_id,
        current_users, current_branches,
        is_active, started_at, created_at, updated_at
    ) VALUES (
        v_tenant_id, v_tenant_id, p_package_id,
        1, 1,
        true, NOW(), NOW(), NOW()
    );

    ----------------------------------------------------------------------
    -- 10. Onboarding state
    ----------------------------------------------------------------------
    INSERT INTO public.tenant_onboarding (
        tenant_id, current_step, data, created_at, updated_at
    ) VALUES (
        v_tenant_id, 'welcome',
        jsonb_build_object(
            'provisioned_by', v_caller_id,
            'provisioned_at', NOW(),
            'package_id', p_package_id,
            'trial_end', NOW() + INTERVAL '14 days'
        ),
        NOW(), NOW()
    );

    ----------------------------------------------------------------------
    -- 11. Activity log (audit trail)
    ----------------------------------------------------------------------
    INSERT INTO public.activity_logs (
        tenant_id, actor_id, action, resource_type, resource_id,
        metadata, created_at
    ) VALUES (
        v_tenant_id, v_caller_id,
        'tenant.provision', 'tenant', v_tenant_id,
        jsonb_build_object(
            'owner_id', p_owner_user_id,
            'package_id', p_package_id,
            'slug', p_slug,
            'name', p_name
        ),
        NOW()
    );

    ----------------------------------------------------------------------
    -- Success — return the new tenant ID
    ----------------------------------------------------------------------
    RETURN jsonb_build_object('tenant_id', v_tenant_id);

END;
$$;

-- Permissions
REVOKE EXECUTE ON FUNCTION public.provision_tenant FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_tenant TO authenticated;

COMMIT;


-- ############################################################################
-- PHASE 025 — RLS SAFETY-NET POLICIES
-- ############################################################################
BEGIN;

-- 1. tenant_users — super_admin provisioning bypass
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

-- 2. activity_logs — platform-level log insert
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

-- 3. profiles — self-update for platform users
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


-- ############################################################################
-- VALIDASI — Jalankan query berikut untuk verifikasi
-- ############################################################################

-- [V1] Cek semua tabel baru sudah ada
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('branches', 'tenant_onboarding', 'provisioning_audit')
ORDER BY table_name;
-- Expected: 3 rows: branches, provisioning_audit, tenant_onboarding

-- [V2] Cek function provision_tenant() ada
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'provision_tenant';
-- Expected: 1 row, security_type = 'DEFINER'

-- [V3] Cek kolom is_trial di subscriptions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'subscriptions'
  AND column_name = 'is_trial';
-- Expected: 1 row, data_type = 'boolean'

-- [V4] Cek RLS policies aktif
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('branches', 'tenant_onboarding', 'provisioning_audit')
ORDER BY tablename, policyname;
-- Expected:
--   branches: 4 policies (select, insert, update, delete)
--   provisioning_audit: 2 policies (select, insert)
--   tenant_onboarding: 4 policies (select, insert, update, delete)

-- [V5] Cek safety-net policies dari phase 025
SELECT tablename, policyname
FROM pg_policies
WHERE policyname IN (
    'tenant_users_insert_provisioning',
    'activity_logs_insert_platform',
    'profiles_update_own'
);
-- Expected: 3 rows
