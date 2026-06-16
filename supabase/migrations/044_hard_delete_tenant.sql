-- ============================================================================
-- 044_hard_delete_tenant.sql
-- Permanent tenant deletion RPC — pre-launch admin tool
--
-- SECURITY DEFINER: bypasses RLS, runs as function owner
-- Only super_admin can execute (checked via is_super_admin())
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Helper: hard_delete_tenant(p_tenant_id UUID)
--    Deletes ALL tenant data permanently. No soft delete. No undo.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.hard_delete_tenant(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_name TEXT;
  v_branch_count INTEGER;
  v_user_count INTEGER;
  v_deleted_users INTEGER := 0;
  v_user_record RECORD;
BEGIN
  -- Auth check: only super_admin
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hanya super_admin yang dapat menghapus tenant.');
  END IF;

  -- Verify tenant exists
  SELECT name INTO v_tenant_name FROM tenants WHERE id = p_tenant_id;
  IF v_tenant_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tenant tidak ditemukan.');
  END IF;

  SELECT COUNT(*) INTO v_branch_count FROM branches WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO v_user_count FROM tenant_users WHERE tenant_id = p_tenant_id AND is_active = true;

  -- ==========================================================================
  -- Delete order: child tables first, then parent
  -- ==========================================================================

  -- Offline sync
  DELETE FROM sync_queue WHERE tenant_id = p_tenant_id;
  DELETE FROM offline_sync_log WHERE tenant_id = p_tenant_id;

  -- Invitations
  DELETE FROM invitation_tokens WHERE tenant_id = p_tenant_id;

  -- Subscriptions
  DELETE FROM subscription_events WHERE tenant_id = p_tenant_id;
  DELETE FROM subscriptions WHERE tenant_id = p_tenant_id;

  -- Provisioning audit
  DELETE FROM provisioning_audit WHERE tenant_id = p_tenant_id;

  -- Activity logs
  DELETE FROM activity_logs WHERE tenant_id = p_tenant_id;

  -- App settings
  DELETE FROM app_settings WHERE tenant_id = p_tenant_id;

  -- User permission overrides
  DELETE FROM user_permission_overrides WHERE tenant_id = p_tenant_id;

  -- Tenant users
  DELETE FROM tenant_users WHERE tenant_id = p_tenant_id;

  -- Profiles — auth users deleted via server action (deleteTenantAuthUsers)
  -- before this RPC runs. Profiles cascade-delete with auth.users FK.
  -- No need to unlink here.

  -- Tenant quotas
  DELETE FROM tenant_quotas WHERE tenant_id = p_tenant_id;

  -- Financial: wallets → cascade wallet_transactions, wallet_transfers, wallet_audit_logs
  DELETE FROM capital_transactions WHERE tenant_id = p_tenant_id;
  DELETE FROM purchase_payments WHERE invoice_id IN (
    SELECT id FROM purchase_invoices pi
    JOIN suppliers s ON s.id = pi.supplier_id
    WHERE s.tenant_id = p_tenant_id
  );
  DELETE FROM wallet_transactions WHERE wallet_id IN (
    SELECT id FROM financial_wallets WHERE tenant_id = p_tenant_id
  );
  DELETE FROM wallet_transfers WHERE from_wallet_id IN (
    SELECT id FROM financial_wallets WHERE tenant_id = p_tenant_id
  );
  DELETE FROM wallet_transfers WHERE to_wallet_id IN (
    SELECT id FROM financial_wallets WHERE tenant_id = p_tenant_id
  );
  DELETE FROM wallet_audit_logs WHERE wallet_id IN (
    SELECT id FROM financial_wallets WHERE tenant_id = p_tenant_id
  );
  DELETE FROM financial_wallets WHERE tenant_id = p_tenant_id;

  -- Profit allocation
  DELETE FROM profit_allocations WHERE tenant_id = p_tenant_id;
  DELETE FROM profit_allocation_settings WHERE tenant_id = p_tenant_id;

  -- Inventory
  DELETE FROM stock_opname_items WHERE opname_id IN (
    SELECT id FROM stock_opname WHERE tenant_id = p_tenant_id
  );
  DELETE FROM stock_opname WHERE tenant_id = p_tenant_id;
  DELETE FROM stock_movements WHERE pharmacy_id IN (
    SELECT id FROM branches WHERE tenant_id = p_tenant_id
  );

  -- Sale batch allocations
  DELETE FROM sale_batch_allocations WHERE tenant_id = p_tenant_id;

  -- Sales returns
  DELETE FROM sales_return_allocations WHERE tenant_id = p_tenant_id;
  DELETE FROM sales_return_items WHERE return_id IN (
    SELECT id FROM sales_returns WHERE tenant_id = p_tenant_id
  );
  DELETE FROM sales_returns WHERE tenant_id = p_tenant_id;

  -- Product batches
  DELETE FROM product_batches WHERE tenant_id = p_tenant_id;
  DELETE FROM product_batches WHERE pharmacy_id IN (
    SELECT id FROM branches WHERE tenant_id = p_tenant_id
  );

  -- Transactions
  DELETE FROM transaction_payments WHERE transaction_id IN (
    SELECT id FROM transactions WHERE tenant_id = p_tenant_id
  );
  DELETE FROM transaction_items WHERE transaction_id IN (
    SELECT id FROM transactions WHERE tenant_id = p_tenant_id
  );
  DELETE FROM transactions WHERE tenant_id = p_tenant_id;

  -- Purchases
  DELETE FROM purchase_items WHERE invoice_id IN (
    SELECT id FROM purchase_invoices pi
    JOIN suppliers s ON s.id = pi.supplier_id
    WHERE s.tenant_id = p_tenant_id
  );
  DELETE FROM purchase_invoices WHERE supplier_id IN (
    SELECT id FROM suppliers WHERE tenant_id = p_tenant_id
  );
  DELETE FROM supplier_debts WHERE tenant_id = p_tenant_id;
  DELETE FROM suppliers WHERE tenant_id = p_tenant_id;

  -- Products
  DELETE FROM products WHERE tenant_id = p_tenant_id;

  -- Product categories (tenant-specific only, not shared)
  DELETE FROM product_categories WHERE tenant_id = p_tenant_id;

  -- Global product suggestions
  DELETE FROM global_product_suggestions WHERE tenant_id = p_tenant_id;

  -- Branches
  DELETE FROM branches WHERE tenant_id = p_tenant_id;

  -- Legacy pharmacy (id = tenant_id from old migration)
  DELETE FROM pharmacies WHERE id = p_tenant_id;

  -- Tenant itself
  DELETE FROM tenants WHERE id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_name', v_tenant_name,
    'branch_count', v_branch_count,
    'user_count', v_user_count,
    'message', 'Tenant dan seluruh data terkait berhasil dihapus permanen.'
  );
END;
$$;

COMMENT ON FUNCTION public.hard_delete_tenant(UUID) IS
  'Permanently delete a tenant and ALL related data. Pre-launch admin tool. SECURITY DEFINER. Only super_admin.';

-- ============================================================================
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.hard_delete_tenant(UUID);
-- ============================================================================

COMMIT;
