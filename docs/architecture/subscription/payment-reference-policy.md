# Payment Reference Policy

Three distinct identifiers; Billing's primary business key is always INTERNAL.

| Identifier | Owner | Example | Role |
|-----------|-------|---------|------|
| **Internal Invoice Reference** | BillingService | `invoices.id` (UUID) / `invoice_number` | **Primary business key.** All Billing logic keys off this. |
| **Provider Reference** | Provider adapter | e.g. Midtrans `order_id` (= our invoice_number), Flip `id` | The value we send to / receive from the provider to correlate a charge. |
| **Provider Transaction ID** | Payment provider | gateway's own txn id | External record for reconciliation/support. |

## Rules
- BillingService **never** uses a provider identifier as its primary key. It
  resolves a webhook to an invoice via the internal reference (the provider
  reference maps back to `invoice_number` / `invoices.id`).
- Provider reference / transaction id are stored for **reconciliation only**
  (today inside event/payment metadata; a dedicated column may be proposed via
  CR if reconciliation needs indexing — see Webhook Idempotency Policy).
- Swapping providers must not change any internal business key.

## Correlation
- Webhook processing derives a correlation id `payment:<provider>:<providerRef>`
  used for idempotency (see Webhook Idempotency Policy) — this is an
  **idempotency** key, not a business key.
