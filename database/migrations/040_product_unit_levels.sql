-- ============================================================================
-- V2 PHASE 1A — Multi Unit Foundation (Tiered Model)
-- ============================================================================
-- Model satuan bertingkat ala Vmedis.
-- Setiap produk memiliki 1 satuan dasar (products.unit) + opsional 2 level
-- tambahan. Setiap level menyimpan contains = jumlah satuan level di bawahnya.
--
-- Contoh:
--   Level 1 (base): Tablet   (implicit, dari products.unit)
--   Level 2:        Strip    contains = 10  → 1 Strip = 10 Tablet
--   Level 3:        Dus      contains = 20  → 1 Dus   = 20 Strip = 200 Tablet
--
-- Level 1 TIDAK disimpan di tabel ini — ia adalah products.unit.
-- Hanya level > 1 yang disimpan.
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_unit_levels (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL
                REFERENCES products(id) ON DELETE CASCADE,
    level       INTEGER NOT NULL
                CHECK (level > 1),
    unit_name   VARCHAR(50) NOT NULL,
    contains    INTEGER NOT NULL
                CHECK (contains > 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Satu produk tidak boleh punya dua satuan dengan nama sama
    UNIQUE (product_id, unit_name)
);

-- Index untuk lookup per produk (dipakai saat fetch bersama products)
CREATE INDEX IF NOT EXISTS idx_product_unit_levels_product
    ON product_unit_levels (product_id);

COMMENT ON TABLE product_unit_levels IS
'Multi Unit System — satuan bertingkat per produk.
Level 1 = base unit (products.unit, implicit contains=1).
Level 2 = first additional unit (e.g. Strip isi 10 Tablet).
Level 3 = second additional unit (e.g. Dus isi 20 Strip).
Konversi recursive: multiplier = contains × multiplier level di bawahnya.';
