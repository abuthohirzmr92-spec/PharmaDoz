# Webhook Ownership Matrix

A single owner per responsibility in the payment webhook flow. The webhook route
is the **composition root** — it orchestrates owners; it does not itself contain
business logic.

| Responsibility | Single Owner | Notes |
|----------------|--------------|-------|
| **Webhook Verification** (signature/token) | **PaymentProvider (adapter)** | `verifyWebhook()`; secret from config; fail-closed |
| **Webhook Parsing** (→ normalized event) | **PaymentProvider (adapter)** | `processWebhook()`; provider-specific → `{ reference, status, invoiceId }` |
| **Payment Recording** | **BillingService** | writes `payments` via PaymentRepository; idempotent by provider reference |
| **Invoice Update** (paid/overdue/refunded) | **BillingService** | Money Rule; via InvoiceRepository |
| **Subscription Update** (renew/reactivate) | **SubscriptionLifecycleService** | transition RPC; Billing requests, Lifecycle owns |
| **Notification** | **ReminderService / NotificationService** | payment confirmation; channel-agnostic |

## Flow (webhook)
```
POST /api/webhooks/payment/[provider]        (composition root — no business logic)
  → provider.verifyWebhook(payload, headers)         [adapter]  → 401 if not verified
  → provider.processWebhook(payload) → event         [adapter]
  → BillingService.recordPayment(event)              [Billing]   (Batch 5E)
       → InvoiceRepository.updateStatus(paid)         [Billing]
       → SubscriptionLifecycleService.renew/reactivate[Lifecycle]
       → ReminderService (payment confirmation)       [Reminder]
  → 200 ack
```

## Rules
- The route never verifies signatures itself, never parses provider payloads,
  never writes money — it delegates to the owners above.
- Recording is **idempotent**: a duplicate webhook for the same provider
  reference is a no-op (dedup by reference).
- Batch 5C implements verification + parsing + the route (ack). Recording &
  downstream orchestration land in Batch 5E (BillingService).
