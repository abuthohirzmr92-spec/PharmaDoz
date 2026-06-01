-- ============================================================================
-- 032_wallet_integration.sql
-- Add wallet_id foreign keys to existing financial tables
--
-- This links:
--   transaction_payments  → financial_wallets (where sale money goes)
--   purchase_invoices     → financial_wallets (where purchase money comes from)
--
-- IDEMPOTENT: safe to run multiple times (uses IF NOT EXISTS checks).
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. transaction_payments: wallet destination for POS sales
-- --------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transaction_payments'
        AND column_name = 'wallet_id'
    ) THEN
        ALTER TABLE transaction_payments
            ADD COLUMN wallet_id UUID REFERENCES financial_wallets(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_txn_payments_wallet
    ON transaction_payments (wallet_id);

-- --------------------------------------------------------------------------
-- 2. purchase_invoices: wallet source for supplier payments
-- --------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_invoices'
        AND column_name = 'wallet_id'
    ) THEN
        ALTER TABLE purchase_invoices
            ADD COLUMN wallet_id UUID REFERENCES financial_wallets(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_wallet
    ON purchase_invoices (wallet_id);

COMMIT;
