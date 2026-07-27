# INTEGRATION GAP REPORT — SLE Phase 2 Audit

6 gaps identified. All are code-not-yet-wired (no DB/schema blockers). Listed by severity.

---

## GAP-001: Trial Approval → Provisioning NOT wired

| Field | Detail |
|---|---|
| **Severity** | 🔴 **CRITICAL** |
| **Impact** | Trial di-approve tapi tenant tidak pernah dibuat. Super Admin klik "Approve" → status berubah jadi `approved`, tapi `provision_tenant` RPC tidak dipanggil. |
| **Root Cause** | `trials/actions.ts::approveWithPlan()` hanya memanggil `trialRequestRepo.approve()` dan mengembalikan `{ok: true}` tanpa memanggil `provisionTenantService` atau RPC provisioning. TODO komentar di dalam kode: `// ProvisionTenantService finalizes provisioning — handled by a future orchestration step.` |
| **Recommendation** | Wire `approveWithPlan()` → `provisionTenantService.resolvePlanForRequest()` → `provisioning.ts` (RPC) → `reminderService.scheduleForSubscription()`. |

## GAP-002: No scheduled `archived` transition

| Field | Detail |
|---|---|
| **Severity** | 🟡 **MEDIUM** |
| **Impact** | Tenant yang sudah `suspended` tidak pernah otomatis pindah ke `archived`. FSM mendukung edge `suspended → archived`, tapi `decideSweepTransition` tidak memiliki logika untuk itu. |
| **Root Cause** | `sweep.ts::decideSweepTransition` berhenti di `suspended` (no next step). Tidak ada timer/config untuk archive threshold. |
| **Recommendation** | Tambahkan `suspended → archived` ke sweep decision (dengan config retention period) ATAU biarkan sebagai transisi manual super-admin saja. |

## GAP-003: Renewal invoice creation / period extension NOT wired

| Field | Detail |
|---|---|
| **Severity** | 🔴 **CRITICAL** |
| **Impact** | Tidak ada cara bagi sistem untuk membuat invoice perpanjangan secara otomatis. `computeNextPeriodEnd` (pure) dan `extendPeriod` (repo) sudah ada tapi tidak dipanggil oleh service mana pun. `createRenewalInvoice` dan `createUpgradeInvoice` tidak diimplementasikan. |
| **Root Cause** | BillingService memiliki `initiatePayment` dan `recordPayment`, tapi tidak memiliki metode untuk membuat renewal/upgrade invoice. Invoice hanya bisa dibuat via `invoiceRepo.create()` secara manual. |
| **Recommendation** | Tambahkan `createRenewalInvoice` dan `createUpgradeInvoice` ke BillingService, wire dengan `computeNextPeriodEnd` + `applyDiscount` + `invoiceRepo.create()`. |

## GAP-004: Promotion redemption NOT atomic

| Field | Detail |
|---|---|
| **Severity** | 🟡 **MEDIUM** |
| **Impact** | `increment_promotion_redemption` RPC sudah ada di database (075) tapi tidak dipanggil dari kode. `PromotionRepository.incrementRedeemed()` masih menggunakan pola read-modify-write yang rawan race condition. `promotion_redemptions` tabel tidak pernah di-insert. |
| **Root Cause** | RPC dibuat di migration 075, tapi wiring kode ke RPC belum dilakukan. `incrementRedeemed` adalah versi lama (pre-075). |
| **Recommendation** | Ganti `incrementRedeemed()` dengan panggilan ke `increment_promotion_redemption` RPC. Tambahkan wire di `BillingService.recordPayment` untuk mencatat redemption saat pembayaran sukses. |

## GAP-005: Webhook dedup NOT wired

| Field | Detail |
|---|---|
| **Severity** | 🟡 **MEDIUM** |
| **Impact** | `webhook_deliveries` tabel dengan UNIQUE(provider, reference) sudah ada (075), tapi tidak ada kode yang menulis ke tabel ini. Saat ini idempotensi webhook hanya bergantung pada event-ledger guard (`existsEventByCorrelation`) yang hanya bekerja untuk **success** path. Replay webhook `failed`/`pending` tidak ter-dedup. |
| **Root Cause** | Tabel dedup dibuat di 075; wiring aplikasi untuk INSERT ke `webhook_deliveries` di awal `recordPayment()` belum dilakukan. |
| **Recommendation** | Tambahkan `INSERT INTO webhook_deliveries` di awal `BillingService.recordPayment()` dengan `ON CONFLICT (provider, reference) DO NOTHING`. Gunakan hasilnya sebagai gate sebelum pemrosesan. |

## GAP-006: Autorenew scheduler NOT wired

| Field | Detail |
|---|---|
| **Severity** | 🔴 **CRITICAL** |
| **Impact** | Tidak ada cron job untuk auto-renewal. `vercel.json` hanya memiliki `subscription_sweep` dan `reminder_dispatch`. Tidak ada `/api/cron/autorenew` route handler. Tidak ada `SchedulerService.runAutorenew` method. Subscription dengan `auto_renew=true` tidak akan pernah diperpanjang otomatis. |
| **Root Cause** | Autorenew adalah bagian dari blueprint yang disetujui tapi belum diimplementasikan. `SchedulerService` hanya memiliki `runSubscriptionSweep` dan `runReminderDispatch`. |
| **Recommendation** | Implementasi `runAutorenew` di `SchedulerService` (baca subscription dengan `auto_renew=true` + `period_end` mendekati → `createRenewalInvoice` → `initiatePayment` → `recordPayment`). Tambahkan cron handler dan `vercel.json` entry. **Ini bergantung pada GAP-003 (renewal invoice).** |

---

## Summary

| # | Severity | Gap | Blocked by |
|---|---|---|---|
| GAP-001 | 🔴 CRITICAL | Trial→Provision not wired | — |
| GAP-002 | 🟡 MEDIUM | Suspended→Archived not wired | — |
| GAP-003 | 🔴 CRITICAL | Renewal invoice not implemented | — |
| GAP-004 | 🟡 MEDIUM | Promotion redemption not atomic | — |
| GAP-005 | 🟡 MEDIUM | Webhook dedup not wired | — |
| GAP-006 | 🔴 CRITICAL | Autorenew scheduler not wired | GAP-003 |

**3 critical gaps, 3 medium gaps. No database/schema blockers. All are application-wiring gaps.**
