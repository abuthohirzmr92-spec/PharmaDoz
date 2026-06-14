-- ============================================================================
-- 039_backfill_wallet_branch.sql
-- Apotek Manage — Assign NULL branch wallets to main branch
-- ============================================================================
-- Migration ini meng-assign financial_wallets yang masih memiliki branch_id
-- NULL ke main branch tenant. Wallet yang dibuat sebelum multi-branch
-- selesai tidak memiliki branch assignment.
--
-- IDEMPOTENT: safe to run multiple times.
-- ============================================================================

BEGIN;

-- Assign tenant-level wallets to main branch
UPDATE financial_wallets
SET branch_id = (
  SELECT id FROM branches
  WHERE tenant_id = financial_wallets.tenant_id
    AND is_main = true
  LIMIT 1
)
WHERE branch_id IS NULL
  AND deleted_at IS NULL;

-- Verify
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM financial_wallets
  WHERE branch_id IS NULL AND deleted_at IS NULL;

  IF null_count > 0 THEN
    RAISE NOTICE 'Warning: % wallets still have NULL branch_id. Manual review needed.', null_count;
  ELSE
    RAISE NOTICE 'All wallets now have branch assignment.';
  END IF;
END $$;

COMMIT;

-- ROLLBACK (run manually if needed):
-- UPDATE financial_wallets SET branch_id = NULL WHERE branch_id IS NOT NULL;
