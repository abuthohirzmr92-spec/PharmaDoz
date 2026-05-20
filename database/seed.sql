-- ============================================================================
-- seed.sql
-- Apotek Manage — Demo / Development Seed Data
--
-- Run after migrations to populate realistic demo data.
-- All INSERTs use ON CONFLICT for idempotency — safe to run multiple times.
--
-- Usage:
--   psql -U postgres -d apotek_manage -f database/seed.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. SYSTEM ROLES (3 additional beyond migration seeds)
-- Migration already inserts: owner, admin, apoteker, kasir
-- ============================================================================

INSERT INTO roles (name, description) VALUES
    ('super_admin', 'Super administrator — akses sistem penuh, termasuk manajemen sistem dan audit'),
    ('developer',   'Developer — akses penuh untuk pengembangan dan debugging aplikasi'),
    ('support',     'Support — akses view-only untuk debugging dan dukungan teknis')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. PHARMACIES
-- ============================================================================

INSERT INTO pharmacies (id, name, code, address, phone, email, is_active, opening_time, closing_time)
VALUES (
    'f0000000-0000-0000-0000-000000000001',
    'Apotek Sehat',
    'AS-001',
    'Jl. Kesehatan No. 10, Jakarta Pusat',
    '021-98765432',
    'info@apoteksehat.co.id',
    true,
    '08:00'::TIME,
    '22:00'::TIME
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. ROLE PERMISSIONS for new roles
-- (existing role_permissions from migration are left untouched)
-- ============================================================================

-- super_admin: ALL 19 permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- developer: ALL 19 permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'developer'
ON CONFLICT DO NOTHING;

-- support: view-only permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'support'
  AND p.key IN (
      'inventory.stock.view',
      'products.view',
      'suppliers.view',
      'purchases.view',
      'reports.sales.view',
      'reports.inventory.view',
      'users.view',
      'settings.view',
      'expired.view',
      'logs.view'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. PRODUCT CATEGORIES (matching the app's demo categories)
-- ============================================================================

INSERT INTO product_categories (id, name, description) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Obat Bebas',  'Obat yang dapat dibeli tanpa resep dokter'),
    ('a0000000-0000-0000-0000-000000000002', 'Antibiotik',  'Obat antibiotik yang memerlukan resep dokter'),
    ('a0000000-0000-0000-0000-000000000003', 'Vitamin',     'Vitamin dan suplemen untuk menjaga kesehatan'),
    ('a0000000-0000-0000-0000-000000000004', 'Obat Keras',  'Obat yang hanya dapat diperoleh dengan resep dokter'),
    ('a0000000-0000-0000-0000-000000000005', 'Lainnya',     'Kategori lainnya termasuk minyak dan produk tradisional'),
    ('a0000000-0000-0000-0000-000000000006', 'Alkes',       'Alat kesehatan seperti masker, termometer, dll')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. PRODUCTS (10 demo products)
-- ============================================================================

INSERT INTO products (id, category_id, name, barcode, description, requires_prescription, min_stock, is_active) VALUES
    ('b0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000001',
     'Paracetamol 500mg', NULL,
     'Obat penurun panas dan pereda nyeri ringan', false, 10, true),
    ('b0000000-0000-0000-0000-000000000002',
     'a0000000-0000-0000-0000-000000000002',
     'Amoxicillin 500mg', NULL,
     'Antibiotik spektrum luas untuk infeksi bakteri', true, 10, true),
    ('b0000000-0000-0000-0000-000000000003',
     'a0000000-0000-0000-0000-000000000003',
     'Vitamin C 1000mg', NULL,
     'Suplemen vitamin C dosis tinggi untuk imunitas', false, 10, true),
    ('b0000000-0000-0000-0000-000000000004',
     'a0000000-0000-0000-0000-000000000001',
     'Antasida Tablet', NULL,
     'Obat untuk mengatasi gangguan lambung dan maag', false, 10, true),
    ('b0000000-0000-0000-0000-000000000005',
     'a0000000-0000-0000-0000-000000000001',
     'Ibuprofen 400mg', NULL,
     'Obat antiinflamasi nonsteroid untuk nyeri dan peradangan', false, 10, true),
    ('b0000000-0000-0000-0000-000000000006',
     'a0000000-0000-0000-0000-000000000001',
     'Cetirizine 10mg', NULL,
     'Antihistamin untuk mengatasi alergi', false, 10, true),
    ('b0000000-0000-0000-0000-000000000007',
     'a0000000-0000-0000-0000-000000000004',
     'Omeprazole 20mg', NULL,
     'Obat untuk mengatasi asam lambung dan GERD', true, 10, true),
    ('b0000000-0000-0000-0000-000000000008',
     'a0000000-0000-0000-0000-000000000004',
     'Salbutamol Inhaler', NULL,
     'Obat bronkodilator untuk asma dan PPOK', true, 10, true),
    ('b0000000-0000-0000-0000-000000000009',
     'a0000000-0000-0000-0000-000000000003',
     'Multivitamin Tablet', NULL,
     'Suplemen multivitamin dan mineral lengkap', false, 10, true),
    ('b0000000-0000-0000-0000-000000000010',
     'a0000000-0000-0000-0000-000000000005',
     'Minyak Kayu Putih', NULL,
     'Minyak tradisional untuk menghangatkan dan meredakan masuk angin', false, 10, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. SUPPLIERS (3 demo suppliers)
-- ============================================================================

INSERT INTO suppliers (id, name, contact_person, phone, email, address, is_active) VALUES
    ('d0000000-0000-0000-0000-000000000001',
     'PT. Bina Medika Sejahtera', 'Hendra Kusuma',
     '021-5551234', 'hendra@binamedika.co.id',
     'Jl. Industri No. 45, Jakarta Utara', true),
    ('d0000000-0000-0000-0000-000000000002',
     'PT. Farma Global Mandiri', 'Rina Agustina',
     '021-5555678', 'rina@farmaglobal.co.id',
     'Jl. Raya Bogor Km 28, Jakarta Timur', true),
    ('d0000000-0000-0000-0000-000000000003',
     'CV. Herbal Nusantara', 'Budi Santoso',
     '0271-5559012', 'budi@herbalnusantara.co.id',
     'Jl. Slamet Riyadi No. 88, Solo', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. PRODUCT BATCHES (26 batches matching DEMO_BATCHES)
-- ============================================================================

INSERT INTO product_batches (id, product_id, batch_number, expired_date, quantity, unit_price, selling_price, received_at) VALUES
    -- Paracetamol 500mg (demo-001)
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'PAR-2025-001', '2025-08-31', 0,   7500,  15000, '2025-06-15T08:00:00Z'),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'PAR-2026-001', '2027-12-31', 60,  8000,  15000, '2026-01-20T09:30:00Z'),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'PAR-2026-002', '2026-06-30', 40,  7800,  15000, '2026-05-10T10:00:00Z'),
    -- Amoxicillin 500mg (demo-002)
    ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'AMX-2025-001', '2027-03-15', 15,  14000, 25000, '2025-09-10T08:00:00Z'),
    ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'AMX-2026-001', '2027-06-30', 30,  15000, 25000, '2026-05-05T11:00:00Z'),
    ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'AMX-2026-002', '2026-03-31', 5,   14500, 25000, '2025-10-01T07:30:00Z'),
    -- Vitamin C 1000mg (demo-003)
    ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003', 'VTC-2026-001', '2027-09-30', 50,  20000, 35000, '2026-02-14T09:00:00Z'),
    ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000003', 'VTC-2026-002', '2027-12-15', 25,  21000, 35000, '2026-04-28T13:00:00Z'),
    -- Antasida Tablet (demo-004)
    ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000004', 'ANT-2025-001', '2025-11-30', 0,   5500,  12000, '2025-05-20T08:00:00Z'),
    ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000004', 'ANT-2026-001', '2026-08-31', 35,  6000,  12000, '2026-01-10T09:00:00Z'),
    ('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000004', 'ANT-2026-002', '2027-05-31', 25,  6500,  12000, '2026-05-10T10:15:00Z'),
    -- Ibuprofen 400mg (demo-005)
    ('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000005', 'IBU-2026-001', '2027-03-31', 45,  10000, 18000, '2026-04-15T08:30:00Z'),
    ('c0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000005', 'IBU-2026-002', '2027-09-30', 35,  10500, 18000, '2026-05-10T10:30:00Z'),
    -- Cetirizine 10mg (demo-006)
    ('c0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000006', 'CET-2025-001', '2026-07-15', 30,  11000, 22000, '2025-11-20T08:00:00Z'),
    ('c0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000006', 'CET-2026-001', '2027-11-30', 60,  12000, 22000, '2026-02-28T09:00:00Z'),
    -- Omeprazole 20mg (demo-007)
    ('c0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000007', 'OME-2025-001', '2026-04-30', 3,   15500, 28000, '2025-08-15T08:00:00Z'),
    ('c0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000007', 'OME-2026-001', '2027-01-31', 25,  16000, 28000, '2026-03-20T10:00:00Z'),
    ('c0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000007', 'OME-2026-002', '2027-08-31', 17,  17000, 28000, '2026-05-05T11:30:00Z'),
    -- Salbutamol Inhaler (demo-008)
    ('c0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000008', 'SAL-2025-001', '2026-02-28', 2,   34000, 55000, '2025-07-10T08:00:00Z'),
    ('c0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000008', 'SAL-2026-001', '2026-07-31', 15,  35000, 55000, '2026-03-20T10:00:00Z'),
    ('c0000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000008', 'SAL-2026-002', '2027-04-30', 13,  36000, 55000, '2026-05-05T11:00:00Z'),
    -- Multivitamin Tablet (demo-009)
    ('c0000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000009', 'MLT-2026-001', '2027-08-31', 40,  25000, 42000, '2026-01-15T09:00:00Z'),
    ('c0000000-0000-0000-0000-000000000023', 'b0000000-0000-0000-0000-000000000009', 'MLT-2026-002', '2027-05-15', 25,  24000, 42000, '2026-04-28T13:30:00Z'),
    -- Minyak Kayu Putih (demo-010)
    ('c0000000-0000-0000-0000-000000000024', 'b0000000-0000-0000-0000-000000000010', 'MKP-2025-001', '2025-12-31', 0,   10000, 20000, '2025-03-20T08:00:00Z'),
    ('c0000000-0000-0000-0000-000000000025', 'b0000000-0000-0000-0000-000000000010', 'MKP-2026-001', '2028-06-30', 25,  11000, 20000, '2026-01-08T09:00:00Z'),
    ('c0000000-0000-0000-0000-000000000026', 'b0000000-0000-0000-0000-000000000010', 'MKP-2026-002', '2028-01-31', 15,  10500, 20000, '2026-04-28T14:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. DEMO USER (Budi Santoso — owner role)
-- ============================================================================

INSERT INTO users (id, email, display_name, role_id, cabang_id, phone, is_active)
SELECT
    'f0000000-0000-0000-0000-000000000002',
    'budi@apoteksehat.co.id',
    'Budi Santoso',
    r.id,
    'f0000000-0000-0000-0000-000000000001',
    '081234567890',
    true
FROM roles r
WHERE r.name = 'owner'
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 9. PURCHASE INVOICES (5 invoices matching DEMO_PURCHASE_INVOICES)
-- For each invoice, total_amount = sum(quantity * unit_price) of its items.
-- ============================================================================

-- INV-2026-001: PT. Bina Medika Sejahtera, unpaid
INSERT INTO purchase_invoices (id, invoice_number, supplier_id, purchase_date, due_date, status, total_amount, paid_amount, notes, created_by)
VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'INV-2026-001',
    'd0000000-0000-0000-0000-000000000001',
    '2026-05-10',
    '2026-06-10',
    'unpaid',
    1005000,
    0,
    'Pembelian rutin bulan Mei — stok parasetamol, antasida, ibuprofen',
    'f0000000-0000-0000-0000-000000000002'
)
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO purchase_items (invoice_id, product_id, batch_number, expired_date, quantity, unit_price, selling_price) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'PAR-2026-002', '2026-06-30', 50,  7800,  15000),
    ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'ANT-2026-002', '2027-05-31', 30,  6500,  12000),
    ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'IBU-2026-002', '2027-09-30', 40,  10500, 18000);

