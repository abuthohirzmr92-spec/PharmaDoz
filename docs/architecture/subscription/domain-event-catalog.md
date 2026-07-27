# SLE Domain Event Catalog (Official)

The event ledger (`subscription_events`, append-only) is the persistence backing
for lifecycle events. Domain events below drive service orchestration; those
that persist map to a `subscription_events.event_type` (expanded in migration
071). Payloads follow the Audit Metadata Schema v1 (`schema_version:1`).

Legend — **Idempotency**: how a duplicate is neutralized. **Retry**: on failure.
**Ordering**: whether strict ordering matters.

| Event | Producer | Consumer(s) | Payload (key fields) | Idempotency Rule | Retry Policy | Ordering |
|-------|----------|-------------|----------------------|------------------|--------------|----------|
| **TrialApproved** | TrialRequestRepository (via super-admin action) | ProvisionTenantService | trialRequestId, planId, durationDays, resourceOverrides, actorId | trial_requests.status guard (approve only from pending/reviewing) | n/a (user action) | before Provisioned |
| **TenantProvisioned** | ProvisionTenantService (provision_tenant RPC) | ReminderService, Analytics | tenantId, subscriptionId, packageId, actorId | RPC validates slug uniqueness; tenant created once | none (atomic RPC) | first in a tenant's stream |
| **SubscriptionActivated** | SubscriptionLifecycleService / provision | ReminderService, Analytics | subscriptionId, tenantId, type(trial/paid), packageId | event_type='trial_activated'/'subscription_created'; guard lifecycle_state | none (in transition RPC) | after Provisioned |
| **QuotaInitialized** | ProvisionTenantService | — (read model) | tenantId, seeded {users,branches} | ON CONFLICT(tenant_id,resource_key) DO NOTHING | none | after Provisioned |
| **ReminderScheduled** | ReminderService | SchedulerService (later dispatch) | reminderId, tenantId, subscriptionId, kind, scheduledFor, channels | dedupe by (subscription_id, kind) | none | independent |
| **InvoiceCreated** | BillingService | Owner Portal, PaymentProvider | invoiceId, tenantId, subscriptionId, amount, currency | invoice_number UNIQUE | none | before PaymentReceived |
| **PaymentReceived** | BillingService (webhook) | SubscriptionLifecycleService (reactivate/renew), Analytics | paymentId, invoiceId, tenantId, amount, provider, txnRef | payments idempotency by provider txnRef; webhook verify | provider webhook retries; internal none | after InvoiceCreated |
| **PaymentFailed** | BillingService | BillingService (retry), Reminder | paymentId, attempt, reason | attempt_count guard | 24h→72h→168h→manual_review (config) | n/a |
| **SubscriptionRenewed** | SubscriptionLifecycleService | Reminder, Analytics | subscriptionId, newPeriodEnd | transition RPC (idempotent) | none | monotonic per subscription |
| **SubscriptionUpgraded / Downgraded** | SubscriptionLifecycleService | Quota (re-eval), Analytics | subscriptionId, previousPackageId, newPackageId | transition RPC; previous/new package recorded | none | strict per subscription |
| **SubscriptionExpired** | SchedulerService → LifecycleService | Reminder, Analytics | subscriptionId, expiredAt | idempotent (only from active/trial states) | scheduler at-least-once + guard | after period_end |
| **SubscriptionReadOnly** | SchedulerService → LifecycleService | Reminder, access gate | subscriptionId, readOnlyAt | guard from grace_period only | idempotent | after grace |
| **SubscriptionSuspended** | SchedulerService → LifecycleService | access gate, Reminder | subscriptionId, suspendedAt | guard from read_only/grace | idempotent | after read-only |
| **SubscriptionArchived** | SchedulerService → LifecycleService | Analytics | subscriptionId | guard from suspended | idempotent | terminal-ish |
| **SubscriptionCanceled** | LifecycleService (owner/admin) | Billing, Reminder | subscriptionId, cancelAtPeriodEnd | flag idempotent | none | any paid state |
| **PromotionApplied** | BillingService | Analytics | invoiceId, promotionCode, discount | promotion_redemptions (Phase 5) unique per (promo,invoice) | none | at checkout |

## General Rules

- **Persistence:** lifecycle events append exactly one `subscription_events` row
  inside the transition RPC (single audit source of truth — no duplicate tables).
- **Idempotency baseline:** every scheduler-driven event is guarded by a state
  precondition; re-emitting from the same state is a no-op.
- **Retry baseline:** external/money paths use the configured backoff; internal
  transitions rely on idempotency, not retry.
- **Ordering baseline:** ordering matters *within a single subscription's stream*
  (guaranteed by `created_at` + FSM guards); cross-subscription ordering is
  irrelevant.
