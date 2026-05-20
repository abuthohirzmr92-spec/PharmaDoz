-- ============================================================================
-- 007_tenant_core.sql
-- Medisync SaaS — Tenant Core Tables
-- ============================================================================
-- Migration ini mencakup:
--   1. tenants — Central tenant table (replaces pharmacies as tenant root)
--   2. profiles — Extends auth.users with app data (replaces users table)
--   3. tenant_users — Junction: which users belong to which tenants with roles
--   4. Data migration from existing pharmacies → tenants, users → profiles
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TENANTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    domain      VARCHAR(255) UNIQUE,
    settings    JSONB DEFAULT '{}',
    is_active   BOOLEAN DEFAULT true,
    package_id  UUID REFERENCES tenant_packages(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

COMMENT ON TABLE tenants IS 'Central tenant table — replaces pharmacies as the tenant root for multi-tenant SaaS';
COMMENT ON COLUMN tenants.id IS 'Primary key, gen_random_uuid()';
COMMENT ON COLUMN tenants.name IS 'Display name of the tenant (e.g., Apotek Sehat)';
COMMENT ON COLUMN tenants.slug IS 'URL-safe unique slug for subdomain routing (e.g., apotek-sehat)';
COMMENT ON COLUMN tenants.domain IS 'Custom domain for the tenant (e.g., apoteka.medisync.id)';
COMMENT ON COLUMN tenants.settings IS 'Flexible JSONB config for tenant-specific settings (theme, locale, features)';
COMMENT ON COLUMN tenants.is_active IS 'Whether this tenant is active and accessible';
COMMENT ON COLUMN tenants.package_id IS 'FK to tenant_packages — the current subscription tier';
COMMENT ON COLUMN tenants.created_at IS 'Timestamp when the tenant was created';
COMMENT ON COLUMN tenants.updated_at IS 'Timestamp of last update to tenant data';
COMMENT ON COLUMN tenants.deleted_at IS 'Soft delete timestamp; NULL = active';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants (slug);
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants (domain);
CREATE INDEX IF NOT EXISTS idx_tenants_package_id ON tenants (package_id);
CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at ON tenants (deleted_at);

-- ============================================================================
-- 2. PROFILES — Extends auth.users
-- ============================================================================
-- profiles.id IS auth.users.id (NOT auto-generated). This ensures a 1:1 match
-- between auth.users and application profile data.

CREATE TABLE IF NOT EXISTS profiles (
    id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id     UUID REFERENCES tenants(id) ON DELETE SET NULL,
    display_name  VARCHAR(200) NOT NULL,
    avatar_url    TEXT,
    phone         VARCHAR(30),
    is_active     BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'Extends auth.users with application profile data — replaces users table over time';
COMMENT ON COLUMN profiles.id IS 'Primary key — MUST match auth.users.id (1:1 relationship)';
COMMENT ON COLUMN profiles.tenant_id IS 'FK to tenants; NULL for super_admin (no tenant affiliation)';
COMMENT ON COLUMN profiles.display_name IS 'Display name shown in the application UI';
COMMENT ON COLUMN profiles.avatar_url IS 'URL to avatar/profile image';
COMMENT ON COLUMN profiles.phone IS 'Contact phone number';
COMMENT ON COLUMN profiles.is_active IS 'Whether the profile is active and can log in';
COMMENT ON COLUMN profiles.last_login_at IS 'Timestamp of the most recent login';
COMMENT ON COLUMN profiles.created_at IS 'Timestamp when the profile was created';
COMMENT ON COLUMN profiles.updated_at IS 'Timestamp of last profile update';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles (display_name);

-- ============================================================================
-- 3. TENANT_USERS — Junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role       VARCHAR(50) NOT NULL CHECK (role IN ('tenant_owner', 'admin', 'pharmacist', 'cashier', 'staff')),
    is_active  BOOLEAN DEFAULT true,
    invited_at TIMESTAMPTZ,
    joined_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, user_id)
);

COMMENT ON TABLE tenant_users IS 'Junction: which users belong to which tenants with what role — one user can belong to multiple tenants';
COMMENT ON COLUMN tenant_users.id IS 'Primary key, gen_random_uuid()';
COMMENT ON COLUMN tenant_users.tenant_id IS 'FK to tenants — which tenant the user belongs to';
COMMENT ON COLUMN tenant_users.user_id IS 'FK to profiles — which user';
COMMENT ON COLUMN tenant_users.role IS 'Role within the tenant: tenant_owner, admin, pharmacist, cashier, staff';
COMMENT ON COLUMN tenant_users.is_active IS 'Whether this tenant membership is currently active';
COMMENT ON COLUMN tenant_users.invited_at IS 'When the user was invited to this tenant';
COMMENT ON COLUMN tenant_users.joined_at IS 'When the user accepted the invitation and joined';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users (user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON tenant_users (role);

-- ============================================================================
-- 4. DATA MIGRATION — Existing pharmacies → tenants
-- ============================================================================
-- Copies all active pharmacies into tenants, using pharmacy.code as the slug.

INSERT INTO tenants (id, name, slug, is_active, created_at, updated_at)
SELECT
    id,
    name,
    code          AS slug,
    is_active,
    created_at,
    updated_at
FROM pharmacies
WHERE deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. DATA MIGRATION — Existing users → profiles
-- ============================================================================
-- Copies active users into profiles.
-- NOTE: profiles.id REFERENCES auth.users(id). If users.id does not exist in
-- auth.users, the FK constraint will cause this INSERT to fail. In that case,
-- use COALESCE(supabase_uid, id) for the id field instead.

INSERT INTO profiles (id, tenant_id, display_name, phone, is_active, last_login_at, created_at, updated_at)
SELECT
    id,
    cabang_id      AS tenant_id,
    display_name,
    phone,
    is_active,
    last_login_at,
    created_at,
    updated_at
FROM users
WHERE deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. DATA MIGRATION — Existing user-tenant relationships → tenant_users
-- ============================================================================
-- Maps old roles to new role names:
--   owner    → tenant_owner
--   admin    → admin
--   apoteker → pharmacist
--   kasir    → cashier
-- Users with super_admin/developer/support roles (system roles) are excluded
-- as they have no tenant association.

INSERT INTO tenant_users (tenant_id, user_id, role)
SELECT
    u.cabang_id,
    u.id,
    CASE r.name
        WHEN 'owner'    THEN 'tenant_owner'
        WHEN 'admin'    THEN 'admin'
        WHEN 'apoteker' THEN 'pharmacist'
        WHEN 'kasir'    THEN 'cashier'
    END
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE u.cabang_id IS NOT NULL
  AND u.is_active = true
  AND u.deleted_at IS NULL
  AND r.name IN ('owner', 'admin', 'apoteker', 'kasir')
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;
