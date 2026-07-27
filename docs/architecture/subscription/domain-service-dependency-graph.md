# Domain Service Dependency Graph (Phase 3)

Rules (from Repository Boundary & Dependency Policy):
- Services MAY use multiple repositories.
- Services MAY orchestrate other services where appropriate.
- Repositories MUST NEVER orchestrate services.
- Repositories MUST NEVER call repositories.

## Dependency Graph

```
                         ┌────────────────────────┐
                         │    SchedulerService     │  (Vercel Cron entrypoints)
                         │  uses: SchedulerRunRepo  │
                         └───────┬─────────┬────────┘
                    orchestrates │         │ orchestrates
              ┌──────────────────┘         └───────────────┐
              ▼                                             ▼
   ┌──────────────────────────┐               ┌─────────────────────────┐
   │ SubscriptionLifecycle    │◀──────────────│     BillingService       │
   │ Service                  │  PaymentReceived│  (Phase 5)             │
   │ uses: SubscriptionRepo,  │  → reactivate/  │  uses: InvoiceRepo,     │
   │ SettingsRepo, QuotaRepo  │    renew        │  PaymentRepo,           │
   │ orchestrates: Reminder   │                 │  PromotionRepo,         │
   └───────┬──────────────────┘                 │  SubscriptionRepo(read) │
           │ orchestrates                        │  orchestrates: Lifecycle│
           ▼                                     └─────────────────────────┘
   ┌──────────────────────────┐
   │     ReminderService      │───▶ NotificationService (channel adapters, Phase 8)
   │ uses: ReminderRepo,      │
   │ SettingsRepo             │
   └──────────────────────────┘

   ┌──────────────────────────┐
   │ ProvisionTenantService   │  uses: TrialRequestRepo + provision_tenant RPC
   │ orchestrates: Reminder   │  (RPC internally seeds Subscription + Quota atomically)
   └──────────────────────────┘

REPOSITORIES (leaf — persistence only; never orchestrate, never call each other):
  SubscriptionRepo · TrialRequestRepo · QuotaRepo · SettingsRepo · ServiceCatalogRepo
  · AddonRepo · PromotionRepo · ReminderRepo · IntegrationRegistryRepo · SchedulerRunRepo
```

## Allowed service→service edges
- Scheduler → Lifecycle, Reminder, Billing
- Lifecycle → Reminder
- Billing → Lifecycle
- Provision → Reminder

No cycles: Billing→Lifecycle and Lifecycle→Reminder do not loop back to Billing.
(PaymentReceived is an event consumed by Lifecycle, not a synchronous
Lifecycle→Billing call.)

## Main Subscription Lifecycle — Intended Execution Flow

```
TRIAL INTAKE
  Super Admin approves → TrialRequestRepository.approve()
    → ProvisionTenantService.provisionFromTrial()
        → provision_tenant RPC (atomic): tenant + subscription(trial_active)
          + tenant_quota_usage seed + subscription_events(trial_activated)
        → ReminderService.scheduleForSubscription()  [best-effort]

TRIAL → PAID (conversion via checkout)
  Owner upgrades → BillingService.createUpgradeInvoice() [proration + validated offer]
    → PaymentProvider (external) → webhook → BillingService.recordPayment()
        → SubscriptionLifecycleService.convertToPaid()/upgrade() [transition RPC]
        → ReminderService (confirmation)

RENEWAL / EXPIRY (time-driven)
  Vercel Cron → SchedulerService.runSubscriptionSweep(runDate)
    → SchedulerRunRepository.startRun() [idempotency guard]
    → for each due subscription (config timings from SettingsRepository):
        active → expire → grace_period → read_only → suspended → archived
        via SubscriptionLifecycleService.<transition>() [transition RPC each]
    → SchedulerService.runReminderDispatch() → ReminderService.dispatchDue()
    → SchedulerService.runAutorenew() → BillingService (attempt) → on success
        SubscriptionLifecycleService.renew()
    → SchedulerRunRepository.finishRun()

REACTIVATION
  PaymentReceived (webhook) → BillingService.recordPayment()
    → SubscriptionLifecycleService.reactivate() → status back to active
```

## Transaction ownership
- The **transition RPC** (Phase 3) owns atomicity of `lifecycle_state` + event.
- The **provision_tenant RPC** owns atomicity of tenant creation.
- Services own **sequence, compensation, and cross-aggregate rules**; repositories
  own single-table persistence only.
