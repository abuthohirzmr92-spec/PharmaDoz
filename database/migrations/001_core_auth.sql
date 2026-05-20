-- ============================================================================
-- 001_core_auth.sql
-- Apotek Manage — Core & Auth Database Schema
-- ============================================================================
-- Migration ini mencakup:
--   1. Roles (role pengguna)
--   2. Permissions (izin akses granular)
--   3. role_permissions (pemetaan role ↔ permission)
--   4. Pharmacies (data cabang apotek)
--   5. Users (pengguna terintegrasi Supabase Auth)
--   6. Product Categories (kategori produk/obat)
--   7. Products (master produk/obat)
--   8. Suppliers (pemasok)
--   9. Supplier Debts (hutang pemasok)
--  10. App Settings (pengaturan aplikasi key-value)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. ROLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'Role pengguna dalam sistem — owner, admin, apoteker, kasir';
COMMENT ON COLUMN roles.name IS 'Nama role (unique): owner, admin, apoteker, kasir';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles (name);

-- Seed data
INSERT INTO roles (name, description) VALUES
    ('owner',    'Pemilik aplikasi — akses penuh ke semua fitur'),
    ('admin',    'Administrator — akses hampir penuh, kecuali pengaturan sistem'),
    ('apoteker', 'Apoteker — manajemen stok, obat, dan transaksi'),
    ('kasir',    'Kasir — transaksi penjualan dan laporan dasar')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. PERMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    module      VARCHAR(50),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE permissions IS 'Izin akses granular untuk setiap fitur dalam sistem';
COMMENT ON COLUMN permissions.key IS 'Kunci unik permission (contoh: inventory.stock.view)';
COMMENT ON COLUMN permissions.module IS 'Modul terkait — inventory, cashier, products, dll';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions (module);

-- Seed data
INSERT INTO permissions (key, description, module) VALUES
    ('inventory.stock.view',       'Melihat stok inventaris',              'inventory'),
    ('inventory.stock.edit',       'Mengubah data stok inventaris',        'inventory'),
    ('cashier.transaction.create', 'Membuat transaksi kasir',              'cashier'),
    ('cashier.transaction.void',   'Membatalkan transaksi kasir',          'cashier'),
    ('products.view',              'Melihat daftar produk/obat',           'products'),
    ('products.edit',              'Menambah/mengubah data produk',        'products'),
    ('suppliers.view',             'Melihat daftar pemasok',               'suppliers'),
    ('suppliers.edit',             'Menambah/mengubah data pemasok',       'suppliers'),
    ('purchases.create',           'Membuat pembelian dari pemasok',       'purchases'),
    ('purchases.view',             'Melihat riwayat pembelian',            'purchases'),
    ('reports.sales.view',         'Melihat laporan penjualan',            'reports'),
    ('reports.inventory.view',     'Melihat laporan inventaris',           'reports'),
    ('users.view',                 'Melihat daftar pengguna',              'users'),
    ('users.edit',                 'Menambah/mengubah data pengguna',      'users'),
    ('settings.view',              'Melihat pengaturan aplikasi',          'settings'),
    ('settings.edit',              'Mengubah pengaturan aplikasi',         'settings'),
    ('expired.view',               'Melihat daftar obat kadaluarsa',       'expired'),
    ('expired.edit',               'Mengelola data obat kadaluarsa',       'expired'),
    ('logs.view',                  'Melihat log aktivitas sistem',         'logs')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 3. ROLE_PERMISSIONS (Junction Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE (role_id, permission_id)
);

