-- ============================================================================
-- 015_rls_role_policies.sql
-- Medisync SaaS — Role-Specific RLS Policies
-- ============================================================================
-- Migration ini menambahkan policy berbasis role yang lebih granular di atas
-- policy dasar isolasi tenant dari migration 014.
--
-- Policy di sini menggunakan IF NOT EXISTS dan memiliki nama yang SAMA dengan
-- policy di 014 untuk tabel tertentu. Ini berarti policy 014 yang akan berlaku
-- (dibuat lebih dulu) dan policy di sini akan di-skip.
--
-- Policy yang memiliki nama UNIK (tidak ada di 014) akan ditambahkan:
--   - subscriptions_all  → super_admin full access to subscriptions
--   - payments_all       → super_admin full access to payments
--
-- Policy yang menggunakan role check akan di-skip (nama sudah ada di 014):
--   - tenant_users_{select,insert,update,delete}
--   - profiles_{select,update,insert}
--   - products_{select,insert,update}
--   - transactions_{select,insert,update,delete}
--   - transaction_items_{select,insert}
--
-- DESAIN CATATAN:
-- Policy 014 memberikan isolasi tenant dasar (siapa pun dalam tenant bisa
-- membaca/menulis). Policy di sini menambahkan pengecekan role untuk operasi
-- tertentu. Karena keterbatasan IF NOT EXISTS, policy 014 tetap berlaku.
-- Role-based access control (RBAC) tambahan harus diterapkan di lapisan
-- aplikasi hingga policy ini dapat direfaktor.
-- ============================================================================

BEGIN;

-- ****************************************************************************
-- 1. TENANT_USERS — Role-based member management
-- ****************************************************************************
-- tenant_owner: dapat mengelola anggota tenant (insert, update, delete)
-- Semua anggota tenant: dapat melihat daftar anggota
-- Policy ini menggantikan policy 014 yang lebih permisif (IF NOT EXISTS).
-- Karena nama policy sama dengan 014, migration 014 akan tetap berlaku.

DROP POLICY IF EXISTS "tenant_users_select" ON tenant_users;
CREATE POLICY "tenant_users_select" ON tenant_users
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "tenant_users_insert" ON tenant_users;
CREATE POLICY "tenant_users_insert" ON tenant_users
  FOR INSERT
  WITH CHECK (
    public.has_tenant_access(tenant_id)
    AND public.user_tenant_role() = 'tenant_owner'
  );

DROP POLICY IF EXISTS "tenant_users_update" ON tenant_users;
CREATE POLICY "tenant_users_update" ON tenant_users
  FOR UPDATE
  USING (
    public.has_tenant_access(tenant_id)
    AND public.user_tenant_role() = 'tenant_owner'
  )
  WITH CHECK (
    public.has_tenant_access(tenant_id)
    AND public.user_tenant_role() = 'tenant_owner'
  );

DROP POLICY IF EXISTS "tenant_users_delete" ON tenant_users;
CREATE POLICY "tenant_users_delete" ON tenant_users
  FOR DELETE
  USING (
    public.has_tenant_access(tenant_id)
    AND public.user_tenant_role() = 'tenant_owner'
  );

-- ****************************************************************************
-- 2. SUBSCRIPTIONS — Owner + admin view, super_admin manages
-- ****************************************************************************
-- subscriptions_select: owner dan admin dapat melihat subscription tenant-nya
-- subscriptions_all: super_admin dapat melakukan apa pun

DROP POLICY IF EXISTS "subscriptions_select" ON subscriptions;
CREATE POLICY "subscriptions_select" ON subscriptions
  FOR SELECT
  USING (
    public.has_tenant_access(tenant_id)
    AND public.user_tenant_role() IN ('tenant_owner', 'admin')
  );

-- Super_admin full access — policy name UNIK, akan ditambahkan
DROP POLICY IF EXISTS "subscriptions_all" ON subscriptions;
CREATE POLICY "subscriptions_all" ON subscriptions
  FOR ALL
  USING (public.is_super_admin());

