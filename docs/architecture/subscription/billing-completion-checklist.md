# Billing Engine — Completion Checklist (Official)

Summary of every Billing Engine capability delivered in Phase 5 (authored;
runtime PENDING at staging). Legend: ✅ implemented · 🟡 runtime-pending · 🔶 gated by an approved CR.

## Invoice
- ✅ Create (draft), status lifecycle (draft→sent→paid→overdue→canceled→refunded) — `InvoiceRepository`.
- ✅ App-generated invoice number (UNIQUE collision-safe).
- ✅ Mark paid on successful payment — `BillingService`.

## Payment
- ✅ Record payments (pending/success/failed/refunded) — `PaymentRepository`.
- ✅ Canonical status mapping (provider→canonical in adapter).
- ✅ Money Rule: amounts computed only in Money layer (`calc.ts`).

## Retry
- ✅ Escalating backoff decision (`decideRetry`, config `payment.retry.*`).
- 🔶 Persistent retry bookkeeping / bulletproof non-success idempotency → **CR-003**.

## Webhook
- ✅ Provider-neutral route `/api/webhooks/payment/[provider]`.
- ✅ Adapter verification (signature/token, fail-closed) + parsing (normalized event).
- ✅ `recordPayment` orchestration (idempotent via correlation id + event ledger).
- 🔶 Dedicated dedup key (`webhook_deliveries`) → **CR-003**.

## Promotion
- ✅ Offer resolution/validity (Marketing) + discount application (Billing, `applyDiscount`).
- ✅ `previewCheckout` (subtotal→discount→total).
- ✅ `incrementRedeemed` (counter; enforces `max_redemptions`).
- 🔶 Per-tenant redemption history + atomic increment → **CR-003**.

## Renewal
- ✅ `computeNextPeriodEnd` (month/quarter/year/lifetime).
- ✅ `extendPeriod` (billing/temporal field).
- 🔶 Same-state `renewed` lifecycle event + reactivation from `expired` → **CR-002**.

## Notification
- ✅ `notifyPaymentReceived` (payment confirmation → `notification_log`).
- 🟡 Real channel delivery (email/WA/push) = Phase 8 adapters.

## Runtime Validation
- 🟡 PENDING: apply migrations in staging; live charge (provider credentials);
  webhook end-to-end; idempotency under real retries.

## Production Readiness
- ✅ Provider-neutral (`PaymentProviderManager`, Flip/Midtrans/Xendit/Manual registered).
- ✅ 138 unit tests green; `tsc`/eslint clean.
- 🔶 CR-002 + CR-003 required before renewal/expired-reactivation and bulletproof
  idempotency are production-complete.
- 🟡 Staging runtime validation + provider certification (see certification policy).
