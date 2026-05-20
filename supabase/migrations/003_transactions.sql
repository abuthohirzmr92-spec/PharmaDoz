-- ============================================================================
-- 003_transactions.sql
-- Apotek Manage — Transaction & Payment Tables
-- ============================================================================
-- Migration ini mencakup:
--   1. Transactions (data penjualan selesai)
--   2. Transaction Items (line item per transaksi)
--   3. Transaction Payments (metode pembayaran)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id) ON DELETE RESTRICT,
    invoice_number  VARCHAR(50) NOT NULL UNIQUE,
    cashier_name    VARCHAR(100) NOT NULL,
    subtotal        DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount        DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax             DECIMAL(15,2) NOT NULL DEFAULT 0,
    total           DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

COMMENT ON TABLE transactions IS 'Data penjualan selesai — satu baris per transaksi kasir';
COMMENT ON COLUMN transactions.pharmacy_id IS 'Cabang tempat transaksi terjadi (multi-tenant)';
COMMENT ON COLUMN transactions.invoice_number IS 'Nomor invoice unik untuk transaksi';
COMMENT ON COLUMN transactions.cashier_name IS 'Nama kasir yang memproses transaksi';
COMMENT ON COLUMN transactions.subtotal IS 'Jumlah harga sebelum diskon dan pajak';
COMMENT ON COLUMN transactions.discount IS 'Nilai diskon (dalam nominal, bukan persen)';
COMMENT ON COLUMN transactions.tax IS 'PPN 11% dari total setelah diskon';
COMMENT ON COLUMN transactions.total IS 'Jumlah akhir: subtotal - discount + tax';
COMMENT ON COLUMN transactions.deleted_at IS 'Timestamp soft delete; NULL = aktif';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_pharmacy_date
    ON transactions (pharmacy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice
    ON transactions (invoice_number);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at
    ON transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at
    ON transactions (deleted_at);

-- ============================================================================
-- 2. TRANSACTION ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name    VARCHAR(150) NOT NULL,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price      DECIMAL(15,2) NOT NULL,
    subtotal        DECIMAL(15,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE transaction_items IS 'Line item dalam transaksi — setiap produk yang dibeli';
COMMENT ON COLUMN transaction_items.transaction_id IS 'FK ke transactions (CASCADE hapus jika transaksi dihapus)';
COMMENT ON COLUMN transaction_items.product_id IS 'FK ke products — produk yang dibeli';
COMMENT ON COLUMN transaction_items.product_name IS 'Snapshot nama produk saat transaksi (perubahan master tidak mempengaruhi histori)';
COMMENT ON COLUMN transaction_items.quantity IS 'Jumlah unit yang dibeli (harus > 0)';
COMMENT ON COLUMN transaction_items.unit_price IS 'Harga satuan saat transaksi';
COMMENT ON COLUMN transaction_items.subtotal IS 'quantity * unit_price';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction
    ON transaction_items (transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_product
    ON transaction_items (product_id);

-- ============================================================================
-- 3. TRANSACTION PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    amount          DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    method          VARCHAR(20) NOT NULL
                    CHECK (method IN ('cash','debit','credit','qris','transfer')),
    ref             VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE transaction_payments IS 'Metode pembayaran yang digunakan — satu transaksi bisa memiliki banyak bayaran (split payment)';
COMMENT ON COLUMN transaction_payments.transaction_id IS 'FK ke transactions (CASCADE hapus)';
COMMENT ON COLUMN transaction_payments.amount IS 'Jumlah yang dibayar dengan metode ini (harus > 0)';
COMMENT ON COLUMN transaction_payments.method IS 'Metode: cash, debit, credit, qris, transfer';
COMMENT ON COLUMN transaction_payments.ref IS 'Nomor referensi (contoh: nomor kartu, ID transfer, kode QR)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transaction_payments_transaction
    ON transaction_payments (transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_payments_method
    ON transaction_payments (method);

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;