COMMENT ON TABLE role_permissions IS 'Pemetaan banyak-ke-banyak antara role dan permission';
COMMENT ON COLUMN role_permissions.role_id IS 'Referensi ke tabel roles';
COMMENT ON COLUMN role_permissions.permission_id IS 'Referensi ke tabel permissions';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id       ON role_permissions (role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions (permission_id);

-- Seed data: owner — semua permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner'
ON CONFLICT DO NOTHING;

-- Seed data: admin — semua kecuali settings.edit
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
  AND p.key != 'settings.edit'
ON CONFLICT DO NOTHING;

-- Seed data: apoteker — stok, kasir (terbatas), produk, supplier, pembelian, laporan, expired, log
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'apoteker'
  AND p.key IN (
      'inventory.stock.view',
      'inventory.stock.edit',
      'cashier.transaction.create',
      'products.view',
      'products.edit',
      'suppliers.view',
      'suppliers.edit',
      'purchases.create',
      'purchases.view',
      'reports.sales.view',
      'reports.inventory.view',
      'expired.view',
      'expired.edit',
      'logs.view'
  )
ON CONFLICT DO NOTHING;

-- Seed data: kasir — transaksi kasir, lihat produk, laporan penjualan
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'kasir'
  AND p.key IN (
      'cashier.transaction.create',
      'products.view',
      'reports.sales.view'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. PHARMACIES (Cabang)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pharmacies (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(200) NOT NULL,
    code         VARCHAR(20) UNIQUE NOT NULL,
    address      TEXT,
    phone        VARCHAR(30),
    email        VARCHAR(100),
    is_active    BOOLEAN DEFAULT true,
    opening_time TIME,
    closing_time TIME,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ
);

COMMENT ON TABLE pharmacies IS 'Data cabang apotek — mendukung multi-cabang';
COMMENT ON COLUMN pharmacies.name IS 'Nama cabang apotek';
COMMENT ON COLUMN pharmacies.code IS 'Kode unik cabang (contoh: AU-001)';
COMMENT ON COLUMN pharmacies.is_active IS 'Status aktif cabang';
COMMENT ON COLUMN pharmacies.opening_time IS 'Jam buka cabang';
COMMENT ON COLUMN pharmacies.closing_time IS 'Jam tutup cabang';
COMMENT ON COLUMN pharmacies.deleted_at IS 'Timestamp soft delete; NULL = aktif';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacies_code      ON pharmacies (code);
CREATE INDEX IF NOT EXISTS idx_pharmacies_is_active  ON pharmacies (is_active);
CREATE INDEX IF NOT EXISTS idx_pharmacies_deleted_at ON pharmacies (deleted_at);

-- Seed data: satu cabang default
INSERT INTO pharmacies (name, code, address, phone, email, opening_time, closing_time)
VALUES (
    'Apotek Utama',
    'AU-001',
    'Jl. Contoh No. 123, Kota Contoh',
    '021-12345678',
    'apotek.utama@example.com',
    '08:00'::TIME,
    '22:00'::TIME
)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 5. USERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_uid  UUID UNIQUE,
    email         VARCHAR(255) UNIQUE NOT NULL,
    display_name  VARCHAR(200) NOT NULL,
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    cabang_id     UUID REFERENCES pharmacies(id) ON DELETE RESTRICT,
    phone         VARCHAR(30),
    avatar_url    TEXT,
    is_active     BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);

COMMENT ON TABLE users IS 'Data pengguna sistem — terintegrasi dengan Supabase Auth';
COMMENT ON COLUMN users.supabase_uid IS 'UID dari Supabase auth.users';
COMMENT ON COLUMN users.display_name IS 'Nama tampilan pengguna';
COMMENT ON COLUMN users.role_id IS 'Role pengguna (FK ke roles)';
COMMENT ON COLUMN users.cabang_id IS 'Cabang tempat pengguna bertugas; NULL untuk owner/superadmin';
COMMENT ON COLUMN users.is_active IS 'Status aktif pengguna';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp terakhir login';
COMMENT ON COLUMN users.deleted_at IS 'Timestamp soft delete; NULL = aktif';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid  ON users (supabase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email         ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role_id       ON users (role_id);
CREATE INDEX IF NOT EXISTS idx_users_cabang_id     ON users (cabang_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active     ON users (is_active);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at    ON users (deleted_at);

-- ============================================================================
-- 6. PRODUCT CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id   UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

COMMENT ON TABLE product_categories IS 'Kategori produk/obat — mendukung subkategori (parent_id)';
COMMENT ON COLUMN product_categories.name IS 'Nama kategori';
COMMENT ON COLUMN product_categories.parent_id IS 'Kategori induk untuk subkategori; NULL = kategori utama';
COMMENT ON COLUMN product_categories.is_active IS 'Status aktif kategori';
COMMENT ON COLUMN product_categories.deleted_at IS 'Timestamp soft delete; NULL = aktif';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id  ON product_categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_is_active  ON product_categories (is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_deleted_at ON product_categories (deleted_at);

-- Seed data: kategori utama (parent_id = NULL)
INSERT INTO product_categories (name, description) VALUES
    ('Obat Bebas',          'Obat yang dapat dibeli tanpa resep dokter, seperti parasetamol dan vitamin'),
    ('Obat Bebas Terbatas', 'Obat yang dapat dibeli tanpa resep namun dengan peringatan khusus (OBC/OTC)'),
    ('Obat Keras',          'Obat yang hanya dapat diperoleh dengan resep dokter (psikotropika/narkotika)'),
    ('Alat Kesehatan',      'Alat kesehatan seperti termometer, tensimeter, masker, dan perlengkapan medis'),
    ('Kosmetik',            'Produk kosmetik dan perawatan diri seperti sabun, lotion, dan sampo'),
    ('Suplemen',            'Suplemen makanan, vitamin, dan mineral untuk menjaga kesehatan')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. PRODUCTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id           UUID NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
    name                  VARCHAR(255) NOT NULL,
    barcode               VARCHAR(100) UNIQUE,
    description           TEXT,
    image_url             TEXT,
    requires_prescription BOOLEAN DEFAULT false,
    min_stock             INTEGER DEFAULT 0,
    is_active             BOOLEAN DEFAULT true,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at            TIMESTAMPTZ
);

COMMENT ON TABLE products IS 'Master data produk/obat dalam sistem';
COMMENT ON COLUMN products.category_id IS 'Kategori produk (FK ke product_categories)';
COMMENT ON COLUMN products.barcode IS 'Kode barcode produk (unik, nullable untuk pengaturan awal)';
COMMENT ON COLUMN products.image_url IS 'URL gambar produk untuk tampilan di aplikasi';
COMMENT ON COLUMN products.requires_prescription IS 'Apakah produk memerlukan resep dokter';
COMMENT ON COLUMN products.min_stock IS 'Stok minimum untuk notifikasi reorder';
COMMENT ON COLUMN products.is_active IS 'Status aktif produk';
COMMENT ON COLUMN products.deleted_at IS 'Timestamp soft delete; NULL = aktif';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id           ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode               ON products (barcode);
CREATE INDEX IF NOT EXISTS idx_products_is_active             ON products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_requires_prescription ON products (requires_prescription);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at            ON products (deleted_at);

-- ============================================================================
-- 8. SUPPLIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(200) NOT NULL,
    contact_person VARCHAR(200),
    phone          VARCHAR(30),
    email          VARCHAR(100),
    address        TEXT,
    is_active      BOOLEAN DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);

COMMENT ON TABLE suppliers IS 'Data pemasok produk/obat';
COMMENT ON COLUMN suppliers.contact_person IS 'Nama kontak person di pihak pemasok';
COMMENT ON COLUMN suppliers.is_active IS 'Status aktif pemasok';
COMMENT ON COLUMN suppliers.deleted_at IS 'Timestamp soft delete; NULL = aktif';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active  ON suppliers (is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_deleted_at ON suppliers (deleted_at);

-- ============================================================================
-- 9. SUPPLIER DEBTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_debts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id    UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100),
    amount         DECIMAL(15,2) NOT NULL,
    paid_amount    DECIMAL(15,2) DEFAULT 0,
    status         VARCHAR(20) DEFAULT 'unpaid',
    due_date       DATE,
    paid_at        TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);

COMMENT ON TABLE supplier_debts IS 'Catatan hutang kepada pemasok';
COMMENT ON COLUMN supplier_debts.supplier_id IS 'Pemasok terkait';
COMMENT ON COLUMN supplier_debts.invoice_number IS 'Nomor invoice pembelian';
COMMENT ON COLUMN supplier_debts.amount IS 'Total jumlah hutang';
COMMENT ON COLUMN supplier_debts.paid_amount IS 'Jumlah yang sudah dibayar';
COMMENT ON COLUMN supplier_debts.status IS 'Status hutang: unpaid, partial, paid';
COMMENT ON COLUMN supplier_debts.due_date IS 'Tanggal jatuh tempo pembayaran';
COMMENT ON COLUMN supplier_debts.paid_at IS 'Timestamp saat hutang dilunasi';
COMMENT ON COLUMN supplier_debts.deleted_at IS 'Timestamp soft delete; NULL = aktif';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_debts_supplier_id  ON supplier_debts (supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_debts_status       ON supplier_debts (status);
CREATE INDEX IF NOT EXISTS idx_supplier_debts_due_date     ON supplier_debts (due_date);
CREATE INDEX IF NOT EXISTS idx_supplier_debts_deleted_at   ON supplier_debts (deleted_at);

-- ============================================================================
-- 10. APP SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         VARCHAR(100) UNIQUE NOT NULL,
    value       TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE app_settings IS 'Pengaturan aplikasi key-value';
COMMENT ON COLUMN app_settings.key IS 'Kunci pengaturan (unique)';
COMMENT ON COLUMN app_settings.value IS 'Nilai pengaturan dalam bentuk teks';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings (key);

-- Seed data: pengaturan dasar
INSERT INTO app_settings (key, value, description) VALUES
    ('app_name',    'Apotek Manage', 'Nama aplikasi'),
    ('app_version', '0.1.0',         'Versi aplikasi saat ini'),
    ('currency',    'IDR',           'Mata uang default untuk transaksi')
ON CONFLICT (key) DO NOTHING;

-- default_cabang_id: referensi ke cabang pertama yang dibuat
INSERT INTO app_settings (key, value, description)
SELECT 'default_cabang_id', id::TEXT, 'ID cabang default untuk aplikasi'
FROM pharmacies
WHERE code = 'AU-001'
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;
