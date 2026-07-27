# Billing Ownership Matrix

The **Money Rule**: only **BillingService** may own and modify monetary state.
Repositories persist; they never calculate money. Payment gateways move money;
they never calculate it. Money math exists in exactly one place: BillingService
(+ its pure helpers in `src/lib/billing/`).

| Business state | Single Owner | Backing store | May read | Never allowed to modify it |
|----------------|--------------|---------------|----------|----------------------------|
| **Invoice total / discount / tax / proration** | **BillingService** | computed → `invoices.amount` | Owner portal, Platform | Repositories, Gateway, Promotion, Scheduler |
| **Outstanding balance** | **BillingService** | derived (total − paid) | Owner portal | anyone else |
| **Invoice status** (`draft…refunded`) | **BillingService** | `invoices.status` | Owner, Platform | Scheduler, Lifecycle, Gateway |
| **Payment status** (`pending…refunded`) | **BillingService** | `payments.status` | Owner, Platform | Lifecycle, Scheduler |
| **Refund** | **BillingService** | `invoices`/`payments` | Platform | Gateway (executes, does not decide amount) |
| **Renewal billing decision** | **BillingService** | invoice creation | Scheduler (triggers, does not compute) | Scheduler, Lifecycle |
| **Subscription lifecycle_state / access** | **SubscriptionLifecycleService** | `subscriptions` + ledger (RPC) | Billing (reads) | Billing, Scheduler (they request, not write) |
| **Promotion offer / validity** | **PromotionRepository (Marketing)** | `marketing_promotions` | BillingService | BillingService (consumes validated offer; never edits promo) |
| **Discount amount applied to an invoice** | **BillingService** | `invoices.amount` | — | PromotionRepository (provides offer only) |
| **Reminder schedule / dispatch** | **ReminderService** | `reminders`/`notification_log` | — | Billing, Scheduler (compose, not own) |
| **Provider selection** | **PaymentProviderManager** | config (`payment.providers.*`) | BillingService | BillingService (asks manager; never selects) |

## Boundary statements (Money Rule, explicit)
- Repositories **never** calculate money — they store amounts computed by BillingService.
- Payment Gateway **never** calculates money — it charges the amount BillingService set.
- PromotionRepository **never** calculates invoices — it validates/returns an offer; BillingService applies the discount.
- Scheduler **never** updates invoices — it triggers `BillingService.createRenewalInvoice()`; Billing computes and writes.
- SubscriptionLifecycleService **never** calculates payments — payment success is reported to it (`renew`/`reactivate`), it only transitions state.

## Consequence
Every monetary figure in the system traces to exactly one code path
(BillingService + `src/lib/billing/` helpers), making billing auditable,
testable, and safe to evolve.
