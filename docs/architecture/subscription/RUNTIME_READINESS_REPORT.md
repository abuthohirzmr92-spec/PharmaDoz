# RUNTIME READINESS REPORT — SLE Phase 2

Post-recovery readiness assessment per subsystem. Status reflects whether the
subsystem's code paths are fully wired end-to-end against the recovered database.

## Readiness Matrix

| Subsystem | Status | Detail |
|-----------|:------:|--------|
| **Database** | 🟢 Ready | All tables, FKs, RLS, CHECKs, indexes verified present |
| **RPC — provision_tenant** | 🟢 Ready | Function present (v2 from 072), wired via `provisioning.ts` |
| **RPC — subscription_transition** | 🟢 Ready | Single 13-param function (074), wired via `subscriptionRepo.transition()` and `subscriptions/actions.ts` |
| **RPC — increment_promotion_redemption** | 🟡 Partial | Function present (075) but **no code calls it yet** — old racy method still used |
| **Repository Layer** | 🟢 Ready | All repos extend BaseRepository, query existing tables, return correct types |
| **Subscription Lifecycle** | 🟢 Ready | FSM wired via RPC for active states; `suspended→archived` (GAP-002) not scheduled |
| **Scheduler — sweep** | 🟢 Ready | Cron → handler → SchedulerService → RPC — fully wired |
| **Scheduler — reminder** | 🟢 Ready | Cron → handler → ReminderService → dispatch — wired (channels = stub) |
| **Scheduler — autorenew** | 🔴 Missing | No cron, no handler, no service method (GAP-006) |
| **Billing — payment recording** | 🟢 Ready | Webhook → verify → parse → recordPayment → lifecycle — wired |
| **Billing — invoice creation** | 🔴 Missing | `createRenewalInvoice` and `createUpgradeInvoice` not implemented (GAP-003) |
| **Billing — renewal period** | 🔴 Missing | `computeNextPeriodEnd` + `extendPeriod` exist but unwired (GAP-003) |
| **Promotion — offer resolution** | 🟢 Ready | `resolveValidOffer` + `previewCheckout` — wired |
| **Promotion — redemption** | 🟡 Partial | RPC exists but unwired; old racy method still used (GAP-004) |
| **Webhook — verify/parse** | 🟢 Ready | Provider adapters (Manual/Flip/Midtrans/Xendit) — wired |
| **Webhook — deduplication** | 🟡 Partial | Event-ledger guard for success; `webhook_deliveries` table exists but unwired (GAP-005) |
| **Trial — intake** | 🟢 Ready | TrialRequestRepo + queue page — wired |
| **Trial — provisioning** | 🔴 Missing | Approval does NOT trigger provisioning (GAP-001) |
| **Feature Resolver** | 🟢 Ready | Query path valid; `package_features` empty post-recovery (no seed) — cosmetic |
| **Owner Portal** | 🟢 Ready | 6-tab portal, build verified, widgets read correct tables |
| **Platform Portal** | 🟢 Ready | Nav groups, dashboard KPI, trial desk, subscriptions, tenants — build verified |

## Summary

| Status | Count |
|--------|:----:|
| 🟢 Ready | 16 |
| 🟡 Partial | 4 |
| 🔴 Missing | 4 |

**24 subsystems assessed. 16 fully wired, 8 have gaps (4 critical, 4 medium).**

## Critical Path to Production

1. **GAP-001** (Trial→Provision wiring) — blocks trial intake flow
2. **GAP-003** (Renewal invoice creation) — blocks renewal billing
3. **GAP-006** (Autorenew scheduler) — blocks automated renewals
4. **GAP-004** (Promotion atomic) — data integrity risk
5. **GAP-005** (Webhook dedup) — idempotency gap for non-success paths
6. **GAP-002** (Suspended→Archived) — deferred (manual transition acceptable)

## Recommendation

**Do NOT open new phases** until GAP-001, GAP-003, GAP-006 are resolved.
GAP-004 and GAP-005 are strongly recommended before production web traffic.
GAP-002 can be deferred.

No database changes required — all gaps are application-wiring issues.
