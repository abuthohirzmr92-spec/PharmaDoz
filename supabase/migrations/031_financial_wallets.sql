-- ============================================================================
-- 031_financial_wallets.sql
-- Enterprise Financial Wallet & Cashflow System
--
-- Core tables for the premium/enterprise wallet module:
--   financial_wallets    — Wallet definitions (cash, bank, digital)
--   wallet_transactions  — All money in/out with running balance
--   wallet_transfers     — Transfers between wallets
--   wallet_categories    — Income/expense categories
--   wallet_audit_logs    — Wallet-specific audit trail
--
-- SECURITY: Standard tenant-isolation RLS via has_tenant_access().
-- wallet_transactions and wallet_transfers use subquery RLS through
-- financial_wallets since they don't have a direct tenant_id column.
--
-- Super admin privacy: Enforced at application layer (repository).
-- See Agent F requirements — super admin cannot see balances/transactions.
--
-- IDEMPOTENT: safe to run multiple times.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. financial_wallets — Wallet definitions per tenant
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financial_wallets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'bank', 'digital')),
    branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'IDR',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    is_archived     BOOLEAN NOT NULL DEFAULT false,
    allow_overdraft BOOLEAN NOT NULL DEFAULT false,
    overdraft_limit DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (overdraft_limit >= 0),
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    -- One wallet name per tenant (case-insensitive uniqueness handled at app layer)
    CONSTRAINT uq_financial_wallets_tenant_name UNIQUE (tenant_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_financial_wallets_tenant
    ON financial_wallets (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_financial_wallets_branch
    ON financial_wallets (branch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_financial_wallets_type
    ON financial_wallets (tenant_id, type) WHERE deleted_at IS NULL;

-- RLS: Enable
ALTER TABLE financial_wallets ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT — tenant users can see their wallets
CREATE POLICY financial_wallets_select ON financial_wallets
    FOR SELECT
    USING (public.has_tenant_access(tenant_id));

-- RLS: INSERT — tenant users can create wallets
CREATE POLICY financial_wallets_insert ON financial_wallets
    FOR INSERT
    WITH CHECK (public.has_tenant_access(tenant_id));

-- RLS: UPDATE — tenant users can update their wallets
CREATE POLICY financial_wallets_update ON financial_wallets
    FOR UPDATE
    USING (public.has_tenant_access(tenant_id))
    WITH CHECK (public.has_tenant_access(tenant_id));

-- RLS: DELETE — only super_admin can hard-delete
CREATE POLICY financial_wallets_delete ON financial_wallets
    FOR DELETE
    USING (public.is_super_admin());

-- updated_at trigger
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_financial_wallets'
    ) THEN
        CREATE TRIGGER set_updated_at_financial_wallets
            BEFORE UPDATE ON financial_wallets
            FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 2. wallet_transactions — All money movements
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id        UUID NOT NULL REFERENCES financial_wallets(id) ON DELETE RESTRICT,
    type             VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    amount           DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    running_balance  DECIMAL(15,2) NOT NULL,
    source_type      VARCHAR(20) NOT NULL CHECK (source_type IN ('sale', 'purchase', 'expense', 'transfer_in', 'transfer_out', 'adjustment')),
    source_id        UUID,
    description      TEXT,
    branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    account_code     VARCHAR(50),
    is_reconciled    BOOLEAN NOT NULL DEFAULT false,
    reconciled_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_date
    ON wallet_transactions (wallet_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_source
    ON wallet_transactions (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_branch
    ON wallet_transactions (branch_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_date
    ON wallet_transactions (transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_account_code
    ON wallet_transactions (account_code) WHERE account_code IS NOT NULL;

-- RLS: Enable
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT — only users with access to the parent wallet's tenant
CREATE POLICY wallet_transactions_select ON wallet_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM financial_wallets fw
            WHERE fw.id = wallet_id
            AND public.has_tenant_access(fw.tenant_id)
        )
    );

-- RLS: INSERT — only users with access to the parent wallet's tenant
CREATE POLICY wallet_transactions_insert ON wallet_transactions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM financial_wallets fw
            WHERE fw.id = wallet_id
            AND public.has_tenant_access(fw.tenant_id)
        )
    );

-- RLS: No UPDATE or DELETE — wallet transactions are immutable (append-only)

-- --------------------------------------------------------------------------
-- 3. wallet_transfers — Inter-wallet transfers
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallet_transfers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_wallet_id  UUID NOT NULL REFERENCES financial_wallets(id) ON DELETE RESTRICT,
    to_wallet_id    UUID NOT NULL REFERENCES financial_wallets(id) ON DELETE RESTRICT,
    amount          DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    fee             DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    notes           TEXT,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Cannot transfer to the same wallet
    CONSTRAINT ck_wallet_transfers_different CHECK (from_wallet_id != to_wallet_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_from
    ON wallet_transfers (from_wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_to
    ON wallet_transfers (to_wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_status
    ON wallet_transfers (status);

-- RLS: Enable
ALTER TABLE wallet_transfers ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT — users with access to EITHER wallet's tenant
CREATE POLICY wallet_transfers_select ON wallet_transfers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM financial_wallets fw
            WHERE fw.id = from_wallet_id
            AND public.has_tenant_access(fw.tenant_id)
        )
    );

-- RLS: INSERT — users with access to the from_wallet's tenant
CREATE POLICY wallet_transfers_insert ON wallet_transfers
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM financial_wallets fw
            WHERE fw.id = from_wallet_id
            AND public.has_tenant_access(fw.tenant_id)
        )
    );

-- RLS: UPDATE — users with access to the from_wallet's tenant (for complete/reject)
CREATE POLICY wallet_transfers_update ON wallet_transfers
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM financial_wallets fw
            WHERE fw.id = from_wallet_id
            AND public.has_tenant_access(fw.tenant_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM financial_wallets fw
            WHERE fw.id = from_wallet_id
            AND public.has_tenant_access(fw.tenant_id)
        )
    );

