-- ============================================================================
-- 030_user_permission_overrides.sql
-- Granular per-user permission overrides on top of role-based permissions.
--
-- tenant_owner/admin can grant additional permissions (or revoke existing ones)
-- for individual users without changing the user's role.
--
-- Override logic:
--   granted=true  → adds permission even if role doesn't have it
--   granted=false → removes permission even if role has it
--   no override    → fall back to ROLE_PERMISSIONS[role]
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  permission  VARCHAR(100) NOT NULL,
  granted     BOOLEAN NOT NULL DEFAULT true,
  set_by      UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id, permission)
);

COMMENT ON TABLE user_permission_overrides
  IS 'Per-user permission exceptions. granted=true adds, granted=false removes. One row per (tenant, user, permission).';

COMMENT ON COLUMN user_permission_overrides.user_id
  IS 'References auth.users(id) — the target user receiving the override';

COMMENT ON COLUMN user_permission_overrides.set_by
  IS 'References auth.users(id) — the admin who set this override';

CREATE INDEX IF NOT EXISTS idx_user_overrides_tenant_user
  ON user_permission_overrides (tenant_id, user_id);

ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. RLS: SELECT — tenant_owner/admin can see overrides in their tenant;
--    users can see their own overrides (needed for auth-store)
-- ---------------------------------------------------------------------------

CREATE POLICY "user_overrides_select_tenant_staff" ON user_permission_overrides
  FOR SELECT
  USING (
    public.has_tenant_access(tenant_id)
    AND public.user_tenant_role() = 'tenant_owner'
  );

CREATE POLICY "user_overrides_select_own" ON user_permission_overrides
  FOR SELECT
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. RLS: INSERT — only tenant_owner/admin can create overrides
-- ---------------------------------------------------------------------------

CREATE POLICY "user_overrides_insert_tenant_staff" ON user_permission_overrides
  FOR INSERT
  WITH CHECK (
    public.has_tenant_access(tenant_id)
    AND public.user_tenant_role() = 'tenant_owner'
  );

-- ---------------------------------------------------------------------------
-- 4. RLS: UPDATE — only tenant_owner/admin can update overrides
-- ---------------------------------------------------------------------------

CREATE POLICY "user_overrides_update_tenant_staff" ON user_permission_overrides
  FOR UPDATE
  USING (
    public.has_tenant_access(tenant_id)
    AND public.user_tenant_role() = 'tenant_owner'
  );

-- ---------------------------------------------------------------------------
-- 5. RLS: DELETE — only tenant_owner/admin can delete overrides
-- ---------------------------------------------------------------------------

CREATE POLICY "user_overrides_delete_tenant_staff" ON user_permission_overrides
  FOR DELETE
  USING (
    public.has_tenant_access(tenant_id)
    AND public.user_tenant_role() = 'tenant_owner'
  );

COMMIT;
