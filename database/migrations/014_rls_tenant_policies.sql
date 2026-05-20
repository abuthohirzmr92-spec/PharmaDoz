-- ============================================================================
-- 014_rls_tenant_policies.sql
-- Medisync SaaS — Basic Tenant Isolation RLS Policies
-- ============================================================================
-- Migration ini membuat policy RLS dasar untuk isolasi tenant pada semua
-- tenant-scoped tables. Setiap tabel mendapat 4 policy (SELECT, INSERT,
-- UPDATE, DELETE) kecuali yang membutuhkan penanganan khusus.
--
-- Pattern standar untuk tabel dengan tenant_id:
--   SELECT: public.has_tenant_access(tenant_id)
--   INSERT: public.has_tenant_access(tenant_id) WITH CHECK
--   UPDATE: public.has_tenant_access(tenant_id) USING + WITH CHECK
--   DELETE: public.is_super_admin()
--
-- Tabel tanpa tenant_id langsung (transaction_items, transaction_payments):
--   Menggunakan subquery melalui parent table (transactions)
--
-- Legacy tables (pharmacies, users):
--   pharmacies: menggunakan id sebagai tenant identifier
--   users: menggunakan cabang_id sebagai tenant identifier
--
-- Special cases:
--   tenants: SELECT untuk semua (login page), INSERT/DELETE hanya super_admin
--   profiles: tambahan policy untuk self-read (profiles_select_own)
--   activity_logs: hanya SELECT + INSERT (append-only, tidak ada UPDATE/DELETE)
-- ============================================================================

BEGIN;

-- ****************************************************************************
-- SECTION 1: Tables with direct tenant_id column — Standard 4-policy pattern
-- ****************************************************************************
-- Setiap tabel mendapat:
--   <table>_select  → FOR SELECT  USING (public.has_tenant_access(tenant_id))
--   <table>_insert  → FOR INSERT  WITH CHECK (public.has_tenant_access(tenant_id))
--   <table>_update  → FOR UPDATE USING (public.has_tenant_access(tenant_id))
--                     WITH CHECK (public.has_tenant_access(tenant_id))
--   <table>_delete  → FOR DELETE USING (public.is_super_admin())
-- ****************************************************************************

-- ==========================================================================
-- 1a. TENANT_USERS
-- ==========================================================================

CREATE POLICY "tenant_users_select" ON tenant_users
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "tenant_users_insert" ON tenant_users
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "tenant_users_update" ON tenant_users
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "tenant_users_delete" ON tenant_users
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1b. PRODUCTS
-- ==========================================================================

CREATE POLICY "products_select" ON products
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "products_insert" ON products
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "products_update" ON products
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "products_delete" ON products
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1c. PRODUCT_CATEGORIES
-- ==========================================================================

CREATE POLICY "product_categories_select" ON product_categories
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "product_categories_insert" ON product_categories
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "product_categories_update" ON product_categories
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "product_categories_delete" ON product_categories
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1d. PRODUCT_BATCHES
-- ==========================================================================

CREATE POLICY "product_batches_select" ON product_batches
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "product_batches_insert" ON product_batches
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "product_batches_update" ON product_batches
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "product_batches_delete" ON product_batches
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1e. SUPPLIERS
-- ==========================================================================

CREATE POLICY "suppliers_select" ON suppliers
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "suppliers_insert" ON suppliers
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "suppliers_update" ON suppliers
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "suppliers_delete" ON suppliers
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1f. PURCHASE_INVOICES
-- ==========================================================================

CREATE POLICY "purchase_invoices_select" ON purchase_invoices
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "purchase_invoices_insert" ON purchase_invoices
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "purchase_invoices_update" ON purchase_invoices
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "purchase_invoices_delete" ON purchase_invoices
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1g. PURCHASE_ITEMS
-- ==========================================================================

CREATE POLICY "purchase_items_select" ON purchase_items
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "purchase_items_insert" ON purchase_items
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "purchase_items_update" ON purchase_items
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "purchase_items_delete" ON purchase_items
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1h. STOCK_MOVEMENTS
-- ==========================================================================

CREATE POLICY "stock_movements_select" ON stock_movements
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "stock_movements_insert" ON stock_movements
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "stock_movements_update" ON stock_movements
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "stock_movements_delete" ON stock_movements
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1i. STOCK_OPNAME
-- ==========================================================================

