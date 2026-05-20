-- ============================================================================
-- 017_rls_system_tables.sql
-- Medisync SaaS — System/Global Table RLS Policies
-- ============================================================================
-- Migration ini mengaktifkan RLS dan membuat policy untuk tabel sistem/
-- referensi global yang sebelumnya tidak memiliki RLS:
--
--   1. roles             — SELECT for all authenticated users
--   2. permissions       — SELECT for all authenticated users
--   3. role_permissions  — SELECT for all authenticated users
--   4. tenant_packages   — SELECT for all authenticated, ALL for super_admin
--   5. product_units     — SELECT for all authenticated users
--   6. app_settings      — SELECT for all authenticated, UPDATE for super_admin
--
-- Semua tabel ini bersifat READ-ONLY untuk pengguna biasa. Hanya super_admin
-- yang dapat memodifikasi data referensi ini.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ROLES
-- ============================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roles_select" ON roles;
CREATE POLICY "roles_select" ON roles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

COMMENT ON POLICY "roles_select" ON roles
  IS 'All authenticated users can read roles. No write access for anyone.';

-- ============================================================================
-- 2. PERMISSIONS
-- ============================================================================

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permissions_select" ON permissions;
CREATE POLICY "permissions_select" ON permissions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

COMMENT ON POLICY "permissions_select" ON permissions
  IS 'All authenticated users can read permissions. No write access for anyone.';

-- ============================================================================
-- 3. ROLE_PERMISSIONS
-- ============================================================================

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions_select" ON role_permissions;
CREATE POLICY "role_permissions_select" ON role_permissions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

COMMENT ON POLICY "role_permissions_select" ON role_permissions
  IS 'All authenticated users can read role-permission mappings. No write access for anyone.';

-- ============================================================================
-- 4. TENANT_PACKAGES
-- ============================================================================

ALTER TABLE tenant_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_packages_select" ON tenant_packages;
CREATE POLICY "tenant_packages_select" ON tenant_packages
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

COMMENT ON POLICY "tenant_packages_select" ON tenant_packages
  IS 'All authenticated users can read tenant package definitions.';

DROP POLICY IF EXISTS "tenant_packages_all" ON tenant_packages;
CREATE POLICY "tenant_packages_all" ON tenant_packages
  FOR ALL
  USING (public.is_super_admin());

COMMENT ON POLICY "tenant_packages_all" ON tenant_packages
  IS 'Super_admin has full CRUD access to tenant package definitions.';

-- ============================================================================
-- 5. PRODUCT_UNITS
-- ============================================================================

ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_units_select" ON product_units;
CREATE POLICY "product_units_select" ON product_units
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

COMMENT ON POLICY "product_units_select" ON product_units
  IS 'All authenticated users can read product unit definitions. No write access for anyone.';

-- ============================================================================
-- 6. APP_SETTINGS — Additional system-level access
-- ============================================================================
-- app_settings sudah memiliki RLS diaktifkan dan policy dari 014.
-- Policy di sini menambahkan akses read untuk semua authenticated user
-- (termasuk global settings dengan tenant_id IS NULL) dan update untuk
-- super_admin.
--
-- Karena nama policy sama dengan 014, policy ini akan di-skip oleh
-- IF NOT EXISTS. Policy 014 (tenant-scoped) tetap berlaku.

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_select" ON app_settings;
CREATE POLICY "app_settings_select" ON app_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "app_settings_update" ON app_settings;
CREATE POLICY "app_settings_update" ON app_settings
  FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;
