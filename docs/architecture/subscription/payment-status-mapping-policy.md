# Payment Status Mapping Policy

## Canonical internal statuses
BillingService consumes ONLY canonical statuses. Provider-specific statuses are
translated **by the provider adapter** — Billing never sees raw provider strings.

**Payment intent (adapter output):** `pending | success | failed | expired`
**Payment record (`payments.status`):** `pending | success | failed | refunded`
**Invoice (`invoices.status`):** `draft | sent | paid | overdue | canceled | refunded`

## Mapping rules
- Adapter (`processWebhook`) maps provider status → canonical **intent** status:
  - Midtrans: settlement/capture→success, pending→pending, expire→expired, deny/cancel/failure→failed
  - Xendit: PAID/SETTLED→success, PENDING→pending, EXPIRED→expired, else failed
  - Flip: SUCCESSFUL→success, PENDING→pending, EXPIRED→expired, FAILED/CANCELLED→failed
- BillingService maps intent → payment record status: success→success, expired/failed→failed, pending→pending. Refund is a Billing action, not a webhook intent.
- Only `success` triggers invoice `paid` + lifecycle activation.

## Rule
No provider status string may appear in BillingService, repositories, or the
database. Translation happens exactly once, in the adapter.
