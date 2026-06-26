-- ============================================================================
-- Migration 044 — Product Batches: Actual Storage Location
-- ============================================================================
-- Adds storage_area_id (FK), storage_slot (VARCHAR), and is_relocated (BOOLEAN)
-- to the product_batches table.
--
-- This is the BATCH REALITY — the actual physical location of this batch.
-- Takes priority over product.default_storage_area_id in the resolution chain.
--
-- ADR-008: Batch = reality.
-- ADR-010: Product Default is inheritance for NEW batches only.
--          Changes to product default do NOT affect existing batches.
--
-- Resolution Chain (READ):
--   batch.storage_area_id → product.default_storage_area_id → rack_location → NULL
--
-- Assignment Chain (WRITE — batch creation):
--   product.default → purchase (copy) → batch.storage_area_id + is_relocated
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. Add storage_area_id (FK → storage_areas)
-- --------------------------------------------------------------------------
ALTER TABLE public.product_batches
ADD COLUMN IF NOT EXISTS storage_area_id UUID
REFERENCES public.storage_areas(id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.product_batches.storage_area_id IS
'FK to storage_areas — actual physical location of this batch (reality)';

-- --------------------------------------------------------------------------
-- 2. Add storage_slot (free-text position within area)
-- --------------------------------------------------------------------------
ALTER TABLE public.product_batches
ADD COLUMN IF NOT EXISTS storage_slot VARCHAR(20);

COMMENT ON COLUMN public.product_batches.storage_slot IS
'Slot position within the storage area, e.g. "A-12", "TEMP-07". Free-text.';

-- --------------------------------------------------------------------------
-- 3. Add is_relocated flag
-- --------------------------------------------------------------------------
ALTER TABLE public.product_batches
ADD COLUMN IF NOT EXISTS is_relocated BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.product_batches.is_relocated IS
'True when this batch was explicitly moved from the product default location';

-- --------------------------------------------------------------------------
-- 4. Indexes
-- --------------------------------------------------------------------------

-- FK lookup — find all batches in a specific area
CREATE INDEX IF NOT EXISTS idx_batches_storage_area_id
ON public.product_batches (storage_area_id)
WHERE storage_area_id IS NOT NULL;

-- Filter relocated batches
CREATE INDEX IF NOT EXISTS idx_batches_is_relocated
ON public.product_batches (tenant_id, is_relocated)
WHERE is_relocated = true;

-- --------------------------------------------------------------------------
-- 5. Validation constraint — slot requires area (idempotent)
-- --------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_batches_storage_slot_requires_area'
          AND conrelid = 'public.product_batches'::regclass
    ) THEN
        ALTER TABLE public.product_batches
        ADD CONSTRAINT chk_batches_storage_slot_requires_area
        CHECK (
            storage_slot IS NULL
            OR storage_area_id IS NOT NULL
        );
    END IF;
END $$;

COMMENT ON CONSTRAINT chk_batches_storage_slot_requires_area ON public.product_batches IS
'Storage slot cannot be set without a storage area';

-- --------------------------------------------------------------------------
-- 6. Backward compatibility
-- --------------------------------------------------------------------------
-- All new columns are NULLABLE or have safe defaults.
-- Existing batches will have:
--   storage_area_id = NULL   (no location)
--   storage_slot = NULL      (no slot)
--   is_relocated = false     (not relocated)
--
-- The Storage Location Engine falls back to product.default → rack_location → NULL
-- for batches without an explicit location.

COMMIT;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- BEGIN;
-- ALTER TABLE public.product_batches DROP CONSTRAINT IF EXISTS chk_batches_storage_slot_requires_area;
-- DROP INDEX IF EXISTS idx_batches_is_relocated;
-- DROP INDEX IF EXISTS idx_batches_storage_area_id;
-- ALTER TABLE public.product_batches DROP COLUMN IF EXISTS is_relocated;
-- ALTER TABLE public.product_batches DROP COLUMN IF EXISTS storage_slot;
-- ALTER TABLE public.product_batches DROP COLUMN IF EXISTS storage_area_id;
-- COMMIT;

-- ============================================================================
-- VALIDATION
-- ============================================================================
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'product_batches'
--   AND column_name IN ('storage_area_id', 'storage_slot', 'is_relocated');
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'chk_batches_storage_slot_requires_area';
