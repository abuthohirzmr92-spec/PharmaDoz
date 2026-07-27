# Payment Timeline Policy

The canonical, ordered timeline of a payment. Dashboards, audit logs, and
activity feeds MUST render this sequence (sourced from `invoices`, `payments`,
and `subscription_events`).

```
Invoice Created        invoices row (draft)                          [BillingService]
   ↓
Payment Pending        payments row (pending) / provider intent       [BillingService + Provider]
   ↓
Webhook Received       provider → /api/webhooks/payment/[provider]    [route + adapter verify]
   ↓
Payment Recorded       payments row (success)                         [BillingService.recordPayment]
   ↓
Invoice Paid           invoices.status = paid, paid_at                [BillingService]
   ↓
Subscription Activated subscription_events (trial_converted/reactivated/…), lifecycle_state → active  [Lifecycle RPC]
   ↓
Notification Sent      notification_log (payment_received)            [ReminderService]
```

## Sourcing (single source per step)
- Invoice steps → `invoices` (status + timestamps).
- Payment steps → `payments`.
- Activation → `subscription_events` (the ledger; correlation_id ties it to the payment).
- Notification → `notification_log`.

## Rules
- Timeline is reconstructable from persisted records — no separate timeline table.
- Ordering within a single payment is guaranteed by `created_at` + the
  correlation id linking payment → activation events.
- Idempotent replays do not add duplicate timeline entries.
