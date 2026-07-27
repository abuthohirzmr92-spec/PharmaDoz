# Phase 1 — Architecture Freeze Report

## Status: CLOSED (Database Foundation complete)

Official closing document for the SLE Database Foundation. Post-freeze, no
database redesign occurs unless a bug is discovered (bug fix / minor
clarification / documentation only).

## 1. Architecture Lock
- Final lock approved by Product Owner across iterative reviews.
- One engine, config-driven; three separated domains (Tenant Status /
  Subscription Status / Lifecycle State); reuse-first; additive/idempotent
  migrations; repository pattern + DDD; no hardcode.

## 2. Database Foundation
- Config foundation, additive columns, 15 domain tables, backfill + RPC v2.
- All migrations additive, idempotent, RLS-guarded, reversible; zero destructive
  operations; dual-source transition strategy for every superseded column.

## 3. Executed Migration Range
| Batch | Migrations | Scope |
|-------|-----------|-------|
| 1 | 047–048 | subscription_settings (versioned), resource_definitions |
| 2 | 049–051 | additive columns: tenant_packages, subscriptions, tenants |
| 3A | 052–056 | service_catalog, service_features, feature_dependencies, package_services, trial_requests |
| 3B | 057–061 | addons, addon_grants, package_addons, package_bundle, marketing_promotions |
| 3C | 062–066 | tenant_quota_usage, reminders, notification_log, scheduler_runs, integrations |
| 4 | 067–072 | backfills (resource_limits, subscription state, tenant status), quota migrate/deprecate, event CHECK expand, provision_tenant v2 |

Total: **047 → 072** (26 migrations).

## 4. ADR Range
- ADR-SLE-030 Policy Engine (FUTURE), 031 Feature Registry (FUTURE),
  032 Trial Request Lifecycle (documented; expansion deferred),
  033 Bundle Add-ons Join Table (FUTURE).
- Context/ops docs: marketing-vs-billing, backfill-exception-report,
  post-backfill-verification-checklist, source-of-truth-completion-matrix.
- ADR-01…ADR-39 (blueprint-of-record) remain the design baseline.

## 5. Source of Truth Status (see completion matrix)
All migrated domains are in **DUAL SOURCE** state (legacy + new coexist,
readers fall back to legacy). SoT flip happens in Phase 2 code cutover; legacy
removal is a later Phase L. Nothing has flipped yet — legacy remains authoritative.

## 6. Outstanding Runtime Validation
- Entire range 047–072 is **RUNTIME PENDING** — never asserted as applied.
- Must be executed by the migration runner in staging; see
  `runtime-validation-checklist.md` and `post-backfill-verification-checklist.md`.
- Acceptance gate: `critical` exceptions = 0.

## 7. Future ADR (documented, not implemented)
- Policy Engine (ADR-SLE-030), Feature Registry (ADR-SLE-031), Bundle Add-ons
  Join Table (ADR-SLE-033). Plus deferred tables: tenant_addons,
  promotion_redemptions, tenant_integrations, usage_snapshots.

## 8. Technical Debt (tracked, intentional)
| Debt | Origin | Resolution phase |
|------|--------|------------------|
| Dual-source: `max_*` vs `resource_limits` | Batch 2/4 | Phase 2 cutover → Phase L drop |
| Dual-source: `status` vs `lifecycle_state` | Batch 2/4 | Phase 2 cutover → Phase L |
| Dual-source: `is_active` vs `tenants.status` | Batch 2/4 | Phase 2 cutover → Phase L |
| Legacy `tenant_quotas` (deprecated, read-only) | Batch 4 | Phase L drop |
| `service_features` unseeded (feature-key dot-notation rename pending) | Batch 3A | Feature standardization step |
| `provision_tenant` dual-writes quotas | Batch 4 | Phase L |
| TS types in `src/lib/supabase/database.ts` lack new columns | Batch 2/3 | Phase 2 (repository typing) |
| `subscription.status` naming mismatch (active/trialing vs commercial TRIAL/PAID) | legacy | Phase 2 mapping layer |

## 9. Lessons Learned
- Grounding before SQL caught the migration-number collision (043–046 taken →
  SLE starts at 047) and the `tenant_quotas` dual-key legacy.
- Gated per-migration validation with **runtime explicitly PENDING** prevented
  false "success" assumptions.
- Dual-source + deferred SoT flip kept every batch zero-downtime and
  independently reversible.
- Config-driven seeds (subscription_settings) removed hardcoded trial/grace.

## 10. Phase 1 Final Status
**COMPLETE (authored + statically validated).** Runtime application pending in
staging. Database Foundation is FROZEN.
