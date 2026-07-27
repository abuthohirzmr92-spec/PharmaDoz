# Phase 5 — Billing Service Contract Discovery

Application-implementation mode. Reuse-first over the frozen schema. Anything
needing new DB objects is flagged as a **Change Request** (DB FROZEN).

## Reuse inventory (already exists)
- `invoices` table (migration 033): status `draft|sent|paid|overdue|canceled|refunded`, `invoice_number UNIQUE`, amount, due_date, paid_at, payment_method.
- `payments` table (migration 009): status `pending|success|failed|refunded`, amount, payment_method, paid_at.
- `PaymentGateway` interface + `ManualGateway` (`lib/billing/gateway.ts`) — the provider abstraction; ManualGateway is adapter #1.
- `packageRepo.createInvoice()` / `updateInvoiceStatus()` — invoice persistence.
- `PromotionRepository` (offers/validity), `SubscriptionLifecycleService` (renew/reactivate via transition RPC), `SettingsRepository` (`payment.retry.*`, `billing.*`, `payment.providers.*`).
- `subscription_events` types already allow `payment_received`, `promotion_applied`.

---

## 1. Invoice Lifecycle
```
draft ──send──▶ sent ──pay──▶ paid
  │               │
  │               └──due passed──▶ overdue ──pay──▶ paid
  └──void──▶ canceled          paid ──refund──▶ refunded
```
Owner of invoice state: **BillingService** (State Ownership Matrix). Transitions are simple status updates (no cross-aggregate atomicity) except **paid → orchestrate lifecycle**.

## 2. BillingService (contract)
- **Responsibility:** money — invoices, proration, discount application (validated offer), payment recording, retry, renewal.
- **Public operations:**
  - `createUpgradeInvoice(tenantId, subscriptionId, toPackageId, offerCode?)` → draft invoice (prorated, discounted).
  - `createRenewalInvoice(subscriptionId)` → draft for next period.
  - `sendInvoice(invoiceId)` → status `sent` (+ provider charge intent).
  - `recordPayment(webhookOrManual)` → payments row + on success mark invoice `paid` + orchestrate lifecycle (`convert`/`renew`/`reactivate`).
  - `retryPayment(paymentId)` → per `payment.retry.*`.
  - `markOverdue(nowISO)` / `refund(invoiceId)`.
- **Repository deps:** InvoiceRepository (new, thin — or reuse packageRepo invoice methods), PaymentRepository (new), PromotionRepository, SubscriptionLifecycleService (compose).
- **Transaction boundary:** invoice status update + payments insert should be atomic on payment success → candidate for a small RPC OR two-step with idempotency by provider txn ref. Lifecycle transition is already atomic via its RPC.
- **Pure helpers (unit-testable, no DB):** `computeProration(oldPrice, newPrice, daysUsed, periodDays)`, `applyDiscount(amount, offer)`, `computeRetrySchedule(attempt, backoffHours[])`, `deriveInvoiceStatus(...)`.
- **Risk:** HIGH (money + external provider).

## 3. Payment Provider Abstraction
- Reuse `PaymentGateway` interface. Clarify separation: **BillingService owns invoice creation**; the provider owns **charge / status / webhook / refund**. (The existing interface conflates `createInvoice` — Phase 5 will keep Billing as invoice owner and use the provider for charge/webhook.)
- Adapters: `ManualGateway` (exists) · `MidtransAdapter` (Phase-5 impl target) · Xendit/Flip/Stripe (stub).
- Provider selection: `payment.providers.active` (config) + `integrations` registry (`category='payment'`).
- Webhook route: `/api/webhooks/payment` (Phase 5) → verify → `BillingService.recordPayment`.

## 4. Renewal Orchestration (flow)
```
SchedulerService.runAutorenew(runDate)  (Phase 4 slot, wire in Phase 5)
  → for subscriptions with auto_renew && period ending:
      BillingService.createRenewalInvoice() → sendInvoice() → provider charge
      → webhook → recordPayment(success)
        → SubscriptionLifecycleService.renew()  (transition RPC; extends period)
      → on fail → retry schedule → grace (existing sweep handles lapse)
```

## 5. Billing Events
- `InvoiceCreated` → **invoices** table is its own SoT (not necessarily in `subscription_events`).
- `PaymentReceived` → `subscription_events` `payment_received` (allowed) + drives lifecycle.
- `PromotionApplied` → `subscription_events` `promotion_applied` (allowed) + `promotion_redemptions` (see CR).
- `PaymentFailed` → recorded in `payments` + retry; **not** in `subscription_events` (event_type not in CHECK 071).

---

## DB sufficiency (Change Requests DEFERRED — prefer implementation)
Per Product Owner policy, **no Change Request is prepared up front.** We implement
on the frozen schema and only raise a CR **after** implementation proves the
schema insufficient.

Implementable **now on the frozen schema** (no CR): invoice create/send/overdue/
refund (existing columns), proration & discount math (pure), provider adapters,
webhook route, renewal wiring, `payment_received`/`promotion_applied` events,
app-generated invoice numbers via `invoice_number UNIQUE` collision-retry.

Areas to **watch** (only escalate to a CR if implementation actually hits a wall):
retry bookkeeping on `payments`, promotion-redemption recording, atomic
invoice+payment write. First attempt to satisfy these with existing columns /
`metadata` JSONB / idempotency before proposing schema changes.

## Provider neutrality (PaymentProviderManager)
- `BillingService → PaymentProviderManager → PaymentGateway (interface) → adapter`.
- BillingService **never** selects a provider; the manager selects per config
  (`payment.providers.active`, priority). Adding a provider = new adapter +
  registration; **BillingService unchanged**.
- First-class adapters: **Manual, Flip, Midtrans, Xendit** (Flip is primary,
  not optional). Stripe/Tripay/Duitku/DOKU = future plugins.
- **Provider ≠ Payment Method.** A provider exposes methods (QRIS, VA, bank
  transfer, e-wallet, card); method availability is a provider capability.

## Proposed Phase 5 batch order
- **5A (no CR):** InvoiceRepository + PaymentRepository (thin, over existing tables) + pure billing helpers (proration/discount/retry/outstanding) + unit tests.
- **5B:** retry engine + promotion redemption (satisfy on frozen schema first).
- **5C:** PaymentProviderManager + adapters (Manual/Flip/Midtrans/Xendit) + `/api/webhooks/payment` + `recordPayment` orchestration.
- **5D:** renewal wiring (`runAutorenew`) + billing events.
