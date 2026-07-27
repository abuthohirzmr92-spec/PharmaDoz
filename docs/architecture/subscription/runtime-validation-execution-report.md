# SLE Runtime Validation Execution Report (Step 3)

Generated: 2026-07-13. Report structure: Static results verified by authoring
environment; Runtime results require staging database + live integrations.

## 1. Migration Status
| Migration | File | Purpose | Static | Runtime (staging) |
|-----------|------|---------|--------|-------------------|
| 074 | `074_sle_subscription_transition_v2.sql` | RPC v2: same-state events + expired→active + period param | ✅ authored, idempotent, reversible | ⬜ apply · verify FSM edges · verify renewal · verify reactivation |
| 075 | `075_sle_webhook_promotion_dedup.sql` | webhook_deliveries + promotion_redemptions + atomic RPC | ✅ authored, idempotent, reversible | ⬜ apply · verify dedup · verify concurrent redemption |

**Apply order:** 074 → 075 (074 is independent; 075 depends on tenants/invoices from prior migrations).

## 2. Runtime Checklist (from `runtime-validation-checklist.md` + CR findings)

### Renewal Flow (CR-002)
- [ ] `subscription_transition` with `p_event_type='renewed'`, same-state (active→active), with `p_new_period_end` → lifecycle_state unchanged, event emitted, period extended.
- [ ] Idempotent replay (same correlationId) → no duplicate event.

### Reactivation Flow (CR-002)
- [ ] `expired → active` transition succeeds via RPC.
- [ ] `expired → trial_active` (illegal) is rejected with `illegal_transition`.

### Webhook Deduplication (CR-003)
- [ ] First delivery of provider `midtrans` / reference `INV-TEST-1` → inserts `webhook_deliveries` row, processes payment.
- [ ] Replay of same (provider, reference) → inserts `duplicate` row, payment NOT reprocessed.
- [ ] Concurrent replay → UNIQUE constraint catches both; one wins, other is recorded as duplicate.

### Promotion Redemption (CR-003)
- [ ] `increment_promotion_redemption(code, tenant, invoice, amount)` → inserts redemption row + increments `redeemed_count` atomically.
- [ ] Re-entrant with same (code, tenant, invoice) → UNIQUE violation (safe error).
- [ ] Concurrent increment → counter consistent with redemption row count.

## 3. Cross-cutting Validation
| Area | Static | Runtime (staging) |
|------|--------|-------------------|
| Migrations 047–073 applied | — | ⬜ apply all · verify idempotent re-run |
| Backfill Exception Report `critical=0` | — | ⬜ run backfill scripts · inspect |
| Scheduler subscription_sweep | ✅ code authored | ⬜ cron → sweep → grace→read_only→suspend |
| Scheduler reminder_dispatch | ✅ code authored | ⬜ cron → dispatch due → notification_log |
| Payment webhook end-to-end | ✅ code authored | ⬜ webhook → verify → parse → recordPayment → lifecycle |
| Manual payment flow | ✅ code authored | ⬜ Pay Now → invoice paid → lifecycle |
| Owner Portal (Phase 6) | ✅ build succeeded | ⬜ login owner → navigate /settings/subscription → widgets render |
| Platform Portal (Phase 7) | ✅ build succeeded | ⬜ login super-admin → navigate platform pages |
| Event Ledger consistency | ✅ single writer RPC | ⬜ trace correlationId across transition+payment |
| Correlation Tracking | ✅ code authored | ⬜ scheduler.runId → transition.correlationId → event |

## 4. Known Gaps (honest)
- Runtime validation requires a **staging Supabase instance** with migrations 047–075 applied and `CRON_SECRET` / `SUPABASE_SERVICE_ROLE_KEY` / provider API keys configured.
- Provider live charge (`createPayment` for Flip/Midtrans/Xendit) throws `provider_not_configured` without credentials — this is expected behavior (not a bug).
- Billing trend monitoring (Phase 7E) will populate when invoice/payment data accumulates over time.

## 5. Production Readiness Summary
| Dimension | Status |
|-----------|--------|
| Architecture | 🔒 LOCKED |
| Database | 🧊 FROZEN (047–075, all additive, reversible) |
| Codebase | ✅ TypeScript strict, 186 unit tests, build clean |
| Owner Portal | ✅ Authored, build-verified |
| Platform Portal | ✅ Authored, build-verified |
| Billing Engine | ✅ Authored, provider-neutral, Money Rule enforced |
| Scheduler Wiring | ✅ Authored, idempotent |
| Webhook Infrastructure | ✅ Authored, dedup-ready |
| Runtime (staging) | 🔴 ALL PENDING — requires staging environment |
| Production | 🔴 NOT YET APPROVED |