-- ****************************************************************************
-- 3. PAYMENTS — Super_admin only (billing data is sensitive)
-- ****************************************************************************
-- payments_all: super_admin dapat melakukan apa pun
-- Policy ini menambahkan akses super_admin di atas policy 014 yang memberikan
-- akses ke tenant user.

DROP POLICY IF EXISTS "payments_all" ON payments;
CREATE POLICY "payments_all" ON payments
  FOR ALL
  USING (public.is_super_admin());

-- ****************************************************************************
-- 4. TRANSACTIONS — Cashier can insert, all tenant can view, super_admin void
-- ****************************************************************************
-- transactions_insert: cashier, pharmacist, admin, tenant_owner
-- transactions_update: only super_admin (void transactions)
-- transactions_select: all tenant users
-- transactions_delete: only super_admin

DROP POLICY IF EXISTS "transactions_select" ON transactions;
CREATE POLICY "transactions_select" ON transactions
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "transactions_insert" ON transactions;
CREATE POLICY "transactions_insert" ON transactions
  FOR INSERT
  WITH CHECK (
    public.has_tenant_access(tenant_id)
    AND public.user_tenant_role() IN ('cashier', 'pharmacist', 'admin', 'tenant_owner')
  );

DROP POLICY IF EXISTS "transactions_update" ON transactions;
CREATE POLICY "transactions_update" ON transactions
  FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "transactions_delete" ON transactions;
CREATE POLICY "transactions_delete" ON transactions
  FOR DELETE
  USING (public.is_super_admin());

-- ****************************************************************************
-- 5. TRANSACTION_ITEMS — Inherit access from parent transaction
-- ****************************************************************************

DROP POLICY IF EXISTS "transaction_items_select" ON transaction_items;
CREATE POLICY "transaction_items_select" ON transaction_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_items.transaction_id
        AND public.has_tenant_access(t.tenant_id)
    )
  );

DROP POLICY IF EXISTS "transaction_items_insert" ON transaction_items;
CREATE POLICY "transaction_items_insert" ON transaction_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_items.transaction_id
        AND public.has_tenant_access(t.tenant_id)
    )
  );

-- ****************************************************************************
-- 6. TRANSACTION_PAYMENTS — Inherit access from parent transaction
-- ****************************************************************************

DROP POLICY IF EXISTS "transaction_payments_select" ON transaction_payments;
CREATE POLICY "transaction_payments_select" ON transaction_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_payments.transaction_id
        AND public.has_tenant_access(t.tenant_id)
    )
  );

DROP POLICY IF EXISTS "transaction_payments_insert" ON transaction_payments;
CREATE POLICY "transaction_payments_insert" ON transaction_payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_payments.transaction_id
        AND public.has_tenant_access(t.tenant_id)
    )
  );

-- ****************************************************************************
-- 7. PROFILES — Self-access + super_admin
-- ****************************************************************************
-- profiles_select: user dapat melihat profil sendiri, profil dalam tenant,
--                  atau super_admin melihat semua
-- profiles_update: user dapat update profil sendiri, super_admin semua
-- profiles_insert: hanya super_admin

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR public.has_tenant_access(tenant_id)
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE
  USING (id = auth.uid() OR public.is_super_admin())
  WITH CHECK (id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT
  WITH CHECK (public.is_super_admin());

-- ****************************************************************************
-- 8. PRODUCTS — Role-based CRUD
-- ****************************************************************************
-- products_select: all tenant users
-- products_insert: tenant_owner, admin, pharmacist
-- products_update: tenant_owner, admin, pharmacist

DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "products_insert" ON products;
CREATE POLICY "products_insert" ON products
  FOR INSERT
  WITH CHECK (
    public.has_tenant_access(tenant_id)
    AND public.user_tenant_role() IN ('tenant_owner', 'admin', 'pharmacist')
  );

DROP POLICY IF EXISTS "products_update" ON products;
CREATE POLICY "products_update" ON products
  FOR UPDATE
  USING (
    public.has_tenant_access(tenant_id)
    AND public.user_tenant_role() IN ('tenant_owner', 'admin', 'pharmacist')
  )
  WITH CHECK (
    public.has_tenant_access(tenant_id)
    AND public.user_tenant_role() IN ('tenant_owner', 'admin', 'pharmacist')
  );

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;
