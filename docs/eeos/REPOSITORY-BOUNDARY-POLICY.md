# Repository Boundary & Dependency Policy (EEOS Official)

Applies to all repositories from Phase 2 onward.

## 1. Orchestration Boundary

**Repositories are persistence components only.** They read/write their own
tables and expose typed methods + pure helpers. They MUST NOT orchestrate
business workflows and MUST NOT call other repositories.

Business workflows belong to **Domain Services / Orchestrators**, which compose
repositories.

### Intended orchestration flow (example: Approve Trial)

```
Approve Trial (Super Admin action)
   ↓
TrialRequestRepository.approve()          ← persistence: mark approved + overrides
   ↓
ProvisionTenantService (orchestrator)     ← calls provision_tenant RPC
   ↓
SubscriptionRepository (create/transition)← persistence: subscription + event
   ↓
QuotaRepository (initialize usage)         ← persistence: tenant_quota_usage seed
   ↓
ReminderService.schedule()                 ← domain service
   ↓
NotificationService.dispatch()             ← domain service (channel adapters)
```

- Each repository does exactly one persistence job.
- The **orchestrator** owns sequence, transaction span, compensation/rollback,
  and cross-aggregate rules.
- Repositories **never** import or invoke one another.

## 2. Dependency Rules

A repository MAY depend on:
- `BaseRepository`
- Shared domain types (`@/types`)
- Database types (`@/lib/supabase/database`)
- Pure utility functions (`mapRow`, date/string utils)

A repository MUST NOT depend on:
- Other repositories
- UI components / React hooks
- Feature pages
- Scheduler
- Billing
- Notification / Reminder services

If cross-repository coordination is needed, it happens in a **Domain Service**,
not inside a repository.

### Note on FeatureResolver
`FeatureResolver` (`src/lib/features/resolver.ts`) is a **resolver/domain-ish**
component, not a table repository. Its Phase-2 enhancement queries the database
directly (it does NOT import `ServiceCatalogRepository`), so the no-repo→repo
rule is preserved. When service-catalog resolution is fully wired, it will be
composed by a domain service or read directly — never repo-to-repo.

## 3. Verification

- `src/lib/repositories/*` files import only `./base` (+ types). Enforced by
  review; a lint rule may be added later.
- Current status (Phase 2A/2B): all SLE repositories extend `BaseRepository`
  only — **compliant**.
