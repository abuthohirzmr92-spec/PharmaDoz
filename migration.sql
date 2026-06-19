-- ============================================================
-- P0.6F — FK Migration: pharmacies(id) → branches(id)
-- ============================================================
-- Tables: products, transactions, users
-- Pre-flight checks PASSED (no orphan rows)
-- ============================================================

BEGIN;

-- 1. products
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_pharmacy_id_fkey;
ALTER TABLE products
  ADD CONSTRAINT products_pharmacy_id_fkey
  FOREIGN KEY (pharmacy_id) REFERENCES branches(id);

-- 2. transactions
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_pharmacy_id_fkey;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_pharmacy_id_fkey
  FOREIGN KEY (pharmacy_id) REFERENCES branches(id);

-- 3. users
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_cabang_id_fkey;
ALTER TABLE users
  ADD CONSTRAINT users_cabang_id_fkey
  FOREIGN KEY (cabang_id) REFERENCES branches(id);

COMMIT;
