# Apotek Manage -- Database Schema

> Total: **19 tables** across 3 migration files.
> All money columns use `DECIMAL(15,2)`. All timestamps use `TIMESTAMPTZ`.
> All primary keys use `UUID DEFAULT gen_random_uuid()`.

---

## Entity Relationship Diagram (text)

```
pharmacies          1------* users
pharmacies          1------* products
pharmacies          1------* suppliers
pharmacies          1------* transactions
pharmacies          1------* purchase_invoices
roles               1------* role_permissions *------1 permissions
roles               1------* users
product_categories  1------* products
products            1------* product_batches
products            1------* transaction_items
products            1------* stock_movements
suppliers           1------* purchase_invoices
purchase_invoices   1------* purchase_items
product_batches     1------* stock_movements
users               1------* stock_movements
users               1------* stock_opname
stock_opname        1------* stock_opname_items
transactions        1------* transaction_items
transactions        1------* transaction_payments
```

---

## Tables

### 1. `roles` -- Role pengguna

| Column       | Type                  | Constraints          |
|--------------|-----------------------|----------------------|
| id           | UUID                  | PK DEFAULT gen_random_uuid() |
| name         | VARCHAR(50)           | UNIQUE NOT NULL      |
| description  | TEXT                  |                      |
| created_at   | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |
| updated_at   | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |

**Indexes:** `idx_roles_name` on (name)

**Seed data:** owner, admin, apoteker, kasir

---

### 2. `permissions` -- Izin akses granular

| Column      | Type                  | Constraints          |
|-------------|-----------------------|----------------------|
| id          | UUID                  | PK DEFAULT gen_random_uuid() |
| key         | VARCHAR(100)          | UNIQUE NOT NULL      |
| description | TEXT                  |                      |
| module      | VARCHAR(50)           |                      |
| created_at  | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |

**Indexes:** `idx_permissions_module` on (module)

**Seed data:** 19 permissions (inventory, cashier, products, suppliers, purchases, reports, users, settings, expired, logs)

---

### 3. `role_permissions` -- Junction role <-> permission

| Column        | Type                  | Constraints                     |
|---------------|-----------------------|---------------------------------|
| id            | UUID                  | PK DEFAULT gen_random_uuid()   |
| role_id       | UUID                  | FK -> roles(id) ON DELETE CASCADE, NOT NULL |
| permission_id | UUID                  | FK -> permissions(id) ON DELETE CASCADE, NOT NULL |
|               |                       | UNIQUE (role_id, permission_id) |

**Indexes:** `idx_role_permissions_role_id`, `idx_role_permissions_permission_id`

---

### 4. `pharmacies` -- Cabang apotek

| Column       | Type                  | Constraints          |
|--------------|-----------------------|----------------------|
| id           | UUID                  | PK DEFAULT gen_random_uuid() |
| name         | VARCHAR(200)          | NOT NULL             |
| code         | VARCHAR(20)           | UNIQUE NOT NULL      |
| address      | TEXT                  |                      |
| phone        | VARCHAR(30)           |                      |
| email        | VARCHAR(100)          |                      |
| is_active    | BOOLEAN               | DEFAULT true         |
| opening_time | TIME                  |                      |
| closing_time | TIME                  |                      |
| created_at   | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |
| updated_at   | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |
| deleted_at   | TIMESTAMPTZ           | Soft delete          |

**Indexes:** code, is_active, deleted_at

**Seed data:** 1 default branch "Apotek Utama" (AU-001)

---

### 5. `users` -- Pengguna sistem

| Column       | Type                  | Constraints          |
|--------------|-----------------------|----------------------|
| id           | UUID                  | PK DEFAULT gen_random_uuid() |
| supabase_uid | UUID                  | UNIQUE               |
| email        | VARCHAR(255)          | UNIQUE NOT NULL      |
| display_name | VARCHAR(200)          | NOT NULL             |
| role_id      | UUID                  | FK -> roles(id) ON DELETE RESTRICT, NOT NULL |
| cabang_id    | UUID                  | FK -> pharmacies(id) ON DELETE RESTRICT |
| phone        | VARCHAR(30)           |                      |
| avatar_url   | TEXT                  |                      |
| is_active    | BOOLEAN               | DEFAULT true         |
| last_login_at| TIMESTAMPTZ           |                      |
| created_at   | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |
| updated_at   | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |
| deleted_at   | TIMESTAMPTZ           | Soft delete          |