-- INV-2026-002: PT. Farma Global Mandiri, partial (paid 700,000)
INSERT INTO purchase_invoices (id, invoice_number, supplier_id, purchase_date, due_date, status, total_amount, paid_amount, notes, created_by)
VALUES (
    'e0000000-0000-0000-0000-000000000002',
    'INV-2026-002',
    'd0000000-0000-0000-0000-000000000002',
    '2026-05-05',
    '2026-06-05',
    'partial',
    1480000,
    700000,
    'Pembelian antibiotik dan obat keras — pembayaran sebagian',
    'f0000000-0000-0000-0000-000000000002'
)
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO purchase_items (invoice_id, product_id, batch_number, expired_date, quantity, unit_price, selling_price) VALUES
    ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'AMX-2026-001', '2027-06-30', 40,  15000, 25000),
    ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000007', 'OME-2026-002', '2027-08-31', 20,  17000, 28000),
    ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000008', 'SAL-2026-002', '2027-04-30', 15,  36000, 55000);

-- INV-2026-003: CV. Herbal Nusantara, paid
INSERT INTO purchase_invoices (id, invoice_number, supplier_id, purchase_date, due_date, status, total_amount, paid_amount, notes, created_by)
VALUES (
    'e0000000-0000-0000-0000-000000000003',
    'INV-2026-003',
    'd0000000-0000-0000-0000-000000000003',
    '2026-04-28',
    '2026-05-28',
    'paid',
    1560000,
    1560000,
    'Pembelian vitamin dan produk herbal — sudah lunas',
    'f0000000-0000-0000-0000-000000000002'
)
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO purchase_items (invoice_id, product_id, batch_number, expired_date, quantity, unit_price, selling_price) VALUES
    ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'VTC-2026-002', '2027-12-15', 30,  21000, 35000),
    ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000009', 'MLT-2026-002', '2027-05-15', 30,  24000, 42000),
    ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000010', 'MKP-2026-002', '2028-01-31', 20,  10500, 20000);

