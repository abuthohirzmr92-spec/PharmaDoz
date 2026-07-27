# Phase 2 Entry Gate — Repositories

Phase 2 implements the repository layer over the frozen Database Foundation.
Phase 2 writes TypeScript (repositories), not SQL. Same discipline: reuse-first,
dual-source aware, gated per unit, no commit without PO approval.

## 1. Repository Map

| Repository | Backing tables | Responsibility | Reuse / new |
|------------|----------------|----------------|-------------|
| `SettingsRepository` | subscription_settings | Versioned config read (effective-window resolver) + cache | NEW |
| `ServiceCatalogRepository` | service_catalog, service_features, package_services | Service→feature resolution feed | NEW |
| `FeatureResolver` (enhance) | package_features, service_features, feature_dependencies, tenants.settings | hasFeature() + dependency DAG + service resolution | **EXTEND existing** `src/lib/features/resolver.ts` |
| `QuotaRepository` | tenant_quota_usage, tenant_packages.resource_limits (+ max_* fallback) | resolve limit / read usage / validate | NEW (supersedes `package-limits.ts` hardcode) |
| `SubscriptionRepository` | subscriptions, subscription_events | current(), transition() (writes event), timeline() | NEW (absorbs bits of `super-admin.ts`) |
| `TrialRequestRepository` | trial_requests | queue / review / approve / reject | NEW |
| `AddonRepository` | addons, addon_grants, package_addons, package_bundle | catalog + capability grants read | NEW |
| `PromotionRepository` | marketing_promotions | validate/resolve offer (Marketing side only) | NEW |
| `ReminderRepository` | reminders, notification_log | schedule / dispatch record | NEW |
| `IntegrationRegistryRepository` | integrations | adapter registry read | NEW |
| `SchedulerRunRepository` | scheduler_runs | idempotent run record | NEW |

> Billing/Payment/Invoice repositories are **Phase 5** — not in Phase 2 scope.

## 2. Dependency Graph

```
SettingsRepository ────────────────┐  (config read by nearly everyone)
                                    ▼
ServiceCatalogRepository ──▶ FeatureResolver(enhanced) ──▶ (UI gates, API authz)
                                    ▲
QuotaRepository ────────────────────┘  (limits + usage; dual-source fallback)
        ▲
SubscriptionRepository ──▶ (writes subscription_events; timeline read model)
        ▲
TrialRequestRepository ──▶ (approve → hands off to provision_tenant)
AddonRepository ─┐
PromotionRepository ─┼─▶ (consumed later by Billing, Phase 5)
ReminderRepository ─┘
IntegrationRegistryRepository / SchedulerRunRepository (platform-internal, leaf)
```

## 3. Implementation Order (dependency-driven)

1. `SettingsRepository` (foundation — cached versioned resolver).
2. `ServiceCatalogRepository` + `FeatureResolver` enhancement (dual-source: service resolution + existing package_features fallback + dependency DAG).
3. `QuotaRepository` (dual-source: resource_limits → max_* fallback; usage from tenant_quota_usage).
4. `SubscriptionRepository` (transition + event append + timeline; dual-source lifecycle_state → status fallback).
5. `TrialRequestRepository`.
6. `AddonRepository`, `PromotionRepository`.
7. `ReminderRepository`, `IntegrationRegistryRepository`, `SchedulerRunRepository`.

## 4. Risk Classification

| Repository | Risk | Reason |
|------------|------|--------|
| SettingsRepository | LOW | Read-only + cache |
| FeatureResolver (enhance) | **MEDIUM** | Must preserve current behavior + add DAG without breaking existing feature gates |
| QuotaRepository | **MEDIUM** | Dual-source fallback correctness (resource_limits vs max_*); blocks resource creation |
| SubscriptionRepository | **MEDIUM** | Writes to append-only ledger; transitions must stay consistent with dual-source status |
| TrialRequest / Addon / Promotion / Reminder / Integration / SchedulerRun | LOW | New, isolated, read-mostly at this phase |

## 5. Testing Strategy

- **Unit-first, pure where possible:** resolver/validator logic as pure functions; mock the Supabase client.
- **Dual-source tests (mandatory):** resource_limits empty ⇒ fall back to max_*; lifecycle_state NULL ⇒ derive from status; tenants.status NULL ⇒ derive from is_active. Prove the fallback path explicitly.
- **Idempotent transition tests:** SubscriptionRepository.transition() appends exactly one event; re-entrancy safe.
- **Anti-regression:** existing FeatureResolver tests must still pass unchanged.
- **No live DB in unit tests;** integration tests run against the staging schema after migrations are applied.
- Coverage target ≥ 85% on new repositories.

## 6. Batch Proposal (gated, same policy)

| Batch | Contents | Gate |
|-------|----------|------|
| **2A** | SettingsRepository · ServiceCatalogRepository · FeatureResolver enhancement · QuotaRepository | validate each (typecheck + unit + no-regression) |
| **2B** | SubscriptionRepository · TrialRequestRepository | validate each |
| **2C** | AddonRepository · PromotionRepository · ReminderRepository · IntegrationRegistryRepository · SchedulerRunRepository | validate each |

Per-unit: implement → typecheck + eslint + unit tests → unit report → next.
Batch summary → Product Owner review. Runtime/integration remains PENDING until
run against the staging DB. No commit without PO approval.

## Entry Preconditions

- [ ] Phase 1 migrations 047–072 applied in staging (runtime checklist green).
- [ ] Backfill Exception Report `critical = 0`.
- [ ] `src/lib/supabase/database.ts` types updated for new columns/tables (first task of Batch 2A).