**Indexes:** supabase_uid, email, role_id, cabang_id, is_active, deleted_at

**Note:** `cabang_id` is the pharmacy reference (equivalent to `pharmacy_id`).

---

### 6. `product_categories` -- Kategori produk/obat

| Column      | Type                  | Constraints          |
|-------------|-----------------------|----------------------|
| id          | UUID                  | PK DEFAULT gen_random_uuid() |
| name        | VARCHAR(100)          | NOT NULL             |
| description | TEXT                  |                      |
| parent_id   | UUID                  | FK -> product_categories(id) ON DELETE SET NULL |
| is_active   | BOOLEAN               | DEFAULT true         |
| created_at  | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |
| updated_at  | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |
| deleted_at  | TIMESTAMPTZ           | Soft delete          |

**Indexes:** parent_id, is_active, deleted_at

**Seed data:** Obat Bebas, Obat Bebas Terbatas, Obat Keras, Alat Kesehatan, Kosmetik, Suplemen

---

### 7. `products` -- Master produk/obat

| Column                | Type                  | Constraints          |
|-----------------------|-----------------------|----------------------|
| id                    | UUID                  | PK DEFAULT gen_random_uuid() |
| category_id           | UUID                  | FK -> product_categories(id) ON DELETE RESTRICT, NOT NULL |
| name                  | VARCHAR(255)          | NOT NULL             |
| barcode               | VARCHAR(100)          | UNIQUE               |
| description           | TEXT                  |                      |
| image_url             | TEXT                  |                      |
| requires_prescription | BOOLEAN               | DEFAULT false        |
| min_stock             | INTEGER               | DEFAULT 0            |
| is_active             | BOOLEAN               | DEFAULT true         |
| created_at            | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |
| updated_at            | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |
| deleted_at            | TIMESTAMPTZ           | Soft delete          |

**Indexes:** category_id, barcode, is_active, requires_prescription, deleted_at

---

### 8. `suppliers` -- Data pemasok

| Column         | Type                  | Constraints          |
|----------------|-----------------------|----------------------|
| id             | UUID                  | PK DEFAULT gen_random_uuid() |
| name           | VARCHAR(200)          | NOT NULL             |
| contact_person | VARCHAR(200)          |                      |
| phone          | VARCHAR(30)           |                      |
| email          | VARCHAR(100)          |                      |
| address        | TEXT                  |                      |
| is_active      | BOOLEAN               | DEFAULT true         |
| created_at     | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |
| updated_at     | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |
| deleted_at     | TIMESTAMPTZ           | Soft delete          |

**Indexes:** is_active, deleted_at

---

### 9. `supplier_debts` -- Hutang pemasok

| Column        | Type                  | Constraints          |
|---------------|-----------------------|----------------------|
| id            | UUID                  | PK DEFAULT gen_random_uuid() |
| supplier_id   | UUID                  | FK -> suppliers(id) ON DELETE RESTRICT, NOT NULL |
| invoice_number| VARCHAR(100)          |                      |
| amount        | DECIMAL(15,2)         | NOT NULL             |
| paid_amount   | DECIMAL(15,2)         | DEFAULT 0            |
| status        | VARCHAR(20)           | DEFAULT 'unpaid'     |
| due_date      | DATE                  |                      |
| paid_at       | TIMESTAMPTZ           |                      |
| created_at    | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |
| updated_at    | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |
| deleted_at    | TIMESTAMPTZ           | Soft delete          |

**Indexes:** supplier_id, status, due_date, deleted_at

**Note:** This table is **superseded** by `purchase_invoices` (migration 002). Use `purchase_invoices` for new implementations.

---

### 10. `app_settings` -- Pengaturan aplikasi key-value