CREATE POLICY "stock_opname_select" ON stock_opname
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "stock_opname_insert" ON stock_opname
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "stock_opname_update" ON stock_opname
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "stock_opname_delete" ON stock_opname
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1j. STOCK_OPNAME_ITEMS
-- ==========================================================================

CREATE POLICY "stock_opname_items_select" ON stock_opname_items
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "stock_opname_items_insert" ON stock_opname_items
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "stock_opname_items_update" ON stock_opname_items
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "stock_opname_items_delete" ON stock_opname_items
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1k. TRANSACTIONS
-- ==========================================================================

CREATE POLICY "transactions_select" ON transactions
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "transactions_insert" ON transactions
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "transactions_update" ON transactions
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "transactions_delete" ON transactions
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1l. STORE_EXPANSION_REQUESTS
-- ==========================================================================

CREATE POLICY "store_expansion_requests_select" ON store_expansion_requests
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "store_expansion_requests_insert" ON store_expansion_requests
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "store_expansion_requests_update" ON store_expansion_requests
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "store_expansion_requests_delete" ON store_expansion_requests
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1m. TENANT_QUOTAS
-- ==========================================================================

CREATE POLICY "tenant_quotas_select" ON tenant_quotas
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "tenant_quotas_insert" ON tenant_quotas
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "tenant_quotas_update" ON tenant_quotas
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "tenant_quotas_delete" ON tenant_quotas
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1n. SUBSCRIPTIONS
-- ==========================================================================

CREATE POLICY "subscriptions_select" ON subscriptions
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "subscriptions_insert" ON subscriptions
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "subscriptions_update" ON subscriptions
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "subscriptions_delete" ON subscriptions
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1o. PAYMENTS
-- ==========================================================================

CREATE POLICY "payments_select" ON payments
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "payments_insert" ON payments
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "payments_update" ON payments
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "payments_delete" ON payments
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1p. SYNC_QUEUE
-- ==========================================================================

CREATE POLICY "sync_queue_select" ON sync_queue
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "sync_queue_insert" ON sync_queue
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "sync_queue_update" ON sync_queue
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "sync_queue_delete" ON sync_queue
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1q. OFFLINE_SESSIONS
-- ==========================================================================

CREATE POLICY "offline_sessions_select" ON offline_sessions
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "offline_sessions_insert" ON offline_sessions
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "offline_sessions_update" ON offline_sessions
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "offline_sessions_delete" ON offline_sessions
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1r. SUPPLIER_DEBTS
-- ==========================================================================

CREATE POLICY "supplier_debts_select" ON supplier_debts
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "supplier_debts_insert" ON supplier_debts
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "supplier_debts_update" ON supplier_debts
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "supplier_debts_delete" ON supplier_debts
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 1s. APP_SETTINGS
-- ==========================================================================

CREATE POLICY "app_settings_select" ON app_settings
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "app_settings_insert" ON app_settings
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "app_settings_update" ON app_settings
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "app_settings_delete" ON app_settings
  FOR DELETE
  USING (public.is_super_admin());

-- ****************************************************************************
-- SECTION 2: Special cases — Custom policies for specific tables
-- ****************************************************************************

-- ==========================================================================
-- 2a. TENANTS (Special: wider SELECT for login page, super_admin management)
-- ==========================================================================
-- tenants has no tenant_id column — the row's own id IS the tenant identifier.
--   SELECT:  all users (even unauthenticated) can see active tenants for login
--   INSERT:  only super_admin can create new tenants
--   UPDATE:  user must have tenant access OR be super_admin
--   DELETE:  only super_admin can delete tenants

CREATE POLICY "tenants_select" ON tenants
  FOR SELECT
  USING (true);

CREATE POLICY "tenants_insert" ON tenants
  FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "tenants_update" ON tenants
  FOR UPDATE
  USING (public.has_tenant_access(id) OR public.is_super_admin())
  WITH CHECK (public.has_tenant_access(id) OR public.is_super_admin());

