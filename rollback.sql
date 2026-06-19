-- ============================================================
-- P0.6F — ROLLBACK: branches(id) → pharmacies(id)
-- ============================================================
-- Tables: users, transactions, products
-- ============================================================

BEGIN;

-- 1. users
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_cabang_id_fkey;
ALTER TABLE users
  ADD CONSTRAINT users_cabang_id_fkey
  FOREIGN KEY (cabang_id) REFERENCES pharmacies(id);

-- 2. transactions
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_pharmacy_id_fkey;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_pharmacy_id_fkey
  FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id);

-- 3. products
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_pharmacy_id_fkey;
ALTER TABLE products
  ADD CONSTRAINT products_pharmacy_id_fkey
  FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id);

COMMIT;
