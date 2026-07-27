# INTEGRATION PATH REPORT — SLE Phase 2 Audit

## 1. Trial Request Flow

```
UI: /platform/trials (page.tsx)
     │ read: trialRequestRepo.listQueue()
     │
     ├─▶ [Review] actions.startReview(id, reviewerId)
     │       → TrialRequestRepository.startReview() → UPDATE trial_requests
     │
     ├─▶ [Approve] actions.approveWithPlan(id, reviewerId, planId, duration, overrides)
     │       → TrialRequestRepository.approve() → UPDATE trial_requests
     │       → (TODO: wire provision_tenant RPC)  ← ⚠️ GAP-001
     │
     └─▶ [Reject] actions.rejectTrial(id, reviewerId, reason)
             → TrialRequestRepository.reject() → UPDATE trial_requests
```

**Status after approval:** TrialRequest status = "approved" · tenant NOT yet provisioned. Provisioning step is a documented TODO (the server action returns `{ok:true}` without calling `provision_tenant`). The `ProvisionTenantService` exists and can resolve the trial plan, but **no code calls it from the approval path**.

## 2. Feature Resolution Flow

```
Package (tenant_packages)
     ↓ packageRepo.getPackageFeatures(packageId)
package_features (DB table — empty post-recovery)
     ↓ FeatureResolver.canAccessFeature(tenantId, featureKey)
permission check (ROLE_PERMISSIONS)
     ↓ UI components (subscription/benefits widgets)
```

**Status:** Fully connected. `package_features` table is empty post-recovery (no seed data), so `FeatureResolver` returns no features for any tenant → UI "Manfaat Paket" shows empty list. **Not a gap in wiring** — seed data is a separate data-migration concern.

## 3. Subscription Lifecycle — Full State Machine

| State | Trigger | Writer | Reader(s) | Event |
|-------|---------|--------|-----------|-------|
| `pending` | TrialRequest form | `trial_requests` INSERT (server route) | `trialRequestRepo.listQueue()` | (intake) |
| `reviewing` | Admin clicks Review | `trialRequestRepo.startReview()` | Platform UI | (intake) |
| `approved` | Admin clicks Approve | `trialRequestRepo.approve()` | Platform UI | (intake) |
| `provisioning` | — | — | — | **GAP-001** — no caller |
| `trial_active` | `provision_tenant` RPC | RPC (026) | `subscriptionRepo.getCurrent()` | `trial_activated` |
| `converted` | `BillingService.recordPayment` | `subscription_transition` RPC | subscriptionRepo | `trial_converted` |
| `active` | Transition RPC | RPC (074) | subscriptionRepo, FeatureResolver | `subscription_created` / `reactivated` |
| `expired` | `SchedulerService.runSubscriptionSweep` | RPC | subscriptionRepo | `expired` |
| `grace_period` | Sweep | RPC | subscriptionRepo | `grace_started` |
| `read_only` | Sweep | RPC | subscriptionRepo | `read_only_started` |
| `suspended` | Sweep / Admin | RPC | subscriptionRepo | `suspended` |
| `archived` | (not wired) | — | — | **GAP-002** — no caller |
| `terminated` | Admin cancel | RPC | subscriptionRepo | `canceled` |

## 4. Billing Flow

```
Subscription (active)
     ↓ createRenewalInvoice() → ⚠️ GAP-003 — NOT IMPLEMENTED
Invoice (draft)
     ↓ sendInvoice() → ⚠️ GAP-003 — NOT IMPLEMENTED
Payment (pending)
     ↓ provider.createPayment() — wired via initiatePayment / webhook
Payment (success via webhook)
     ↓ BillingService.recordPayment() → subscription_transition RPC → ✅
Subscription Transition (converted/reactivated)
     ↓ Invoice update (paid) → ✅
Tenant Status (active)
```

## 5. Promotion Flow

```
Promotion (marketing_promotions)
     ↓ PromotionRepository.resolveValidOffer(code) — ✅
     ↓ BillingService.previewCheckout(amount, code) — ✅ (preview only)
Redemption on payment success
     ↓ incrementRedeemed() — reads current count, writes+1 (RACY) — ⚠️ GAP-004
Atomic RPC
     ↓ increment_promotion_redemption(code,tenant,invoice,amount) — DB EXISTS
       but NO CODE CALLS IT — ⚠️ GAP-004
```

## 6. Webhook Flow

```
Payment Gateway → POST /api/webhooks/payment/[provider]
     ↓ provider.verifyWebhook(payload, headers) — ✅
     ↓ provider.processWebhook(payload) → WebhookEvent — ✅
     ↓ BillingService.recordPayment(provider, event) — ✅
     ↓ Dedup: event-ledger correlationId guard — ✅ (success path)
Deduplication table
     ↓ webhook_deliveries UNIQUE(provider, reference) — DB EXISTS
       but NO CODE INSERTS — ⚠️ GAP-005
```

## 7. Scheduler Flow

```
Vercel Cron (vercel.json)
     ↓ /api/cron/subscription-sweep — ✅ wired
     │   → SchedulerService.runSubscriptionSweep() — ✅
     ↓ /api/cron/reminder-dispatch — ✅ wired
     │   → SchedulerService.runReminderDispatch() — ✅
     ↓ /api/cron/autorenew — ❌ NOT WIRED — ⚠️ GAP-006
         → no service method · no route handler · no cron entry
```

## 8. Repository Layer

All SLE repositories (Subscription, Invoice, Payment, Promotion, TrialRequest, Reminder, Quota, ServiceCatalog, SchedulerRun, IntegrationRegistry, Addon) extend `BaseRepository`. They use `this.client` (injected or module singleton). **No repository references a non-existent table.** No repository calls another repository.

## 9. RPC Layer

| RPC | Callers (code) | Status |
|-----|----------------|--------|
| `provision_tenant` | `provisioning.ts` (server action) | ✅ Wired |
| `subscription_transition` (13 param) | `subscriptionRepo.transition()`, `subscriptions/actions.ts` | ✅ Wired |
| `increment_promotion_redemption` | **NONE** | ⚠️ Not wired (DB only) |

## 10. Event Flow — `subscription_events`

| Writer | Method | Single Writer? |
|--------|--------|:---:|
| `subscription_transition` RPC (074) | INSERT inside RPC | ✅ |
| `superAdminRepo.suspendSubscription` | Direct `.from("subscription_events").insert()` | ⚠️ **Violation** |
| `superAdminRepo.reactivateSubscription` | Direct INSERT | ⚠️ **Violation** |
| `superAdminRepo.cancelSubscription` | Direct INSERT | ⚠️ **Violation** |
| `superAdminRepo.changeSubscription` | Direct INSERT | ⚠️ **Violation** |
| `packageRepo.logSubscriptionEvent` | Direct INSERT | ⚠️ **Violation** |
| `provision_tenant` RPC (072) | INSERT inside RPC | ✅ |
| `subscriptionRepo.getTimeline` | SELECT (read) | — |
| `subscriptionRepo.existsEventByCorrelation` | SELECT (read) | — |
| `superAdminRepo.getSubscriptionHistory` | SELECT (read) | — |
| `packageRepo.getSubscriptionEvents` | SELECT (read) | — |

**6 locations perform direct INSERT bypassing the Single Writer RPC.**
