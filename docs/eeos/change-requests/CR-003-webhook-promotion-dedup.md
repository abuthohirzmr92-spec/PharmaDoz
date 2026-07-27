# CR-003: Webhook dedup + promotion redemption persistence

- **Date:** 2026-07-12
- **Requested by:** EEOS (Phase 5 implementation findings)
- **Layer affected:** Database (new tables + atomic increment) — idempotency & redemption
- **Type:** Change Request
- **Status:** APPROVED (Product Owner) — prepare formal, do not implement yet.

## Reason
Batch 5D/5E proved the frozen schema cannot fully guarantee:
1. **Bulletproof webhook idempotency** for non-success replays and for a crash
   between the first transition and the payment insert (the event-ledger guard
   only covers success paths that emit transitions).
2. **Per-tenant promotion redemption history** and **atomic** redemption
   counting (current `incrementRedeemed` is a racy read-modify-write).

## Impact
- **New tables (migration 075, additive):**
  a. `webhook_deliveries(id, provider, reference, event_type, status,
     received_at, processed_at, UNIQUE(provider, reference))` — dedup key; a
     duplicate delivery is a no-op.
  b. `promotion_redemptions(id, promotion_code, tenant_id, invoice_id,
     redeemed_at, UNIQUE(promotion_code, tenant_id, invoice_id))` — redemption
     history + per-tenant enforcement.
- **Atomic increment:** small RPC `increment_promotion_redemption(code)` (or a
  trigger on `promotion_redemptions`) to replace the racy read-modify-write.
- **Downstream:** `BillingService.recordPayment` dedups by `webhook_deliveries`;
  promotion apply records a redemption row atomically. `PromotionRepository.incrementRedeemed`
  becomes the atomic RPC call.
- **RLS:** super_admin/service_role write; tenant read own redemptions.

## Alternatives
- Continue with event-ledger-only idempotency + counter: rejected — leaves the
  non-success/partial-crash and race windows documented in the Idempotency Policy.
- Store dedup in `payments.metadata`: rejected — no UNIQUE guarantee, not indexable.

## Risk
- Classification: **MEDIUM** (additive tables + one small RPC; no existing-data mutation).
- Zero-downtime: yes (additive). Reversible: `DROP TABLE`/`DROP FUNCTION`.
- Idempotent migration (pola `IF NOT EXISTS`). Rollback: drop new objects; code
  falls back to the event-ledger guard + counter.

## Recommendation
Implement as migration **075_sle_webhook_promotion_dedup.sql** (tables + RLS +
atomic increment RPC), under the standard gate (static + runtime PENDING). Then
wire dedup into `recordPayment` and atomic redemption into the promotion flow.

---
### Product Owner Decision
- [x] Approved — 2026-07-12. Prepare formal CR; do not implement yet.