-- RLS: DELETE — only super_admin
CREATE POLICY wallet_transfers_delete ON wallet_transfers
    FOR DELETE
    USING (public.is_super_admin());

-- updated_at trigger
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_wallet_transfers'
    ) THEN
        CREATE TRIGGER set_updated_at_wallet_transfers
            BEFORE UPDATE ON wallet_transfers
            FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 4. wallet_categories — Income/expense categories
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallet_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    type        VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    icon        VARCHAR(50),
    color       VARCHAR(7),
    is_system   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One category name per tenant (NULL tenant_id = system-level shared)
    CONSTRAINT uq_wallet_categories_tenant_name UNIQUE (tenant_id, name)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_wallet_categories_tenant
    ON wallet_categories (tenant_id);
CREATE INDEX IF NOT EXISTS idx_wallet_categories_type
    ON wallet_categories (tenant_id, type);

-- RLS: Enable
ALTER TABLE wallet_categories ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT — tenant users see their categories AND system categories
CREATE POLICY wallet_categories_select ON wallet_categories
    FOR SELECT
    USING (
        tenant_id IS NULL
        OR public.has_tenant_access(tenant_id)
    );

-- RLS: INSERT — only for own tenant
CREATE POLICY wallet_categories_insert ON wallet_categories
    FOR INSERT
    WITH CHECK (
        tenant_id IS NOT NULL
        AND public.has_tenant_access(tenant_id)
    );

-- RLS: UPDATE — only own tenant's non-system categories
CREATE POLICY wallet_categories_update ON wallet_categories
    FOR UPDATE
    USING (
        tenant_id IS NOT NULL
        AND public.has_tenant_access(tenant_id)
        AND is_system = false
    )
    WITH CHECK (
        tenant_id IS NOT NULL
        AND public.has_tenant_access(tenant_id)
        AND is_system = false
    );

-- RLS: DELETE — only own tenant's non-system categories, or super_admin
CREATE POLICY wallet_categories_delete ON wallet_categories
    FOR DELETE
    USING (
        (tenant_id IS NOT NULL AND public.has_tenant_access(tenant_id) AND is_system = false)
        OR public.is_super_admin()
    );

-- Seed default system categories (tenant_id = NULL, visible to all tenants)
INSERT INTO wallet_categories (tenant_id, name, type, is_system, icon, color) VALUES
    -- Income categories
    (NULL, 'Penjualan Tunai',        'income', true, 'Banknote', '#16a34a'),
    (NULL, 'Penjualan Non-Tunai',    'income', true, 'CreditCard', '#2563eb'),
    (NULL, 'Pendapatan Lain',        'income', true, 'PlusCircle', '#7c3aed'),
    (NULL, 'Transfer Masuk',         'income', true, 'ArrowDownCircle', '#0891b2'),
    -- Expense categories
    (NULL, 'Pembelian Stok',         'expense', true, 'Package', '#dc2626'),
    (NULL, 'Gaji Karyawan',          'expense', true, 'Users', '#ea580c'),
    (NULL, 'Operasional',            'expense', true, 'Wrench', '#eab308'),
    (NULL, 'Utang Supplier',         'expense', true, 'Landmark', '#be123c'),
    (NULL, 'Transfer Keluar',        'expense', true, 'ArrowUpCircle', '#4f46e5'),
    (NULL, 'Lainnya',                'expense', true, 'Ellipsis', '#6b7280')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- --------------------------------------------------------------------------
-- 5. wallet_audit_logs — Wallet-specific audit trail
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallet_audit_logs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID REFERENCES tenants(id) ON DELETE CASCADE,
    wallet_id        UUID NOT NULL REFERENCES financial_wallets(id) ON DELETE CASCADE,
    action           VARCHAR(50) NOT NULL,
    actor_id         UUID NOT NULL,
    previous_balance DECIMAL(15,2),
    new_balance      DECIMAL(15,2),
    metadata         JSONB DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_audit_wallet
    ON wallet_audit_logs (wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_audit_tenant
    ON wallet_audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_audit_action
    ON wallet_audit_logs (action);

-- RLS: Enable
ALTER TABLE wallet_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT — tenant users can see their audit logs
CREATE POLICY wallet_audit_logs_select ON wallet_audit_logs
    FOR SELECT
    USING (public.has_tenant_access(tenant_id));

-- RLS: INSERT — any authenticated user (trusted via repository)
CREATE POLICY wallet_audit_logs_insert ON wallet_audit_logs
    FOR INSERT
    WITH CHECK (public.has_tenant_access(tenant_id));

-- RLS: No UPDATE or DELETE — audit logs are append-only

COMMIT;
