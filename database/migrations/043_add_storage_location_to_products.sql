-- ============================================================================
-- Migration 043 — Products: Default Storage Location
-- ============================================================================
-- Adds default_storage_area_id (FK) and default_storage_slot (VARCHAR) to
-- the products table.
--
-- This is the PRODUCT DEFAULT — a suggestion for where new batches of this
-- product should be placed. Batch-level location overrides take priority.
--
-- ADR-008: Product Default = suggestion.
-- ADR-001: products.rack_location retained as LEGACY.
--
-- Business Rule: when storage_area_id is NULL, storage_slot must also be NULL.
--                when storage_area_id is set, storage_slot is optional.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. Add default_storage_area_id (FK → storage_areas)
-- --------------------------------------------------------------------------
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS default_storage_area_id UUID
REFERENCES public.storage_areas(id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.products.default_storage_area_id IS
'FK to storage_areas — default storage area for new batches of this product (suggestion only)';

-- --------------------------------------------------------------------------
-- 2. Add default_storage_slot (free-text position within area)
-- --------------------------------------------------------------------------
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS default_storage_slot VARCHAR(20);

COMMENT ON COLUMN public.products.default_storage_slot IS
'Default slot position within the storage area, e.g. "A-12", "TEMP-07". Free-text, not a master entity.';

-- --------------------------------------------------------------------------
-- 3. Index for FK lookup
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_default_storage_area_id
ON public.products (default_storage_area_id)
WHERE default_storage_area_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- 4. Validation constraint — slot requires area (idempotent)
-- --------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_products_storage_slot_requires_area'
          AND conrelid = 'public.products'::regclass
    ) THEN
        ALTER TABLE public.products
        ADD CONSTRAINT chk_products_storage_slot_requires_area
        CHECK (
            default_storage_slot IS NULL
            OR default_storage_area_id IS NOT NULL
        );
    END IF;
END $$;

COMMENT ON CONSTRAINT chk_products_storage_slot_requires_area ON public.products IS
'Storage slot cannot be set without a storage area';

-- --------------------------------------------------------------------------
-- 5. Backward compatibility — rack_location is LEGACY, retained
-- --------------------------------------------------------------------------
-- Column products.rack_location (VARCHAR(50)) from migration 041
-- is KEPT — do NOT drop. It serves as legacy fallback in the
-- Storage Location Engine resolution chain (ADR-001).

COMMIT;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- BEGIN;
-- ALTER TABLE public.products DROP CONSTRAINT IF EXISTS chk_products_storage_slot_requires_area;
-- DROP INDEX IF EXISTS idx_products_default_storage_area_id;
-- ALTER TABLE public.products DROP COLUMN IF EXISTS default_storage_slot;
-- ALTER TABLE public.products DROP COLUMN IF EXISTS default_storage_area_id;
-- COMMIT;

-- ============================================================================
-- VALIDATION
-- ============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'products'
--   AND column_name IN ('default_storage_area_id', 'default_storage_slot', 'rack_location');
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'chk_products_storage_slot_requires_area';