| Column      | Type                  | Constraints          |
|-------------|-----------------------|----------------------|
| id          | UUID                  | PK DEFAULT gen_random_uuid() |
| key         | VARCHAR(100)          | UNIQUE NOT NULL      |
| value       | TEXT                  | NOT NULL             |
| description | TEXT                  |                      |
| created_at  | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |
| updated_at  | TIMESTAMPTZ           | NOT NULL DEFAULT NOW() |

**Indexes:** `idx_app_settings_key` on (key)

**Seed data:** app_name, app_version, currency, default_cabang_id

---

### 11. `product_batches` -- Batch produk (FEFO)

| Column        | Type                  | Constraints                     |
|---------------|-----------------------|---------------------------------|
| id            | UUID                  | PK DEFAULT gen_random_uuid()   |
| product_id    | UUID                  | FK -> products(id) ON DELETE RESTRICT, NOT NULL |
| batch_number  | VARCHAR(100)          | NOT NULL                        |
| expired_date  | DATE                  | NOT NULL                        |
| quantity      | INTEGER               | NOT NULL DEFAULT 0, CHECK (>= 0)|
| unit_price    | DECIMAL(15,2)         | NOT NULL DEFAULT 0              |
| selling_price | DECIMAL(15,2)         | NOT NULL DEFAULT 0              |
| received_at   | TIMESTAMPTZ           | NOT NULL DEFAULT NOW()          |
| created_at    | TIMESTAMPTZ           | NOT NULL DEFAULT NOW()          |
| updated_at    | TIMESTAMPTZ           | NOT NULL DEFAULT NOW()          |
| deleted_at    | TIMESTAMPTZ           | Soft delete                     |

**Indexes:**
- `idx_batches_product_id` on (product_id)
- `idx_batches_expired_date` on (expired_date)
- `idx_batches_quantity` on (quantity)
- `idx_batches_deleted_at` on (deleted_at)
- `idx_batches_fefo` on (product_id, expired_date ASC) -- FEFO ordering

---

### 12. `purchase_invoices` -- Invoice pembelian

| Column         | Type                  | Constraints                                |
|----------------|-----------------------|--------------------------------------------|
| id             | UUID                  | PK DEFAULT gen_random_uuid()              |
| invoice_number | VARCHAR(100)          | UNIQUE NOT NULL                            |
| supplier_id    | UUID                  | FK -> suppliers(id) ON DELETE RESTRICT, NOT NULL |
| purchase_date  | DATE                  | NOT NULL DEFAULT CURRENT_DATE              |
| due_date       | DATE                  |                                           |
| status         | VARCHAR(20)           | NOT NULL DEFAULT 'unpaid', CHECK (IN ('paid','partial','unpaid')) |
| total_amount   | DECIMAL(15,2)         | NOT NULL DEFAULT 0                         |
| paid_amount    | DECIMAL(15,2)         | NOT NULL DEFAULT 0                         |
| notes          | TEXT                  |                                           |
| created_by     | UUID                  | FK -> users(id)                           |
| created_at     | TIMESTAMPTZ           | NOT NULL DEFAULT NOW()                     |
| updated_at     | TIMESTAMPTZ           | NOT NULL DEFAULT NOW()                     |
| deleted_at     | TIMESTAMPTZ           | Soft delete                                |

**Indexes:** supplier_id, status, due_date, purchase_date, deleted_at

---

### 13. `purchase_items` -- Detail item pembelian

| Column        | Type                  | Constraints                                |
|---------------|-----------------------|--------------------------------------------|
| id            | UUID                  | PK DEFAULT gen_random_uuid()              |
| invoice_id    | UUID                  | FK -> purchase_invoices(id) ON DELETE CASCADE, NOT NULL |
| product_id    | UUID                  | FK -> products(id) ON DELETE RESTRICT, NOT NULL |
| batch_number  | VARCHAR(100)          | NOT NULL                                   |
| expired_date  | DATE                  | NOT NULL                                   |
| quantity      | INTEGER               | NOT NULL, CHECK (> 0)                      |
| unit_price    | DECIMAL(15,2)         | NOT NULL                                   |
| selling_price | DECIMAL(15,2)         | NOT NULL                                   |
| subtotal      | DECIMAL(15,2)         | GENERATED ALWAYS AS (quantity * unit_price) STORED |
| created_at    | TIMESTAMPTZ           | NOT NULL DEFAULT NOW()                     |

