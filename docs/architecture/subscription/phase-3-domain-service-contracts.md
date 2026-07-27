# Phase 3 — Domain Service Contracts

Contracts only. No implementation until Product Owner approval opens Phase 3.
Services orchestrate repositories (Phase 2) per the Repository Boundary Policy:
services may use many repositories and may call other services; repositories
never orchestrate and never call each other.

Runtime remains PENDING (staging). Database FROZEN.

---

## 1. ProvisionTenantService

- **Responsibility:** Orchestrate trial approval → tenant provisioning → initial scheduling. Turns an approved `trial_request` into a live trial tenant.
- **Public operations:**
  - `provisionFromTrial(trialRequestId, actorId): Promise<{ tenantId; subscriptionId }>`
  - `provisionDirect(input): Promise<{ tenantId; subscriptionId }>` (super-admin manual)
- **Repository dependencies:** TrialRequestRepository (read/approve state), + calls the `provision_tenant` RPC (atomic DB tx); post-RPC uses ReminderService.
- **Transaction boundary:** the `provision_tenant` RPC is a single atomic DB transaction (all-or-nothing). Post-RPC steps (reminder scheduling) are **best-effort with compensation logging** — a failure there does not roll back the tenant.
- **Failure strategy:** RPC failure → surface error; auth-user compensation handled by the calling server action (as today). Post-RPC failures are logged, not fatal.
- **Produced events:** `TenantProvisioned`, `SubscriptionActivated` (trial), `QuotaInitialized`.
- **Consumed events:** `TrialApproved`.
- **Unit test strategy:** mock TrialRequestRepository + RPC; assert approve→RPC ordering; assert post-RPC failure is non-fatal; assert produced events.
- **Risk:** **HIGH** (touches live provisioning RPC).

## 2. SubscriptionLifecycleService

- **Responsibility:** The FSM engine. Owns all lifecycle transitions and derives Tenant access-gate status. Single mutator of `lifecycle_state`.
- **Public operations:** `activateTrial`, `convertToPaid`, `upgrade`, `downgrade`, `renew`, `expire`, `enterGrace`, `enterReadOnly`, `suspend`, `archive`, `reactivate`, `cancel` — each `(subscriptionId, ctx) → Promise<void>`.
- **Repository dependencies:** SubscriptionRepository (transition + events), SettingsRepository (grace/read-only/suspend timings), QuotaRepository (limit re-eval on package change); composes ReminderService.
- **Transaction boundary:** **REQUIRED** — each transition (UPDATE lifecycle_state + INSERT event) runs in ONE DB transaction via a Phase-3 RPC (resolves the Batch-2B atomicity limitation).
- **Failure strategy:** reject invalid transitions (FSM guard); idempotent (re-applying a transition to the same state is a no-op); event append is part of the atomic RPC.
- **Produced events:** `SubscriptionActivated`, `SubscriptionRenewed`, `SubscriptionUpgraded`, `SubscriptionDowngraded`, `SubscriptionExpired`, `SubscriptionSuspended`, `SubscriptionReadOnly`, `SubscriptionArchived`, `SubscriptionCanceled`.
- **Consumed events:** `PaymentReceived` (→ reactivate/renew), `TrialExpired` (→ grace).
- **Unit test strategy:** pure FSM transition table (allowed/blocked); mock RPC; timing derivation from config; idempotency.
- **Risk:** **MEDIUM–HIGH** (core state machine; access-gate correctness).

## 3. BillingService

- **Responsibility:** Money. Invoice generation, proration, promotion application (offer already validated by Marketing), payment recording via provider adapter.
- **Public operations:** `createUpgradeInvoice(tenantId, toPackageId, offer?)`, `recordPayment(webhookEvent)`, `retryPayment(paymentId)`, `applyValidatedOffer(invoiceDraft, offer)`.
- **Repository dependencies:** InvoiceRepository, PaymentRepository (Phase 5), PromotionRepository (validated offer), SubscriptionRepository (read); composes SubscriptionLifecycleService on payment success.
- **Transaction boundary:** **REQUIRED** for invoice+payment writes (RPC/transaction). Provider calls are outside the DB tx (external).
- **Failure strategy:** payment retry `24h → 72h → 168h → manual_review` (config `payment.retry.*`); invoice never deleted (canceled only).
- **Produced events:** `InvoiceCreated`, `PaymentReceived`, `PaymentFailed`.
- **Consumed events:** `SubscriptionUpgradeRequested`, `RenewalDue`.
- **Unit test strategy:** pure proration; retry-schedule computation; offer application math; mock provider adapter.
- **Risk:** **HIGH** (money; external provider). Implementation is Phase 5 — contract here only.

## 4. ReminderService

- **Responsibility:** Decide WHICH reminders to schedule and dispatch due ones; delegate channel delivery to NotificationService. Channel-agnostic.
- **Public operations:** `scheduleForSubscription(subscriptionId)`, `dispatchDue(nowISO)`.
- **Repository dependencies:** ReminderRepository, SettingsRepository (`reminder.schedule`, `reminder.channels`); composes NotificationService (channel adapters).
- **Transaction boundary:** `NONE` per reminder (independent rows); dispatch marks status per row.
- **Failure strategy:** per-reminder retry (`max_retries`, `retry_interval_minutes`); failures logged to `notification_log`; never blocks lifecycle.
- **Produced events:** `ReminderScheduled`, `ReminderSent`, `ReminderFailed`.
- **Consumed events:** `SubscriptionActivated`, `SubscriptionExpiringSoon`, `SubscriptionReadOnly`.
- **Unit test strategy:** schedule computation from config; due-selection (pure `isReminderDue`); retry escalation; channel adapter mocked.
- **Risk:** **LOW–MEDIUM** (non-critical path; isolated).

## 5. SchedulerService

- **Responsibility:** Cron entrypoints (Vercel Cron). Idempotent per (job, day); orchestrates lifecycle sweeps, reminder dispatch, auto-renewal.
- **Public operations:** `runSubscriptionSweep(runDate)`, `runReminderDispatch(runDate)`, `runAutorenew(runDate)`.
- **Repository dependencies:** SchedulerRunRepository (idempotency); composes SubscriptionLifecycleService, ReminderService, BillingService.
- **Transaction boundary:** per-item (each affected subscription transitions atomically via the lifecycle RPC); the run itself is recorded start→finish.
- **Failure strategy:** at-least-once + idempotency guard (`startRun` returns null if already ran); per-item errors collected into `scheduler_runs.errors`; one item failure does not abort the batch.
- **Produced events:** (delegates) `SubscriptionExpired`, `SubscriptionSuspended`, `ReminderSent`.
- **Consumed events:** none (time-triggered).
- **Unit test strategy:** idempotency (double-run no-op); per-item isolation on failure; config-driven timing.
- **Risk:** **MEDIUM** (batch correctness; idempotency).
