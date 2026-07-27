# ROOT_CAUSE_ANALYSIS.md — Migration Drift (033 Partial Execution)

## Observation

Production database has:
- ✅ Columns from 033 Section 1: `tenant_packages.is_custom`, `.feature_flags`, `.sort_order`; `subscriptions.previous_package_id`, `.changed_at`, `.changed_by`
- ✅ Columns from 033 Section 2: `subscriptions.previous_package_id`, `changed_at`, `changed_by`
- ❌ Tables from 033 Section 3: `package_features`
- ❌ Tables from 033 Section 4: `subscription_events`
- ❌ Tables from 033 Section 5: `invoices`
- ✅ SLE migration columns (049, 050, 051) — partially applied
- ❌ SLE migration 071 fails (ALTER TABLE subscription_events)
- ❌ SLE migration 072 fails (INSERT subscription_events)
- ❌ SLE migration 075 fails (FK→invoices)

## What CANNOT be the cause

1. **Mid-transaction failure (PG crash while running 033).** Ruled out: 033 is wrapped in a single `BEGIN; … COMMIT;` transaction. If the transaction fails at any point, PostgreSQL rolls back **everything** — columns AND tables. We would not see columns present but tables absent from the **same** transaction.

2. **Silent partial execution because of duplicate object.** Ruled out: `CREATE TABLE IF NOT EXISTS` creates the table if missing; `DO $$ IF NOT EXISTS` guards columns. Both are safe to re-run. Re-running 033 would both re-create the tables AND skip already-existing columns.

## Plausible causes

### Cause A: Tables were manually dropped AFTER 033 completed successfully (MOST LIKELY)
Someone with super-admin or direct DB access executed:
```sql
DROP TABLE package_features CASCADE;
DROP TABLE subscription_events CASCADE;
DROP TABLE invoices CASCADE;
```
Evidence:
- The three missing tables share a trait: they are **the only new tables** created by 033. Columns on existing tables were untouched.
- `CASCADE` would not affect the parent tables (`tenant_packages`, `subscriptions`) — only the referencing objects.
- Post-drop, nobody re-ran 033 to restore them. The `CREATE TABLE IF NOT EXISTS` guard would have been satisfied on a re-run if anyone had tried.
- The column additions (Section 1) are also in 033, but re-running 033 after the tables were dropped would **re-create the tables** — so this implies 033 was **never re-run after the drop**.

### Cause B: Database restored from a partial backup (POSSIBLE)
A `pg_dump` that only included certain schemas/tables (or excluded the three tables), followed by a restore, would leave the columns intact but the tables absent. However, this is less probable because typically `pg_dump` produces consistent, full-schema output unless filtered explicitly.

### Cause C: Migration 033 was edited AFTER the initial run (LESS LIKELY)
If 033 was originally shorter (only Section 1 + 2) and Sections 3-5 were added later, then the initial run would only create columns. But the file in the repository is the canonical version and there is no version history showing a smaller version. The file has been in its current form since the commit that created it.

## Conclusion

**Root cause: Cause A — the three tables (`package_features`, `subscription_events`, `invoices`) were dropped from production after 033 completed, and 033 was never re-applied to restore them.**

Supporting factors:
- Migration 033 is idempotent — running it again would have restored the tables without side effects. This was apparently never done.
- Subsequent migrations (047–075) were authored assuming all 033 objects existed. 071, 072, 074, 075 fail because they were never designed for a database where these tables are absent.
- The column enhancements (Section 1 of 033) were **not** dropped because they are on existing tables (`tenant_packages`, `subscriptions`) — they survived.

## Recommended action

**Do NOT re-run migration 033** — its seed data (Section 6), migration safety UPDATE (Section 7), and cleanup UPDATE (Section 8) may have unintended side effects if re-applied to a production database with real data (e.g., auto-assigning basic to tenants without a package, marking packages as non-custom, re-seeding feature mappings that may have been customized).

Instead, create a **Production Recovery Migration (076)** that creates ONLY the missing structural objects (tables/indexes/FKs/RLS/policies) using the **exact same schema** as 033, without seed data, without data mutations, without any UPDATE/INSERT to existing tables.