**Indexes:** `idx_purchase_items_invoice_id`, `idx_purchase_items_product_id`

---

### 14. `stock_movements` -- Audit trail stok

| Column          | Type                  | Constraints                                |
|-----------------|-----------------------|--------------------------------------------|
| id              | UUID                  | PK DEFAULT gen_random_uuid()              |
| timestamp       | TIMESTAMPTZ           | NOT NULL DEFAULT NOW()                     |
| movement_type   | VARCHAR(20)           | NOT NULL, CHECK (IN ('purchase','sale','refund','expired','opname','adjustment')) |
| product_id      | UUID                  | FK -> products(id) ON DELETE RESTRICT, NOT NULL |
| batch_id        | UUID                  | FK -> product_batches(id) ON DELETE SET NULL |
| qty_before      | INTEGER               | NOT NULL                                   |
| qty_change      | INTEGER               | NOT NULL                                   |
| qty_after       | INTEGER               | NOT NULL                                   |
| reference_number| VARCHAR(100)          |                                           |
| note            | TEXT                  |                                           |
| user_id         | UUID                  | FK -> users(id)                           |
| created_at      | TIMESTAMPTZ           | NOT NULL DEFAULT NOW()                     |

**Indexes:** product_id, batch_id, movement_type, (timestamp DESC)

---

### 15. `stock_opname` -- Sesi stock opname

| Column       | Type                  | Constraints                                |
|--------------|-----------------------|--------------------------------------------|
| id           | UUID                  | PK DEFAULT gen_random_uuid()              |
| opname_date  | DATE                  | NOT NULL DEFAULT CURRENT_DATE              |
| status       | VARCHAR(20)           | NOT NULL DEFAULT 'draft', CHECK (IN ('draft','confirmed','adjusted')) |
| conducted_by | UUID                  | FK -> users(id)                           |
| notes        | TEXT                  |                                           |
| created_at   | TIMESTAMPTZ           | NOT NULL DEFAULT NOW()                     |
| updated_at   | TIMESTAMPTZ           | NOT NULL DEFAULT NOW()                     |

**Indexes:** opname_date, status

---

### 16. `stock_opname_items` -- Detail item opname

| Column      | Type                  | Constraints                                |
|-------------|-----------------------|--------------------------------------------|
| id          | UUID                  | PK DEFAULT gen_random_uuid()              |
| opname_id   | UUID                  | FK -> stock_opname(id) ON DELETE CASCADE, NOT NULL |
| product_id  | UUID                  | FK -> products(id) ON DELETE RESTRICT, NOT NULL |
| batch_id    | UUID                  | FK -> product_batches(id) ON DELETE SET NULL |
| system_qty  | INTEGER               | NOT NULL DEFAULT 0                         |
| physical_qty| INTEGER               | NOT NULL DEFAULT 0                         |
| difference  | INTEGER               | GENERATED ALWAYS AS (physical_qty - system_qty) STORED |
| note        | TEXT                  |                                           |
| created_at  | TIMESTAMPTZ           | NOT NULL DEFAULT NOW()                     |

**Indexes:** opname_id, product_id, batch_id

---

### 17. `transactions` -- Penjualan selesai

| Column        | Type                  | Constraints          |
|---------------|-----------------------|----------------------|
| id            | UUID                  | PK DEFAULT gen_random_uuid() |
| pharmacy_id   | UUID                  | FK -> pharmacies(id) ON DELETE RESTRICT, NOT NULL |
| invoice_number| VARCHAR(50)           | UNIQUE NOT NULL      |
| cashier_name  | VARCHAR(100)          | NOT NULL             |
| subtotal      | DECIMAL(15,2)         | NOT NULL DEFAULT 0   |
| discount      | DECIMAL(15,2)         | NOT NULL DEFAULT 0   |
| tax           | DECIMAL(15,2)         | NOT NULL DEFAULT 0   |
| total         | DECIMAL(15,2)         | NOT NULL DEFAULT 0   |
| created_at    | TIMESTAMPTZ           | NOT NULL DEFAULT now() |
| updated_at    | TIMESTAMPTZ           |                      |
| deleted_at    | TIMESTAMPTZ           | Soft delete          |

