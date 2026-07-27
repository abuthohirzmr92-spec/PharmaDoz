# AUDIT_REPORT.md — Migration 033 Object Catalog & Dependency Map

## Objects created by migration 033 (total: 33)

### Section 1 — Enhanced existing tables (columns via `DO $$ IF NOT EXISTS`)
| # | Object | Type | Details |
|---|---|---|---|
| 1 | `tenant_packages.is_custom` | COLUMN | BOOLEAN NOT NULL DEFAULT false |
| 2 | `tenant_packages.feature_flags` | COLUMN | JSONB DEFAULT '{}' |
| 3 | `tenant_packages.sort_order` | COLUMN | INTEGER NOT NULL DEFAULT 0 |
| 4 | `subscriptions.previous_package_id` | COLUMN | UUID FK→tenant_packages(id) ON DELETE SET NULL |
| 5 | `subscriptions.changed_at` | COLUMN | TIMESTAMPTZ |
| 6 | `subscriptions.changed_by` | COLUMN | UUID |
| — | (UPDATE sort_order × 3 rows) | DATA | idempotent guard `sort_order = 0` |

### Section 3 — `package_features` (NEW TABLE — ❌ MISSING)
| # | Object | Type | Details |
|---|---|---|---|
| 7 | `package_features` | TABLE | PK UUID, FK→tenant_packages(id) CASCADE, feature_key, is_enabled, config, UNIQUE(package_id, feature_key) |
| 8 | `idx_package_features_package` | INDEX | (package_id) |
| 9 | `idx_package_features_key` | INDEX | (feature_key, is_enabled) |
| 10 | RLS | ALTER | ENABLE ROW LEVEL SECURITY |
| 11 | `package_features_select` | POLICY | FOR SELECT — `auth.uid() IS NOT NULL` |
| 12 | `package_features_insert` | POLICY | FOR INSERT — `is_super_admin()` |
| 13 | `package_features_update` | POLICY | FOR UPDATE — `is_super_admin()` |
| 14 | `package_features_delete` | POLICY | FOR DELETE — `is_super_admin()` |

### Section 4 — `subscription_events` (NEW TABLE — ❌ MISSING)
| # | Object | Type | Details |
|---|---|---|---|
| 15 | `subscription_events` | TABLE | PK UUID, FK→subscriptions(id) CASCADE, FK→tenants(id) CASCADE, **event_type CHECK (13 values)**, FK→tenant_packages ×2, actor_id, metadata JSONB, created_at |
| 16 | `idx_subscription_events_subscription` | INDEX | (subscription_id, created_at DESC) |
| 17 | `idx_subscription_events_tenant` | INDEX | (tenant_id, created_at DESC) |
| 18 | `idx_subscription_events_type` | INDEX | (event_type) |
| 19 | RLS | ALTER | ENABLE ROW LEVEL SECURITY |
| 20 | `subscription_events_select` | POLICY | FOR SELECT — `is_super_admin() OR has_tenant_access(tenant_id)` |
| 21 | `subscription_events_insert` | POLICY | FOR INSERT — `is_super_admin() OR has_tenant_access(tenant_id)` |

### Section 5 — `invoices` (NEW TABLE — ❌ MISSING)
| # | Object | Type | Details |
|---|---|---|---|
| 22 | `invoices` | TABLE | PK UUID, FK→tenants(id) CASCADE, FK→subscriptions(id) SET NULL, invoice_number UNIQUE, amount CHECK>0, currency DEFAULT IDR, status CHECK (6 values), due_date, paid_at, payment_method, notes, timestamps |
| 23 | `idx_invoices_tenant` | INDEX | (tenant_id, created_at DESC) |
| 24 | `idx_invoices_status` | INDEX | (status) |
| 25 | `idx_invoices_subscription` | INDEX | (subscription_id) |
| 26 | RLS | ALTER | ENABLE ROW LEVEL SECURITY |
| 27 | `invoices_select` | POLICY | FOR SELECT — `has_tenant_access(tenant_id)` |
| 28 | `invoices_insert` | POLICY | FOR INSERT — `is_super_admin()` |
| 29 | `invoices_update` | POLICY | FOR UPDATE — `is_super_admin()` |

### Section 6 — Seed data (NOT for recovery)
- INSERT 30 rows into `package_features` (10 per tier × 3 tiers), `ON CONFLICT DO NOTHING`

### Section 7 — Migration safety (NOT for recovery)
- UPDATE `tenants` SET `package_id` = basic where NULL

### Section 8 — Cleanup (NOT for recovery)
- UPDATE `tenant_packages` SET `is_custom` = false for the 3 built-in tiers

---

## Dependency: SLE migrations 047–075 on 033 objects

| SLE Migration | Depends on 033 object | Failure if missing |
|---|---|---|
| **049** `tenant_packages_columns` | `tenant_packages.is_custom`, `feature_flags`, `sort_order` (must exist as columns before adding new ones) | ❌ 049 uses `ADD COLUMN IF NOT EXISTS` — no failure; but `parent_package_id` FK references `tenant_packages(id)` which EXISTS |
| **050** `subscriptions_columns` | `subscriptions.previous_package_id`, `changed_at`, `changed_by` | ❌ 050 uses `ADD COLUMN IF NOT EXISTS` — no failure |
| **071** `expand_sub_events_check` | **`subscription_events` TABLE** | 🔴 `ALTER TABLE subscription_events` FAILS if table missing |
| **072** `provision_tenant_v2` | **`subscription_events` TABLE** (INSERT) | 🔴 Runtime INSERT fails if table missing |
| **073** `subscription_transition_fn` | **`subscription_events` TABLE** (INSERT in RPC body) | 🔴 Runtime INSERT fails if table missing |
| **074** `sub_transition_v2` | **`subscription_events` TABLE** (INSERT in RPC body) | 🔴 Runtime INSERT fails if table missing |
| **075** `webhook_promotion_dedup` | **`invoices` TABLE** (FK→invoices from `promotion_redemptions`) | 🔴 FK creation fails if `invoices` missing |

**Summary:** 4 SLE migrations **cannot function** without the three missing tables (071, 072, 074, 075). 073 has a runtime dependency. The column-add migrations (049, 050) are unaffected because 033's column additions already succeeded.
