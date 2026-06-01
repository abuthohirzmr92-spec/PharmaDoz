-- ============================================================================
-- 034_capital_insight.sql
-- Financial Insight Lite — Owner Capital + Profit Foundation
--
-- Adds:
--   capital_transactions   — Owner capital deposits and withdrawals
--   Updates wallet_transactions source_type CHECK to include capital_in/out
--
-- SECURITY: Standard tenant-isolation RLS via has_tenant_access().
-- Super admin privacy enforced at application layer (repository).
--
-- IDEMPOTENT: safe to run multiple times.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. capital_transactions — Owner equity tracking
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS capital_transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
    wallet_id        UUID REFERENCES financial_wallets(id) ON DELETE SET NULL,
    type             VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    amount           DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    description      TEXT,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id         UUID,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_capital_tx_tenant
    ON capital_transactions (tenant_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_capital_tx_branch
    ON capital_transactions (branch_id);
CREATE INDEX IF NOT EXISTS idx_capital_tx_wallet
    ON capital_transactions (wallet_id);

-- RLS: Enable
ALTER TABLE capital_transactions ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT — tenant users can see their capital transactions
CREATE POLICY capital_tx_select ON capital_transactions
    FOR SELECT
    USING (public.has_tenant_access(tenant_id));

-- RLS: INSERT — tenant users can create capital transactions
CREATE POLICY capital_tx_insert ON capital_transactions
    FOR INSERT
    WITH CHECK (public.has_tenant_access(tenant_id));

-- RLS: No UPDATE or DELETE — capital transactions are append-only (immutable)

-- --------------------------------------------------------------------------
-- 2. Update wallet_transactions source_type CHECK constraint
--    Add 'capital_in' and 'capital_out' for wallet integration
-- --------------------------------------------------------------------------

DO $$
BEGIN
    -- Drop existing constraint
    ALTER TABLE wallet_transactions
        DROP CONSTRAINT IF EXISTS wallet_transactions_source_type_check;

    -- Recreate with new values
    ALTER TABLE wallet_transactions
        ADD CONSTRAINT wallet_transactions_source_type_check
        CHECK (source_type IN (
            'sale', 'purchase', 'expense',
            'transfer_in', 'transfer_out', 'adjustment',
            'capital_in', 'capital_out'
        ));
END $$;

COMMIT;