**Indexes:**
- `idx_transactions_pharmacy_date` on (pharmacy_id, created_at DESC)
- `idx_transactions_invoice` on (invoice_number)
- `idx_transactions_created_at` on (created_at DESC)
- `idx_transactions_deleted_at` on (deleted_at)

---

### 18. `transaction_items` -- Line item transaksi

| Column         | Type                  | Constraints                                |
|----------------|-----------------------|--------------------------------------------|
| id             | UUID                  | PK DEFAULT gen_random_uuid()              |
| transaction_id | UUID                  | FK -> transactions(id) ON DELETE CASCADE, NOT NULL |
| product_id     | UUID                  | FK -> products(id) ON DELETE RESTRICT, NOT NULL |
| product_name   | VARCHAR(150)          | NOT NULL                                   |
| quantity       | INTEGER               | NOT NULL, CHECK (> 0)                      |
| unit_price     | DECIMAL(15,2)         | NOT NULL                                   |
| subtotal       | DECIMAL(15,2)         | NOT NULL                                   |
| created_at     | TIMESTAMPTZ           | NOT NULL DEFAULT now()                     |

**Indexes:**
- `idx_transaction_items_transaction` on (transaction_id)
- `idx_transaction_items_product` on (product_id)

---

### 19. `transaction_payments` -- Metode pembayaran

| Column         | Type                  | Constraints                                |
|----------------|-----------------------|--------------------------------------------|
| id             | UUID                  | PK DEFAULT gen_random_uuid()              |
| transaction_id | UUID                  | FK -> transactions(id) ON DELETE CASCADE, NOT NULL |
| amount         | DECIMAL(15,2)         | NOT NULL, CHECK (> 0)                      |
| method         | VARCHAR(20)           | NOT NULL, CHECK (IN ('cash','debit','credit','qris','transfer')) |
| ref            | VARCHAR(100)          |                                           |
| created_at     | TIMESTAMPTZ           | NOT NULL DEFAULT now()                     |

**Indexes:**
- `idx_transaction_payments_transaction` on (transaction_id)
- `idx_transaction_payments_method` on (method)

---

## Key Design Decisions

### FEFO (First Expired, First Out)
Composite index `idx_batches_fefo` on `product_batches(product_id, expired_date ASC)` drives FEFO allocation. When a sale occurs, the system selects the batch with the nearest expiry date for each product.

### Movement-based Inventory
All stock changes pass through `stock_movements`, recording `qty_before`, `qty_change`, and `qty_after`. No direct mutation of batch quantities without an audit trail. Movement types: `purchase`, `sale`, `refund`, `expired`, `opname`, `adjustment`.

### Tenant Isolation
`pharmacy_id` is present on `transactions` for multi-tenant readiness. The `users` table uses `cabang_id` (semantically equivalent) referencing `pharmacies(id)`. All future operational tables should include `pharmacy_id`.

### Soft Delete
Tables with `deleted_at` support soft delete. A row is considered active when `deleted_at IS NULL`. Application queries must filter `WHERE deleted_at IS NULL`.

### Money as DECIMAL(15,2)
All monetary values use `DECIMAL(15,2)` -- never `FLOAT` or `REAL` -- to avoid floating-point rounding errors.

### Snapshotting
`transaction_items.product_name` stores a snapshot of the product name at time of sale. This prevents name changes in the product master from altering historical sales data.

### Split Payments
`transaction_payments` allows a single transaction to have multiple payment methods (e.g., cash + qris). The sum of `transaction_payments.amount` for a transaction should equal `transactions.total`.

### Supplier Debts Superseded
The `supplier_debts` table (from migration 001) is superseded by `purchase_invoices` (from migration 002). `purchase_invoices` provides invoice-level tracking with `total_amount`, `paid_amount`, and `status`.

### Missing pharmacy_id on Existing Tables
The following operational tables currently lack `pharmacy_id` and should be migrated in a future change: `products`, `product_categories`, `product_batches`, `suppliers`, `purchase_invoices`, `purchase_items`, `stock_movements`, `stock_opname`, `stock_opname_items`.