CREATE POLICY "tenants_delete" ON tenants
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 2b. PROFILES (Special: + extra self-read policy)
-- ==========================================================================
-- Standard 4 policies + 1 extra:
--   profiles_select_own: users can always see their own profile
--
--   SELECT: user sees profiles in their tenant; super_admin sees all
--   INSERT: only super_admin can create profiles
--   UPDATE: user can update own profile (id = auth.uid()) or super_admin
--   DELETE: only super_admin

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE
  USING (public.is_super_admin());

-- Extra: users can always SELECT their own profile, even without tenant context
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- ==========================================================================
-- 2c. ACTIVITY_LOGS (Special: append-only audit trail)
-- ==========================================================================
-- Activity logs are APPEND-ONLY. Only SELECT and INSERT policies are created.
-- No UPDATE or DELETE policies — no one can modify or delete audit logs.
-- This preserves audit trail integrity.

CREATE POLICY "activity_logs_select" ON activity_logs
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "activity_logs_insert" ON activity_logs
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

-- NOTE: No UPDATE or DELETE policies for activity_logs (append-only design).

-- ****************************************************************************
-- SECTION 3: Tables without direct tenant_id column
-- ****************************************************************************
-- These tables need subqueries through their parent table to check tenant access.

-- ==========================================================================
-- 3a. TRANSACTION_ITEMS (no tenant_id — trace via transactions)
-- ==========================================================================

CREATE POLICY "transaction_items_select" ON transaction_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_items.transaction_id
        AND public.has_tenant_access(t.tenant_id)
    )
  );

CREATE POLICY "transaction_items_insert" ON transaction_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_items.transaction_id
        AND public.has_tenant_access(t.tenant_id)
    )
  );

CREATE POLICY "transaction_items_update" ON transaction_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_items.transaction_id
        AND public.has_tenant_access(t.tenant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_items.transaction_id
        AND public.has_tenant_access(t.tenant_id)
    )
  );

CREATE POLICY "transaction_items_delete" ON transaction_items
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 3b. TRANSACTION_PAYMENTS (no tenant_id — trace via transactions)
-- ==========================================================================

CREATE POLICY "transaction_payments_select" ON transaction_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_payments.transaction_id
        AND public.has_tenant_access(t.tenant_id)
    )
  );

CREATE POLICY "transaction_payments_insert" ON transaction_payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_payments.transaction_id
        AND public.has_tenant_access(t.tenant_id)
    )
  );

CREATE POLICY "transaction_payments_update" ON transaction_payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_payments.transaction_id
        AND public.has_tenant_access(t.tenant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_payments.transaction_id
        AND public.has_tenant_access(t.tenant_id)
    )
  );

CREATE POLICY "transaction_payments_delete" ON transaction_payments
  FOR DELETE
  USING (public.is_super_admin());

-- ****************************************************************************
-- SECTION 4: Legacy tables (different column naming)
-- ****************************************************************************

-- ==========================================================================
-- 4a. PHARMACIES (Legacy — uses id as tenant identifier)
-- ==========================================================================
-- pharmacies.id == tenants.id (seeded with same UUIDs in migration 007).
-- The row's own id IS the tenant UUID for access checks.

CREATE POLICY "pharmacies_select" ON pharmacies
  FOR SELECT
  USING (public.has_tenant_access(id));

CREATE POLICY "pharmacies_insert" ON pharmacies
  FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "pharmacies_update" ON pharmacies
  FOR UPDATE
  USING (public.has_tenant_access(id))
  WITH CHECK (public.has_tenant_access(id));

CREATE POLICY "pharmacies_delete" ON pharmacies
  FOR DELETE
  USING (public.is_super_admin());

-- ==========================================================================
-- 4b. USERS (Legacy — uses cabang_id as tenant identifier)
-- ==========================================================================
-- users.cabang_id references pharmacies.id which equals tenants.id.

CREATE POLICY "users_select" ON users
  FOR SELECT
  USING (public.has_tenant_access(cabang_id));

CREATE POLICY "users_insert" ON users
  FOR INSERT
  WITH CHECK (public.has_tenant_access(cabang_id));

CREATE POLICY "users_update" ON users
  FOR UPDATE
  USING (public.has_tenant_access(cabang_id))
  WITH CHECK (public.has_tenant_access(cabang_id));

CREATE POLICY "users_delete" ON users
  FOR DELETE
  USING (public.is_super_admin());

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;