-- INV-2026-004: PT. Bina Medika Sejahtera, paid
INSERT INTO purchase_invoices (id, invoice_number, supplier_id, purchase_date, due_date, status, total_amount, paid_amount, notes, created_by)
VALUES (
    'e0000000-0000-0000-0000-000000000004',
    'INV-2026-004',
    'd0000000-0000-0000-0000-000000000001',
    '2026-04-15',
    '2026-05-15',
    'paid',
    885000,
    885000,
    'Pembelian cetirizine dan ibuprofen — sudah lunas',
    'f0000000-0000-0000-0000-000000000002'
)
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO purchase_items (invoice_id, product_id, batch_number, expired_date, quantity, unit_price, selling_price) VALUES
    ('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000006', 'CET-2025-001', '2026-07-15', 35,  11000, 22000),
    ('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000005', 'IBU-2026-001', '2027-03-31', 50,  10000, 18000);

-- INV-2026-005: PT. Farma Global Mandiri, unpaid
INSERT INTO purchase_invoices (id, invoice_number, supplier_id, purchase_date, due_date, status, total_amount, paid_amount, notes, created_by)
VALUES (
    'e0000000-0000-0000-0000-000000000005',
    'INV-2026-005',
    'd0000000-0000-0000-0000-000000000002',
    '2026-03-20',
    '2026-04-20',
    'unpaid',
    1180000,
    0,
    'Pembelian omeprazole dan salbutamol — belum dibayar',
    'f0000000-0000-0000-0000-000000000002'
)
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO purchase_items (invoice_id, product_id, batch_number, expired_date, quantity, unit_price, selling_price) VALUES
    ('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000007', 'OME-2026-001', '2027-01-31', 30,  16000, 28000),
    ('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000008', 'SAL-2026-001', '2026-07-31', 20,  35000, 55000);

-- ============================================================================
-- 10. APP SETTINGS — demo overrides
-- ============================================================================

INSERT INTO app_settings (key, value, description) VALUES
    ('demo_mode', 'true', 'Menandakan aplikasi sedang berjalan dalam mode demo')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;
