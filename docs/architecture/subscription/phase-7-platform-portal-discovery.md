# Phase 7 — Platform Subscription Management (Discovery)

Product: Operational cockpit for Super Admin over the existing SLE engine.
**Reuse-first.** No backend/repo/service/database redesign. Architecture LOCKED.
Database FROZEN. Consume Phase 1–6 repos, services, and stores.

## Platform Nav Extension
The existing `PlatformNavGroup[]` format supports `children[]`. Proposed nav:

```
Platform (existing)          ← keep
  Dashboard Platform          ← enhance with SLE KPIs
  Manajemen Tenant            ← existing (add subscription status/timeline per tenant)
  Permintaan Trial            ← new: trial_requests queue
  Paket Langganan             ← existing (add versioning/resource_limits)
  Ekspansi Cabang             ← existing
  Pengaturan Platform         ← existing

Subscription Management (NEW group)
  Langganan Aktif             ← subscriptions list + lifecycle actions
  Tagihan & Invoice           ← invoices + payments + verify
  Promosi                     ← promotions CRUD
  Penyedia Pembayaran         ← providers registry + health
  Monitor Billing             ← billing analytics / aging / sync
  Jadwal & Otomasi            ← scheduler_runs + cron health

Sistem (existing)
  Monitoring                  ← existing
  Diagnostics                 ← existing
  Maintenance                 ← existing
```

## Data Source Map (14 sections → repos/services)
| # | Section | Repo/Service (existing) |
|---|---|---|
| 1 | Super Admin Dashboard (SLE KPIs) | `superAdminRepo`, `subscriptionRepo`, `invoiceRepo`, `paymentRepo`, `paymentProviderManager`, `settingsRepo`, `schedulerRunRepo` |
| 2 | Tenant Management | `superAdminRepo` (getAllTenants) + `subscriptionRepo.getCurrent` per tenant + `invoiceRepo` |
| 3 | Trial Approval Center | `trialRequestRepo` (listQueue, getById, startReview, approve, reject) + `provisionTenantService` |
| 4 | Subscription Management | `subscriptionRepo` (listForSweep, getTimeline, transition via RPC) + `SubscriptionLifecycleService` |
| 5 | Package Management | `packageRepo` (CRUD) + `serviceCatalogRepo` + `service_features`, `package_features` |
| 6 | Promotion Management | `promotionRepo` + `BillingService` (previewCheckout) |
| 7 | Payment Provider Management | `paymentProviderManager` + `integrations` registry + `PaymentProviderRegistry` (keys, capabilities) |
| 8 | Billing Monitoring | `invoiceRepo`, `paymentRepo` (all tenants) + `subscriptionRepo` + `retry-engine` |
| 9 | Quota Monitoring | `quotaRepo` (per tenant) + `resource_definitions` |
| 10 | Operational Monitoring | `superAdminRepo` (getPlatformStats) + config thresholds |
| 11 | Scheduler Monitoring | `schedulerRunRepo` (runs, idempotency guard) + per-job metrics |
| 12 | Audit & Timeline | `subscriptionRepo.getTimeline` (cross-tenant) + `subscription_events` + `activityLogRepo` |
| 13 | System Health | `paymentProviderManager` (health signals) + `superAdminRepo` + config |
| 14 | Runtime Validation | cumulative runtime validation checklist (migrations 047–073 + Phase 4 cron + Phase 5 webhook) |

