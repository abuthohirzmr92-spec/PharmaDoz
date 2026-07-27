# Subscription Lifecycle Engine (SLE) — Architecture

Status: **FINAL ARCHITECTURE LOCK — APPROVED** (Product Owner).

The SLE turns tenant lifecycle (Trial → Monthly/Quarterly/Yearly/Lifetime/
Enterprise) into **one** configuration-driven engine. Subscription **type** is
the only difference between plans; there is no separate system per plan.

## Locked principles

- **Reuse first** — build on existing `subscriptions`, `invoices`, `payments`,
  `subscription_events`, `package_features`, `FeatureResolver`.
- **Three separated domains** — Tenant Status (access gate) · Subscription
  Status (commercial) · Lifecycle State (FSM). Never merged.
- **Config-driven, no hardcode** — all business rules from `subscription_settings`
  (versioned, `effective_from`/`effective_until`). No `.env` for business rules.
- **Additive, idempotent migrations** — mirror the `033_package_features.sql`
  pattern (`IF NOT EXISTS`, `DO $$ … $$`, reversible).
- **Repository pattern + DDD** — engine is framework-agnostic and pure.
- **No commit without Product Owner approval.**

## Bounded contexts

Catalog · Subscription (lifecycle) · Billing · Payment · Invoice ·
Capability · Reminder · Marketing · Audit · Integration Registry ·
Scheduler Registry. (See ADR list.)

## Migration numbering

The SLE migration series starts at **047** (`database/migrations/047_*`).
Numbers 043–046 are already used by storage-location / identity migrations.

## ADRs

- `adr/ADR-SLE-030-policy-engine.md` — Policy Engine (**FUTURE**, not implemented).
- `adr/ADR-SLE-031-feature-registry.md` — Feature Registry (**FUTURE**, not implemented).
- `adr/ADR-SLE-032-trial-request-lifecycle.md` — Complete trial lifecycle (documentation; additive expansion deferred).
- `adr/ADR-SLE-033-bundle-addons-join-table.md` — Bundle→addon join table (**FUTURE**; JSONB is transitional).
- `marketing-vs-billing-context.md` — Marketing (offers) vs Billing (money) boundary.
- `backfill-exception-report.md` — Batch 4 exception report spec.
- `post-backfill-verification-checklist.md` — Batch 4 acceptance criteria.
- `source-of-truth-completion-matrix.md` — official SoT migration reference.
- `phase-1-architecture-freeze-report.md` — Phase 1 closing document (Database Foundation FROZEN).
- `runtime-validation-checklist.md` — staging/QA checklist for migrations 047–072.
- `phase-2-entry-gate.md` — repository map, order, risk, testing, batch proposal.
- `batch-2a-repository-contracts.md` — repository contracts (v1.0) + perf/evolution notes.
- `phase-3-domain-service-contracts.md` — domain service contracts (Phase 3 entry).
- `domain-event-catalog.md` — official SLE event catalog.
- `domain-service-dependency-graph.md` — service dependency graph + lifecycle execution flow.
- `domain-service-state-ownership.md` — single-writer state ownership matrix.
- `failure-recovery-matrix.md` — operational recovery guide per service.
- `service-observability-plan.md` — logs/metrics/correlation/latency/alerts per service.
- `scheduler-execution-policy.md` — cron frequency, locking, retry, timeout, dead-letter, overlap.
- `correlation-id-standard.md` — official correlation id format + propagation.
- `operational-runbook.md` — production operations & recovery guide.
- `server-client-factory.md` — Supabase client factory + DI infrastructure.
- `infrastructure-ownership-matrix.md` — client ownership, callers, lifecycle, security boundary.
- `privileged-execution-policy.md` — service-role usage rules + security rationale.

ADR-01…ADR-39 are captured in the approved blueprint (chat-of-record) and will
be migrated into this folder as implementation proceeds.

## Phase status
- Phase 1 (Database Foundation, migrations 047–073) — CLOSED / FROZEN.
- Phase 2 (Repositories) — COMPLETE.
- Phase 3 (Domain Services) — COMPLETE (authored; runtime PENDING at staging).
- Phase 4 (Scheduler Wiring + Server Client Factory) — CLOSED (authored; runtime PENDING at staging).
- Phase 5 (Billing Engine) — CLOSED (authored; runtime PENDING). CR-002 & CR-003 APPROVED (formal; not yet implemented).

## Implementation roadmap (10 phases)

1. Database Foundation ← **current**
2. Repositories · 3. Domain Services · 4. Scheduler · 5. Billing & Payment ·
6. Owner Portal · 7. Super Admin Portal · 8. Notifications · 9. Marketing &
Integration · 10. QA & Hardening.
