-- ============================================================================
-- 036_sale_batch_allocations.sql
-- FEFO Batch Allocation Tracking for HPP calculation
--
-- Records which batches were used for each sale transaction item.
-- purchase_price is SNAPSHOTTED at time of sale — if batch price
-- changes later, historical profit remains unchanged.
--
-- IDEMPOTENT: safe to run multiple times.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS sale_batch_allocations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id             UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    transaction_item_id UUID NOT NULL REFERENCES transaction_items(id) ON DELETE CASCADE,
    batch_id            UUID NOT NULL REFERENCES product_batches(id) ON DELETE RESTRICT,
    product_id          UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity            INTEGER NOT NULL CHECK (quantity > 0),
    cost_price          DECIMAL(15,2) NOT NULL,
    subtotal_cost       DECIMAL(15,2) NOT NULL,
    tenant_id           UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sale_batch_allocations IS 'FEFO batch allocation snapshot — records which batches were consumed per sale';
COMMENT ON COLUMN sale_batch_allocations.cost_price IS 'Snapshot of product_batches.unit_price at time of sale';
COMMENT ON COLUMN sale_batch_allocations.subtotal_cost IS 'quantity × cost_price';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sba_sale ON sale_batch_allocations (sale_id);
CREATE INDEX IF NOT EXISTS idx_sba_batch ON sale_batch_allocations (batch_id);
CREATE INDEX IF NOT EXISTS idx_sba_product ON sale_batch_allocations (product_id);
CREATE INDEX IF NOT EXISTS idx_sba_tenant ON sale_batch_allocations (tenant_id);

-- RLS
ALTER TABLE sale_batch_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY sba_select ON sale_batch_allocations
    FOR SELECT USING (
        tenant_id IS NOT NULL AND public.has_tenant_access(tenant_id)
    );

CREATE POLICY sba_insert ON sale_batch_allocations
    FOR INSERT WITH CHECK (
        tenant_id IS NOT NULL AND public.has_tenant_access(tenant_id)
    );

-- No UPDATE or DELETE — allocations are immutable (audit trail)

COMMIT;
