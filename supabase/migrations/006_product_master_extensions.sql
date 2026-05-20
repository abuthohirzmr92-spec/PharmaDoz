-- Add unit, pricing, and pharmacy_id columns to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS unit                 VARCHAR(20) DEFAULT 'pcs',
  ADD COLUMN IF NOT EXISTS default_price        DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_selling_price DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pharmacy_id          UUID REFERENCES pharmacies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_products_pharmacy ON products (pharmacy_id);

-- Satuan lookup (read-only reference data)
CREATE TABLE IF NOT EXISTS product_units (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL
);

-- Seed common pharmacy units
INSERT INTO product_units (code, name) VALUES
    ('tablet', 'Tablet'), ('botol', 'Botol'), ('strip', 'Strip'),
    ('sachet', 'Sachet'), ('tube', 'Tube'), ('pcs', 'Pcs'),
    ('kapsul', 'Kapsul'), ('vial', 'Vial'), ('ampul', 'Ampul'),
    ('supp', 'Suppositoria')
ON CONFLICT (code) DO NOTHING;
