-- ============================================================================
-- 008_tenant_migration.sql
-- Medisync SaaS — Add tenant_id to Existing Tables
-- ============================================================================
-- Migration ini menambahkan tenant_id ke semua tabel operasional yang belum
-- memiliki isolasi tenant, dan mengisi data dari relasi yang ada.
--
-- Pendekatan:
--   1. Tabel dengan pharmacy_id langsung: SET tenant_id = pharmacy_id
--   2. Tabel tanpa pharmacy_id: trace melalui FK ke users atau products
--   3. Tabel referensi/lookup: tambah kolom, biarkan NULL (data lama)
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Tables with direct pharmacy_id
-- These already have pharmacy_id; we add tenant_id and copy the value.
-- The pharmacy_id values match tenants.id because migration 007 inserted
-- tenants with the same UUIDs as pharmacies.
-- ============================================================================

-- 1a. PRODUCTS
ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
COMMENT ON COLUMN products.tenant_id IS 'FK to tenants — which tenant owns this product';

CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products (tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_created ON products (tenant_id, created_at DESC);

UPDATE products SET tenant_id = pharmacy_id WHERE tenant_id IS NULL AND pharmacy_id IS NOT NULL;

-- 1b. TRANSACTIONS
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
COMMENT ON COLUMN transactions.tenant_id IS 'FK to tenants — which tenant this transaction belongs to';

CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id ON transactions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_created ON transactions (tenant_id, created_at DESC);

UPDATE transactions SET tenant_id = pharmacy_id WHERE tenant_id IS NULL AND pharmacy_id IS NOT NULL;

-- 1c. TENANT_QUOTAS
ALTER TABLE tenant_quotas ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
COMMENT ON COLUMN tenant_quotas.tenant_id IS 'FK to tenants — which tenant this quota applies to';

CREATE INDEX IF NOT EXISTS idx_tenant_quotas_tenant_id ON tenant_quotas (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_quotas_tenant_created ON tenant_quotas (tenant_id, created_at DESC);

UPDATE tenant_quotas SET tenant_id = pharmacy_id WHERE tenant_id IS NULL AND pharmacy_id IS NOT NULL;

-- ============================================================================
-- SECTION 2: Tables traceable via users.cabang_id
-- These tables have a FK to users, and users.cabang_id maps to tenants.id.
-- ============================================================================

-- 2a. PURCHASE_INVOICES — trace via created_by → users.cabang_id
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
COMMENT ON COLUMN purchase_invoices.tenant_id IS 'FK to tenants — which tenant this purchase belongs to';

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_tenant_id ON purchase_invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_tenant_created ON purchase_invoices (tenant_id, created_at DESC);

UPDATE purchase_invoices pi
SET tenant_id = u.cabang_id
FROM users u
WHERE u.id = pi.created_by
  AND pi.tenant_id IS NULL;

-- 2b. STOCK_OPNAME — trace via conducted_by → users.cabang_id
ALTER TABLE stock_opname ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
COMMENT ON COLUMN stock_opname.tenant_id IS 'FK to tenants — which tenant this opname belongs to';

CREATE INDEX IF NOT EXISTS idx_stock_opname_tenant_id ON stock_opname (tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_opname_tenant_created ON stock_opname (tenant_id, created_at DESC);

UPDATE stock_opname so
SET tenant_id = u.cabang_id
FROM users u
WHERE u.id = so.conducted_by
  AND so.tenant_id IS NULL;

-- 2c. STORE_EXPANSION_REQUESTS — trace via owner_id → users.cabang_id
ALTER TABLE store_expansion_requests ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
COMMENT ON COLUMN store_expansion_requests.tenant_id IS 'FK to tenants — which tenant this expansion request originates from';

CREATE INDEX IF NOT EXISTS idx_store_expansion_tenant_id ON store_expansion_requests (tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_expansion_tenant_created ON store_expansion_requests (tenant_id, created_at DESC);

UPDATE store_expansion_requests ser
SET tenant_id = u.cabang_id
FROM users u
WHERE u.id = ser.owner_id
  AND ser.tenant_id IS NULL;

-- ============================================================================
-- SECTION 3: Tables traceable via products.pharmacy_id
-- These tables have a FK to products, and products has pharmacy_id.
-- ============================================================================

-- 3a. PRODUCT_BATCHES — trace via product_id → products.pharmacy_id
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
COMMENT ON COLUMN product_batches.tenant_id IS 'FK to tenants — which tenant this batch belongs to';

CREATE INDEX IF NOT EXISTS idx_product_batches_tenant_id ON product_batches (tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_tenant_created ON product_batches (tenant_id, created_at DESC);

UPDATE product_batches pb
SET tenant_id = p.pharmacy_id
FROM products p
WHERE p.id = pb.product_id
  AND pb.tenant_id IS NULL;

-- 3b. STOCK_MOVEMENTS — trace via product_id → products.pharmacy_id
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
COMMENT ON COLUMN stock_movements.tenant_id IS 'FK to tenants — which tenant this stock movement belongs to';

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_id ON stock_movements (tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_created ON stock_movements (tenant_id, created_at DESC);

UPDATE stock_movements sm
SET tenant_id = p.pharmacy_id
FROM products p
WHERE p.id = sm.product_id
  AND sm.tenant_id IS NULL;

-- ============================================================================
-- SECTION 4: Tables traceable via other just-updated tables
-- These depend on tenant_id being populated in the parent table first.
-- ============================================================================

-- 4a. PURCHASE_ITEMS — trace via invoice_id → purchase_invoices.tenant_id
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
COMMENT ON COLUMN purchase_items.tenant_id IS 'FK to tenants — which tenant this purchase item belongs to';

CREATE INDEX IF NOT EXISTS idx_purchase_items_tenant_id ON purchase_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_tenant_created ON purchase_items (tenant_id, created_at DESC);

UPDATE purchase_items pi
SET tenant_id = pinv.tenant_id
FROM purchase_invoices pinv
WHERE pinv.id = pi.invoice_id
  AND pi.tenant_id IS NULL;

-- 4b. STOCK_OPNAME_ITEMS — trace via opname_id → stock_opname.tenant_id
ALTER TABLE stock_opname_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
COMMENT ON COLUMN stock_opname_items.tenant_id IS 'FK to tenants — which tenant this opname item belongs to';

CREATE INDEX IF NOT EXISTS idx_opname_items_tenant_id ON stock_opname_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_opname_items_tenant_created ON stock_opname_items (tenant_id, created_at DESC);

UPDATE stock_opname_items soi
SET tenant_id = so.tenant_id
FROM stock_opname so
WHERE so.id = soi.opname_id
  AND soi.tenant_id IS NULL;

-- ============================================================================
-- SECTION 5: Remaining tables (no reliable trace path)
-- Add column and index; existing rows will have NULL tenant_id.
-- Applications should assign tenant_id during future writes.
-- ============================================================================

-- 5a. PRODUCT_CATEGORIES
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
COMMENT ON COLUMN product_categories.tenant_id IS 'FK to tenants — which tenant owns this category (NULL = shared/system)';

CREATE INDEX IF NOT EXISTS idx_product_categories_tenant_id ON product_categories (tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant_created ON product_categories (tenant_id, created_at DESC);

-- 5b. SUPPLIERS
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
COMMENT ON COLUMN suppliers.tenant_id IS 'FK to tenants — which tenant this supplier belongs to (NULL = legacy)';

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON suppliers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_created ON suppliers (tenant_id, created_at DESC);

-- 5c. SUPPLIER_DEBTS
ALTER TABLE supplier_debts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
COMMENT ON COLUMN supplier_debts.tenant_id IS 'FK to tenants — which tenant this debt belongs to';

CREATE INDEX IF NOT EXISTS idx_supplier_debts_tenant_id ON supplier_debts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_debts_tenant_created ON supplier_debts (tenant_id, created_at DESC);

-- 5d. PRODUCT_UNITS (no created_at column — skip composite index)
ALTER TABLE product_units ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
COMMENT ON COLUMN product_units.tenant_id IS 'FK to tenants — which tenant this unit definition belongs to (NULL = shared)';

CREATE INDEX IF NOT EXISTS idx_product_units_tenant_id ON product_units (tenant_id);

-- 5e. APP_SETTINGS
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
COMMENT ON COLUMN app_settings.tenant_id IS 'FK to tenants — NULL for global settings, set for tenant-specific overrides';

CREATE INDEX IF NOT EXISTS idx_app_settings_tenant_id ON app_settings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_tenant_created ON app_settings (tenant_id, created_at DESC);

-- ============================================================================
-- SECTION 6: Verify migration — check for NULL tenant_ids
-- These DO blocks warn about remaining NULL values but do not prevent
-- the migration from completing. NULL tenant_ids on legacy rows must be
-- resolved by the application or a follow-up data cleanup.
-- ============================================================================

DO $$
DECLARE
    tbl TEXT;
    cnt BIGINT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'products', 'transactions', 'tenant_quotas',
            'purchase_invoices', 'stock_opname', 'store_expansion_requests',
            'product_batches', 'stock_movements',
            'purchase_items', 'stock_opname_items',
            'product_categories', 'suppliers', 'supplier_debts',
            'product_units', 'app_settings'
        ])
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE tenant_id IS NULL', tbl) INTO cnt;
        IF cnt > 0 THEN
            RAISE NOTICE 'Table % has % rows with NULL tenant_id — manual cleanup may be needed', tbl, cnt;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;
