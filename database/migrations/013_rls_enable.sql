-- ============================================================================
-- 013_rls_enable.sql
-- Medisync SaaS — RLS Helper Functions & Enable RLS on All Tenant Tables
-- ============================================================================
-- Migration ini mencakup:
--   1. Helper functions for RLS (idempotent, in case 012 is missing)
--   2. Enable ROW LEVEL SECURITY on ALL tenant-scoped tables
--
-- Helper functions (idempotent with CREATE OR REPLACE):
--   public.is_super_admin()       → boolean
--   public.user_tenant_id()       → UUID
--   public.user_tenant_role()     → VARCHAR
--   public.has_tenant_access()    → boolean
--
-- Tables with RLS ENABLED (26 total):
--   tenants, profiles, tenant_users, products, product_categories,
--   product_batches, suppliers, purchase_invoices, purchase_items,
--   stock_movements, stock_opname, stock_opname_items, transactions,
--   transaction_items, transaction_payments, store_expansion_requests,
--   tenant_quotas, subscriptions, payments, activity_logs, sync_queue,
--   offline_sessions, pharmacies, users, supplier_debts, app_settings
--
-- NOT enabled (system/global tables):
--   roles, permissions, role_permissions, product_units, tenant_packages
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. HELPER FUNCTIONS (idempotent — OR REPLACE)
-- ============================================================================
-- All functions use SECURITY DEFINER to bypass RLS on underlying tables
-- (profiles, tenant_users) so they can evaluate access without recursion.
-- ============================================================================

-- 1a. public.is_super_admin()
-- Returns true if the current user has a profile with NULL tenant_id
-- and is_active = true (super_admins have no tenant affiliation).
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.tenant_id IS NULL
      AND p.is_active = true
  );
$$;

COMMENT ON FUNCTION public.is_super_admin()
  IS 'Returns true if the current user is a super_admin (tenant_id IS NULL in profiles). SECURITY DEFINER bypasses RLS.';

-- 1b. public.user_tenant_id()
-- Returns the tenant_id of the current authenticated user.
-- Returns NULL if the user is a super_admin or not found.
CREATE OR REPLACE FUNCTION public.user_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT tenant_id
  FROM profiles
  WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.user_tenant_id()
  IS 'Returns the tenant_id of the current authenticated user (NULL for super_admin). SECURITY DEFINER bypasses RLS.';

-- 1c. public.user_tenant_role()
-- Returns the role of the current user within their primary active tenant.
-- Returns NULL if the user has no active tenant membership.
CREATE OR REPLACE FUNCTION public.user_tenant_role()
RETURNS VARCHAR
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT tu.role
  FROM tenant_users tu
  JOIN profiles p ON p.id = tu.user_id
  WHERE p.id = auth.uid()
    AND tu.is_active = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.user_tenant_role()
  IS 'Returns the role of the current user in their active tenant (NULL if no membership). SECURITY DEFINER bypasses RLS.';

-- 1d. public.has_tenant_access(target_tenant_id UUID)
-- Returns true if the current user has access to the specified tenant.
-- Super_admins always have access. Regular users must have an active
-- tenant_users membership with an active profile.
CREATE OR REPLACE FUNCTION public.has_tenant_access(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_users tu
    JOIN profiles p ON p.id = tu.user_id
    WHERE p.id = auth.uid()
      AND tu.tenant_id = target_tenant_id
      AND tu.is_active = true
      AND p.is_active = true
  ) OR public.is_super_admin();
$$;

COMMENT ON FUNCTION public.has_tenant_access(UUID)
  IS 'Returns true if the current user has access to target_tenant_id (super_admin always has access). SECURITY DEFINER bypasses RLS.';

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY — Tenant-Scoped Tables
-- ============================================================================
-- Enabling RLS without policies means ALL access is denied by default.
-- Policies are created in subsequent migrations (014–017).
--
-- NOTE: Tables are listed in dependency order where possible.
-- ============================================================================

-- Core tenant tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Product & inventory tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Purchase tables
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

-- Stock management tables
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opname ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opname_items ENABLE ROW LEVEL SECURITY;

-- Transaction tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_payments ENABLE ROW LEVEL SECURITY;

-- Expansion & quota tables
ALTER TABLE store_expansion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_quotas ENABLE ROW LEVEL SECURITY;

-- Billing tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Audit & sync tables
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sessions ENABLE ROW LEVEL SECURITY;

-- Legacy tables
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Financial & settings tables
ALTER TABLE supplier_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;