## 1–14: Component breakdown (reuse/reuse with data/new)
- **Dashboard (1):** Enhance existing `/platform` with SLE widgets → reuse `superAdminRepo.getAllTenants`, expose counts by `lifecycle_state`, trial funnel, MRR/ARR derived from `invoices`/`payments`, `paymentProviderManager` health info. Extend `useSuperAdminStore`.
- **Tenant Management (2):** Existing `/platform/tenants`. Extend each tenant row to surface `lifecycle_state` (via `subscriptionRepo.getCurrent`). Tenant detail subsections: Subscription Timeline, Invoices, Payments. Reuse `SuperAdminRepository`.
- **Trial Approval (3):** New `/platform/trials` page → list queue + approve/reject flow. Reuse `trialRequestRepo` + `provisionTenantService.resolvePlanForRequest`. Super-admin chooses duration/plan/overrides. UI: data table + review drawer.
- **Subscriptions (4):** New `/platform/subscriptions` → table filterable by lifecycle_state + type. Actions: manual transition (via `SubscriptionLifecycleService`), reactivate, suspend, cancel. Detail: timeline from `getTimeline`. Reuse filter/sweep patterns.
- **Packages (5):** Existing `/platform/packages`. Extend with resource_limits editor, service assignment (toggle package_services), versioning UI, feature assignment. Reuse `packageRepo` + `serviceCatalogRepo`.
- **Promotions (6):** New `/platform/promotions` → CRUD, validity window, redemptions analytics. Reuse `promotionRepo`.
- **Providers (7):** New `/platform/providers` → registry list (capabilities, health, method list), provider detail, status management (active/sandbox/disabled). Reuse `PaymentProviderRegistry` + `integrations`.
- **Billing Monitoring (8):** New `/platform/billing` → outstanding balances, overdue invoices, payment aging, recent payments, verify/refund actions. Reuse `invoiceRepo` + `paymentRepo`.
- **Quota (9):** New `/platform/quotas` → per-tenant quota usage, over-limit alerts, quota override capability. Reuse `quotaRepo` + `resource_definitions`.
- **Operations (10):** Existing monitoring page enhanced with tenant lifecycle distribution, trial conversion funnel, sweep stats. Reuse `superAdminRepo.getPlatformStats`.
- **Scheduler (11):** New `/platform/scheduler` → job run history (`scheduler_runs`), status, errors, manual trigger capability. Reuse `schedulerRunRepo`.
- **Audit (12):** Reuse existing audit pattern (`AuditLogTable`) + add subscription_events filter/export. Reuse `subscriptionRepo.getTimeline` + `activityLogRepo`.
- **System Health (13):** Reuse existing health metrics + add provider-health cards, RPC latency, cron-sweep status. Reuse `paymentProviderManager` + `schedulerRunRepo`.
- **Runtime Validation (14):** Checklist-driven page referencing cumulative SLE validations (migrations 047–073, Phase 4 cron, Phase 5 webhook). Read-only checklist; not automatic.

## Reuse Matrix
| Component Type | Examples |
|----------------|---------|
| Existing (no change) | monitoring page, diagnostics, maintenance, expansions, platform layout/sidebar, `AppCard`/`AppBadge` |
| Existing (extended with SLE data) | Dashboard (KPIs), Tenant detail (lifecycle/timeline), Packages (resource_limits editor) |
| New (consumes existing repos/services) | Trials, Subscriptions, Promotions, Providers, Billing Monitor, Quota Monitor, Scheduler |
| New (read-only checklist) | Runtime Validation |

## ViewModel helpers (new, pure, consume existing data)
- `platformDashboardModel(stats, counts, revenue)` → KPI array.
- `trialQueueModel(requests[])` → categorized queue counts.
- `providerHealthModel(registry, manager)` → per-provider status cards.
- `billingAgingModel(invoices[])` → aging buckets.
- `sweepSummaryModel(runs[])` → last-run + success metrics.
Nol business logic.

## Risk Assessment
| # | Risk | Mitigation |
|---|---|---|
| R1 | Super-admin writes (manual transition) bypass RLS if not server-side | Route privileged actions via server actions using `createPrivilegedBilling()` / direct RPC; reads via user client (super_admin perms) |
| R2 | Cross-tenant queries heavy on dashboard | Reuse existing `superAdminRepo.getAllTenants` pattern (already aggregates); paginate extra joins |
| R3 | Platform nav group too large | Add "Subscription Management" as a new group per the tree model |
| R4 | Duplicate audit — existing `activity_logs` + new `subscription_events` | Both exist; audit page lists both with source label; no de-duplication needed |

## Implementation Plan (batches, same policy)
- **7A:** Platform nav extension + Dashboard (SLE KPI cards) — presentational, reads.
- **7B:** Trial Requests + Tenant detail (lifecycle) — interactive, writes via privileged.
- **7C:** Subscriptions (list, lifecycle actions, timeline) + Active Invoices (verify).
- **7D:** Packages (resource_limits editor) + Promotions CRUD.
- **7E:** Providers + Billing Monitor + Quota Monitor.
- **7F:** Scheduler Monitor + Audit (cross-source).
- **7G:** Runtime Validation checklist page.

Each batch: validate (tsc/vitest/eslint/build) → Batch Summary → PO Review. Runtime PENDING staging. No commits. DB FROZEN.
