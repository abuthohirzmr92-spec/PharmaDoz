-- ============================================================================
-- 035_purchase_payments.sql
-- Granular purchase payment tracking
--
-- Adds purchase_payments table for multi-payment invoice tracking.
-- Each invoice can have multiple payments from different wallets.
--
-- IDEMPOTENT: safe to run multiple times.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS purchase_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    wallet_id       UUID REFERENCES financial_wallets(id) ON DELETE SET NULL,
    amount          DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    payment_method  VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
    wallet_name     VARCHAR(200),
    notes           TEXT,
    paid_by         UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_purchase_payments_invoice
    ON purchase_payments (invoice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_payments_wallet
    ON purchase_payments (wallet_id);

-- RLS: Enable
ALTER TABLE purchase_payments ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT — tenant users see their payments
CREATE POLICY purchase_payments_select ON purchase_payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM purchase_invoices pi
            WHERE pi.id = invoice_id
            AND public.has_tenant_access(pi.tenant_id)
        )
    );

-- RLS: INSERT — tenant users can record payments
CREATE POLICY purchase_payments_insert ON purchase_payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM purchase_invoices pi
            WHERE pi.id = invoice_id
            AND public.has_tenant_access(pi.tenant_id)
        )
    );

-- RLS: No UPDATE or DELETE — payment records are append-only

COMMIT;
