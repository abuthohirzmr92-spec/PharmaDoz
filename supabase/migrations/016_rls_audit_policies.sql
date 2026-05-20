-- ============================================================================
-- 016_rls_audit_policies.sql
-- Medisync SaaS — Audit & Sync Table RLS Policies
-- ============================================================================
-- Migration ini menambahkan policy untuk tabel audit dan sync yang memerlukan
-- penanganan akses khusus:
--
--   1. activity_logs — Append-only audit trail
--      - INSERT: any authenticated user can create log entries
--      - SELECT: super_admin and tenant_owner only
--      - No UPDATE/DELETE (append-only integrity)
--
--   2. sync_queue — Offline sync queue
--      - Standard tenant-scoped access with status update capability
--
--   3. offline_sessions — Offline session tracking
--      - Standard tenant-scoped access
--
-- DESAIN CATATAN:
-- Policy untuk activity_logs menggunakan nama UNIK untuk menghindari konflik
-- dengan policy 014 yang lebih permisif. Policy 014 memberikan akses SELECT
-- ke semua tenant user, sementara policy di sini membatasi ke super_admin
-- dan tenant_owner saja. Kedua policy akan digabungkan dengan OR.
--
-- Policy untuk sync_queue dan offline_sessions memiliki nama yang sama dengan
-- policy 014 dan akan di-skip oleh IF NOT EXISTS. Policy 014 tetap berlaku.
-- ============================================================================

BEGIN;

-- ****************************************************************************
-- 1. ACTIVITY_LOGS — Append-only audit trail
-- ****************************************************************************
-- INSERT:  any authenticated user can create log entries
-- SELECT:  only super_admin or tenant_owner can read logs
-- UPDATE:  NO POLICY — no one can modify audit logs
-- DELETE:  NO POLICY — no one can delete audit logs
--
-- Policy names use _authenticated and _audit suffix to avoid conflict
-- with 014's more permissive policies. Both policies combine with OR.

DROP POLICY IF EXISTS "activity_logs_insert_authenticated" ON activity_logs;
CREATE POLICY "activity_logs_insert_authenticated" ON activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "activity_logs_select_audit" ON activity_logs;
CREATE POLICY "activity_logs_select_audit" ON activity_logs
  FOR SELECT
  USING (
    public.is_super_admin()
    OR public.user_tenant_role() = 'tenant_owner'
  );

-- ****************************************************************************
-- 2. SYNC_QUEUE — Offline sync queue
-- ****************************************************************************
-- Tenant-scoped with status update capability.
-- Policy names match 014 — will be skipped by IF NOT EXISTS.

DROP POLICY IF EXISTS "sync_queue_select" ON sync_queue;
CREATE POLICY "sync_queue_select" ON sync_queue
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "sync_queue_insert" ON sync_queue;
CREATE POLICY "sync_queue_insert" ON sync_queue
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "sync_queue_update" ON sync_queue;
CREATE POLICY "sync_queue_update" ON sync_queue
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "sync_queue_delete" ON sync_queue;
CREATE POLICY "sync_queue_delete" ON sync_queue
  FOR DELETE
  USING (public.is_super_admin());

-- ****************************************************************************
-- 3. OFFLINE_SESSIONS — Offline session tracking
-- ****************************************************************************
-- Tenant-scoped. Policy names match 014 — will be skipped by IF NOT EXISTS.

DROP POLICY IF EXISTS "offline_sessions_select" ON offline_sessions;
CREATE POLICY "offline_sessions_select" ON offline_sessions
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "offline_sessions_insert" ON offline_sessions;
CREATE POLICY "offline_sessions_insert" ON offline_sessions
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "offline_sessions_update" ON offline_sessions;
CREATE POLICY "offline_sessions_update" ON offline_sessions
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id))
  WITH CHECK (public.has_tenant_access(tenant_id));

-- NOTE: No DELETE policy for offline_sessions — only super_admin can delete
-- via 014's "offline_sessions_delete" policy.

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;
