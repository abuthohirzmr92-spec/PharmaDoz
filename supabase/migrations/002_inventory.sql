-- ============================================================================
-- 002_inventory.sql
-- Apotek Manage — Inventory Core Tables
-- ============================================================================
-- Migration ini mencakup:
--   1. Product Batches (batch number, expiry, quantity, FEFO tracking)
--   2. Purchase Invoices (pembelian dari supplier)
--   3. Purchase Items (item per invoice pembelian)
--   4. Stock Movements (audit trail semua perubahan stok)
--   5. Stock Opname (sesi stock take)
--   6. Stock Opname Items (detail per item dalam opname)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PRODUCT BATCHES
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_batches (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id    UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_number  VARCHAR(100) NOT NULL,
    expired_date  DATE NOT NULL,
    quantity      INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit_price    DECIMAL(15,2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);

COMMENT ON TABLE product_batches IS 'Batch produk untuk FEFO tracking — satu produk bisa punya banyak batch';
COMMENT ON COLUMN product_batches.product_id IS 'FK ke tabel products';
COMMENT ON COLUMN product_batches.batch_number IS 'Nomor batch dari pabrik/supplier';
COMMENT ON COLUMN product_batches.expired_date IS 'Tanggal kadaluarsa — digunakan untuk FEFO allocation';
COMMENT ON COLUMN product_batches.quantity IS 'Stok tersisa dalam batch ini';
COMMENT ON COLUMN product_batches.unit_price IS 'Harga beli per unit (HPP)';
COMMENT ON COLUMN product_batches.selling_price IS 'Harga jual per unit';
COMMENT ON COLUMN product_batches.received_at IS 'Tanggal batch diterima';
COMMENT ON COLUMN product_batches.deleted_at IS 'Timestamp soft delete — NULL = aktif';

CREATE INDEX IF NOT EXISTS idx_batches_product_id   ON product_batches (product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expired_date ON product_batches (expired_date);
CREATE INDEX IF NOT EXISTS idx_batches_quantity     ON product_batches (quantity);
CREATE INDEX IF NOT EXISTS idx_batches_deleted_at   ON product_batches (deleted_at);

-- FEFO: urutkan berdasarkan expired_date ASC (yang paling dekat expired = first out)
CREATE INDEX IF NOT EXISTS idx_batches_fefo ON product_batches (product_id, expired_date ASC);

-- ============================================================================
-- 2. PURCHASE INVOICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_invoices (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id    UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    purchase_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date       DATE,
    status         VARCHAR(20) NOT NULL DEFAULT 'unpaid'
                   CHECK (status IN ('paid', 'partial', 'unpaid')),
    total_amount   DECIMAL(15,2) NOT NULL DEFAULT 0,
    paid_amount    DECIMAL(15,2) NOT NULL DEFAULT 0,
    notes          TEXT,
    created_by     UUID REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);

COMMENT ON TABLE purchase_invoices IS 'Invoice pembelian dari supplier';
COMMENT ON COLUMN purchase_invoices.invoice_number IS 'Nomor invoice — unique, bisa dari sistem atau supplier';
COMMENT ON COLUMN purchase_invoices.supplier_id IS 'FK ke suppliers';
COMMENT ON COLUMN purchase_invoices.due_date IS 'Tanggal jatuh tempo pembayaran';
COMMENT ON COLUMN purchase_invoices.status IS 'Status pembayaran: unpaid, partial, paid';
COMMENT ON COLUMN purchase_invoices.total_amount IS 'Total nilai invoice';
COMMENT ON COLUMN purchase_invoices.paid_amount IS 'Jumlah yang sudah dibayar';
COMMENT ON COLUMN purchase_invoices.created_by IS 'User yang membuat invoice';
COMMENT ON COLUMN purchase_invoices.deleted_at IS 'Timestamp soft delete';

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier_id ON purchase_invoices (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status     ON purchase_invoices (status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_due_date   ON purchase_invoices (due_date);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date       ON purchase_invoices (purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_deleted_at ON purchase_invoices (deleted_at);

-- ============================================================================
-- 3. PURCHASE ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id     UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    product_id     UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_number   VARCHAR(100) NOT NULL,
    expired_date   DATE NOT NULL,
    quantity       INTEGER NOT NULL CHECK (quantity > 0),
    unit_price     DECIMAL(15,2) NOT NULL,
    selling_price  DECIMAL(15,2) NOT NULL,
    subtotal       DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE purchase_items IS 'Detail item dalam invoice pembelian';
COMMENT ON COLUMN purchase_items.invoice_id IS 'FK ke purchase_invoices';
COMMENT ON COLUMN purchase_items.product_id IS 'FK ke products';
COMMENT ON COLUMN purchase_items.batch_number IS 'Nomor batch untuk item yang dibeli';
COMMENT ON COLUMN purchase_items.expired_date IS 'Tanggal kadaluarsa batch ini';
COMMENT ON COLUMN purchase_items.quantity IS 'Jumlah unit yang dibeli';
COMMENT ON COLUMN purchase_items.unit_price IS 'Harga beli per unit';
COMMENT ON COLUMN purchase_items.selling_price IS 'Harga jual yang ditetapkan';
COMMENT ON COLUMN purchase_items.subtotal IS 'Kalkulasi otomatis: quantity * unit_price';

CREATE INDEX IF NOT EXISTS idx_purchase_items_invoice_id ON purchase_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON purchase_items (product_id);

-- ============================================================================
-- 4. STOCK MOVEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_movements (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    movement_type    VARCHAR(20) NOT NULL
                     CHECK (movement_type IN ('purchase','sale','refund','expired','opname','adjustment')),
    product_id       UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_id         UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    qty_before       INTEGER NOT NULL,
    qty_change       INTEGER NOT NULL,
    qty_after        INTEGER NOT NULL,
    reference_number VARCHAR(100),
    note             TEXT,
    user_id          UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stock_movements IS 'Audit trail semua perubahan stok — wajib tercatat setiap perubahan';
COMMENT ON COLUMN stock_movements.movement_type IS 'Jenis pergerakan: purchase, sale, refund, expired, opname, adjustment';
COMMENT ON COLUMN stock_movements.product_id IS 'FK ke products';
COMMENT ON COLUMN stock_movements.batch_id IS 'FK ke product_batches — nullable untuk pergerakan tanpa batch';
COMMENT ON COLUMN stock_movements.qty_before IS 'Kuantitas sebelum perubahan';
COMMENT ON COLUMN stock_movements.qty_change IS 'Perubahan kuantitas (positif = tambah, negatif = kurang)';
COMMENT ON COLUMN stock_movements.qty_after IS 'Kuantitas setelah perubahan (qty_before + qty_change)';
COMMENT ON COLUMN stock_movements.reference_number IS 'Nomor referensi (invoice, nota, opname ID)';
COMMENT ON COLUMN stock_movements.user_id IS 'User yang melakukan perubahan';

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch_id   ON stock_movements (batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type       ON stock_movements (movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_timestamp  ON stock_movements (timestamp DESC);

-- ============================================================================
-- 5. STOCK OPNAME
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_opname (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opname_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    status        VARCHAR(20) NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'confirmed', 'adjusted')),
    conducted_by  UUID REFERENCES users(id),
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stock_opname IS 'Sesi stock opname / stock take';
COMMENT ON COLUMN stock_opname.opname_date IS 'Tanggal pelaksanaan opname';
COMMENT ON COLUMN stock_opname.status IS 'Status: draft (input), confirmed (disetujui), adjusted (sudah disesuaikan)';
COMMENT ON COLUMN stock_opname.conducted_by IS 'User yang melakukan opname';

CREATE INDEX IF NOT EXISTS idx_stock_opname_date   ON stock_opname (opname_date);
CREATE INDEX IF NOT EXISTS idx_stock_opname_status ON stock_opname (status);

-- ============================================================================
-- 6. STOCK OPNAME ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_opname_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opname_id      UUID NOT NULL REFERENCES stock_opname(id) ON DELETE CASCADE,
    product_id     UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_id       UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    system_qty     INTEGER NOT NULL DEFAULT 0,
    physical_qty   INTEGER NOT NULL DEFAULT 0,
    difference     INTEGER GENERATED ALWAYS AS (physical_qty - system_qty) STORED,
    note           TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stock_opname_items IS 'Detail item per produk dalam sesi opname';
COMMENT ON COLUMN stock_opname_items.system_qty IS 'Stok menurut sistem (sebelum adjustment)';
COMMENT ON COLUMN stock_opname_items.physical_qty IS 'Stok hasil hitung fisik';
COMMENT ON COLUMN stock_opname_items.difference IS 'Selisih: physical_qty - system_qty (auto-calculated)';

CREATE INDEX IF NOT EXISTS idx_opname_items_opname_id  ON stock_opname_items (opname_id);
CREATE INDEX IF NOT EXISTS idx_opname_items_product_id ON stock_opname_items (product_id);
CREATE INDEX IF NOT EXISTS idx_opname_items_batch_id   ON stock_opname_items (batch_id);

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;
