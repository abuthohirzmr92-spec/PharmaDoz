-- ============================================================================
-- 038_add_inventory_branch_fk.sql
-- Apotek Manage — Add branch ownership to inventory tables
-- ============================================================================
-- Migration ini menambahkan kolom pharmacy_id ke tabel-tabel inventory
-- yang belum memiliki identitas cabang, untuk mendukung multi-branch.
--
-- STRATEGI:
--   - Kolom ditambahkan sebagai NULLABLE (tidak merusak data existing)
--   - Foreign key ke branches(id)
--   - Index untuk performa query
--   - TIDAK melakukan backfill (data lama tetap NULL)
--   - Zero downtime (hanya ADD COLUMN + CREATE INDEX)
--   - Rollback: DROP COLUMN pada setiap tabel
--
-- TABLES:
--   1. product_batches    — stok per batch per cabang
--   2. purchase_invoices  — pembelian per cabang
--   3. stock_movements    — mutasi stok per cabang
--   4. stock_opname       — sesi stock opname per cabang
--   5. activity_logs      — audit log (NULLABLE: NULL = tenant event)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PRODUCT_BATCHES — stok fisik per cabang
-- ============================================================================

ALTER TABLE product_batches
  ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES branches(id) ON DELETE SET NULL;

COMMENT ON COLUMN product_batches.pharmacy_id IS
  'FK to branches — which branch this batch physically belongs to. NULL = legacy/pre-migration data.';

CREATE INDEX IF NOT EXISTS idx_product_batches_pharmacy
  ON product_batches (pharmacy_id)
  WHERE pharmacy_id IS NOT NULL;

-- ============================================================================
-- 2. PURCHASE_INVOICES — pembelian per cabang
-- ============================================================================

ALTER TABLE purchase_invoices
  ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES branches(id) ON DELETE SET NULL;

COMMENT ON COLUMN purchase_invoices.pharmacy_id IS
  'FK to branches — which branch made this purchase. NULL = legacy/pre-migration data.';

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_pharmacy
  ON purchase_invoices (pharmacy_id)
  WHERE pharmacy_id IS NOT NULL;

-- ============================================================================
-- 3. STOCK_MOVEMENTS — mutasi stok per cabang
-- ============================================================================

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES branches(id) ON DELETE SET NULL;

COMMENT ON COLUMN stock_movements.pharmacy_id IS
  'FK to branches — which branch this stock movement occurred at. NULL = legacy/pre-migration data.';

CREATE INDEX IF NOT EXISTS idx_stock_movements_pharmacy
  ON stock_movements (pharmacy_id)
  WHERE pharmacy_id IS NOT NULL;

-- ============================================================================
-- 4. STOCK_OPNAME — sesi stock opname per cabang
-- ============================================================================

ALTER TABLE stock_opname
  ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES branches(id) ON DELETE SET NULL;

COMMENT ON COLUMN stock_opname.pharmacy_id IS
  'FK to branches — which branch this stock opname was conducted at. NULL = legacy/pre-migration data.';

CREATE INDEX IF NOT EXISTS idx_stock_opname_pharmacy
  ON stock_opname (pharmacy_id)
  WHERE pharmacy_id IS NOT NULL;

-- ============================================================================
-- 5. ACTIVITY_LOGS — audit log (hybrid: tenant events = NULL, branch events = filled)
-- ============================================================================

ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES branches(id) ON DELETE SET NULL;

COMMENT ON COLUMN activity_logs.pharmacy_id IS
  'FK to branches — which branch this event relates to. NULL = tenant-level event (provisioning, settings, user management) or legacy data.';

CREATE INDEX IF NOT EXISTS idx_activity_logs_pharmacy
  ON activity_logs (pharmacy_id)
  WHERE pharmacy_id IS NOT NULL;

-- ============================================================================
-- VERIFICATION (informational only — does not block migration)
-- ============================================================================

DO $$
DECLARE
    tbl TEXT;
    cnt BIGINT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'product_batches',
            'purchase_invoices',
            'stock_movements',
            'stock_opname',
            'activity_logs'
        ])
    LOOP
        EXECUTE format(
            'SELECT COUNT(*) FROM %I WHERE pharmacy_id IS NOT NULL', tbl
        ) INTO cnt;
        RAISE NOTICE 'Table %: % rows with pharmacy_id populated', tbl, cnt;
    END LOOP;
END $$;

-- ============================================================================
-- ROLLBACK (run manually if needed):
--   ALTER TABLE product_batches   DROP COLUMN IF EXISTS pharmacy_id;
--   ALTER TABLE purchase_invoices DROP COLUMN IF EXISTS pharmacy_id;
--   ALTER TABLE stock_movements   DROP COLUMN IF EXISTS pharmacy_id;
--   ALTER TABLE stock_opname      DROP COLUMN IF EXISTS pharmacy_id;
--   ALTER TABLE activity_logs     DROP COLUMN IF EXISTS pharmacy_id;
-- ============================================================================

COMMIT;
