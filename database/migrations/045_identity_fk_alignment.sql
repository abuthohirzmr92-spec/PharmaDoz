-- ============================================================================
-- Migration 045 — Identity FK Alignment
-- ============================================================================
-- ADR-015: Migrate all legacy FKs from users(id) → profiles(id).
--
-- Background:
--   Migration 007 established profiles as canonical identity table
--   ("replaces users table over time"). profiles.id = auth.users.id.
--   Tables created before 007 (stock_opname, stock_movements, purchase_invoices)
--   still reference users(id) — a legacy table with 0 rows.
--
-- Strategy:
--   Step 1: Drop legacy FK constraints
--   Step 2: Add new FK constraints → profiles(id)
--   Step 3: Validate (FKs created, no data loss)
--
-- Safety:
--   - stock_opname has 0 rows → no data validation needed
--   - stock_movements.user_id is NULLABLE → no constraint violation risk
--   - purchase_invoices.created_by is NULLABLE → no constraint violation risk
--   - All columns are NULLABLE — ON DELETE SET NULL is appropriate
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Drop legacy FK constraints
-- ============================================================================

-- 1a. stock_opname.conducted_by → users(id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'stock_opname_conducted_by_fkey'
          AND table_name = 'stock_opname'
    ) THEN
        ALTER TABLE public.stock_opname
        DROP CONSTRAINT stock_opname_conducted_by_fkey;
    END IF;
END $$;

-- 1b. stock_movements.user_id → users(id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'stock_movements_user_id_fkey'
          AND table_name = 'stock_movements'
    ) THEN
        ALTER TABLE public.stock_movements
        DROP CONSTRAINT stock_movements_user_id_fkey;
    END IF;
END $$;

-- 1c. purchase_invoices.created_by → users(id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'purchase_invoices_created_by_fkey'
          AND table_name = 'purchase_invoices'
    ) THEN
        ALTER TABLE public.purchase_invoices
        DROP CONSTRAINT purchase_invoices_created_by_fkey;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Add new FK constraints → profiles(id)
-- ============================================================================

-- 2a. stock_opname.conducted_by → profiles(id)
ALTER TABLE public.stock_opname
ADD CONSTRAINT stock_opname_conducted_by_fkey
FOREIGN KEY (conducted_by) REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- 2b. stock_movements.user_id → profiles(id)
ALTER TABLE public.stock_movements
ADD CONSTRAINT stock_movements_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- 2c. purchase_invoices.created_by → profiles(id)
ALTER TABLE public.purchase_invoices
ADD CONSTRAINT purchase_invoices_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id)
ON DELETE SET NULL;

COMMIT;

-- ============================================================================
-- VALIDATION — Run after migration
-- ============================================================================

-- V1. Check all 3 FKs exist and reference profiles
-- SELECT
--   tc.table_name,
--   tc.constraint_name,
--   ccu.table_schema AS foreign_table_schema,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.constraint_column_usage ccu
--   ON tc.constraint_name = ccu.constraint_name
-- WHERE tc.constraint_name IN (
--   'stock_opname_conducted_by_fkey',
--   'stock_movements_user_id_fkey',
--   'purchase_invoices_created_by_fkey'
-- ) AND ccu.table_name = 'profiles';

-- V2. Verify columns are still NULLABLE
-- SELECT column_name, is_nullable
-- FROM information_schema.columns
-- WHERE table_name IN ('stock_opname', 'stock_movements', 'purchase_invoices')
-- AND column_name IN ('conducted_by', 'user_id', 'created_by');

-- V3. Test INSERT with valid profile UUID
-- INSERT INTO stock_opname (opname_date, status, conducted_by, tenant_id)
-- VALUES (CURRENT_DATE, 'draft', '<valid-profile-uuid>', '<valid-tenant-uuid>');
-- DELETE FROM stock_opname WHERE status = 'draft';

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- BEGIN;
-- ALTER TABLE public.stock_opname       DROP CONSTRAINT IF EXISTS stock_opname_conducted_by_fkey;
-- ALTER TABLE public.stock_movements    DROP CONSTRAINT IF EXISTS stock_movements_user_id_fkey;
-- ALTER TABLE public.purchase_invoices  DROP CONSTRAINT IF EXISTS purchase_invoices_created_by_fkey;
--
-- ALTER TABLE public.stock_opname       ADD CONSTRAINT stock_opname_conducted_by_fkey FOREIGN KEY (conducted_by) REFERENCES public.users(id);
-- ALTER TABLE public.stock_movements    ADD CONSTRAINT stock_movements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
-- ALTER TABLE public.purchase_invoices  ADD CONSTRAINT purchase_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
-- COMMIT;
