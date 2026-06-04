-- ============================================================================
-- 037_sales_returns.sql
-- Sales Return Engine — Retur Penjualan
--
-- 3 tables:
--   sales_returns          — Return header
--   sales_return_items     — Returned items
--   sales_return_allocations — Reverse FEFO allocations
--
-- Rules:
--   - Original transactions are NEVER modified
--   - Stock returns to the EXACT batch it was drawn from (reverse-FEFO)
--   - Allocation doesn't exceed original allocation (guarded by app layer)
--   - refund_method reuses existing payment_method CHECK
--
-- IDEMPOTENT: safe to run multiple times.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. sales_returns — Return header
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_returns (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    original_transaction_id     UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
    reference_number            VARCHAR(50) UNIQUE NOT NULL,
    return_date                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason                      TEXT,
    refund_method               VARCHAR(20) NOT NULL CHECK (refund_method IN ('cash','debit','credit','qris','transfer')),
    refund_wallet_id            UUID REFERENCES financial_wallets(id) ON DELETE SET NULL,
    refund_amount               DECIMAL(15,2) NOT NULL DEFAULT 0,
    status                      VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','refunded')),
    conducted_by                VARCHAR(200),
    notes                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_returns_original ON sales_returns (original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_tenant ON sales_returns (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_returns_ref ON sales_returns (reference_number);

ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY sr_select ON sales_returns FOR SELECT USING (public.has_tenant_access(tenant_id));
CREATE POLICY sr_insert ON sales_returns FOR INSERT WITH CHECK (public.has_tenant_access(tenant_id));
CREATE POLICY sr_update ON sales_returns FOR UPDATE USING (public.has_tenant_access(tenant_id)) WITH CHECK (public.has_tenant_access(tenant_id));

-- --------------------------------------------------------------------------
-- 2. sales_return_items — Returned items
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_return_items (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id                       UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
    original_transaction_item_id    UUID NOT NULL REFERENCES transaction_items(id) ON DELETE RESTRICT,
    quantity                        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price                      DECIMAL(15,2) NOT NULL,
    subtotal                        DECIMAL(15,2) NOT NULL,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sri_return ON sales_return_items (return_id);
CREATE INDEX IF NOT EXISTS idx_sri_item ON sales_return_items (original_transaction_item_id);

ALTER TABLE sales_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY sri_select ON sales_return_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM sales_returns sr WHERE sr.id = return_id AND public.has_tenant_access(sr.tenant_id)));
CREATE POLICY sri_insert ON sales_return_items FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM sales_returns sr WHERE sr.id = return_id AND public.has_tenant_access(sr.tenant_id)));

-- --------------------------------------------------------------------------
-- 3. sales_return_allocations — Reverse FEFO allocations
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_return_allocations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id               UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
    sale_allocation_id      UUID NOT NULL REFERENCES sale_batch_allocations(id) ON DELETE RESTRICT,
    batch_id                UUID NOT NULL REFERENCES product_batches(id) ON DELETE RESTRICT,
    quantity                INTEGER NOT NULL CHECK (quantity > 0),
    cost_price              DECIMAL(15,2) NOT NULL,
    subtotal_cost           DECIMAL(15,2) NOT NULL,
    tenant_id               UUID,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sra_return ON sales_return_allocations (return_id);
CREATE INDEX IF NOT EXISTS idx_sra_allocation ON sales_return_allocations (sale_allocation_id);
CREATE INDEX IF NOT EXISTS idx_sra_batch ON sales_return_allocations (batch_id);
CREATE INDEX IF NOT EXISTS idx_sra_tenant ON sales_return_allocations (tenant_id);

ALTER TABLE sales_return_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY sra_select ON sales_return_allocations FOR SELECT USING (public.has_tenant_access(tenant_id));
CREATE POLICY sra_insert ON sales_return_allocations FOR INSERT WITH CHECK (public.has_tenant_access(tenant_id));

-- No UPDATE/DELETE — return allocations are append-only

COMMIT;
