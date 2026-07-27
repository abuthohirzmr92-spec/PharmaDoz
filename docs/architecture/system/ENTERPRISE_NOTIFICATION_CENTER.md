# Enterprise Notification Center — Architecture Blueprint

The **single place** for all user notifications in MEDISYNC. Every engine
produces Notification Events. No engine builds its own notification UI.
Notification Center = outcome. Activity Center = progress. Distinct domains.

---

## 1. Vision

One place. Every event. The user always knows WHAT happened.

When a Broadcast completes, a Payment succeeds, Stock drops below minimum, a
Backup fails, or a Factory Reset finishes — exactly ONE notification per
meaningful outcome. No spam. No progress spam. No duplicate UI.

---

## 2. Philosophy

| Concern | Activity Center | Notification Center |
|---------|:---:|:---:|
| **Question** | HOW is it going? | WHAT happened? |
| **Nature** | LIVE · Progress | EVENT · Outcome |
| **Updates** | Same card, progress ticks | One notification per outcome |
| **Example** | Broadcast 123/350 Running | "Broadcast selesai. 350 terkirim." |
| **Persistence** | Cards update in-place | New notification row per event |
| **Lifetime** | While job is running + history | Until read/dismissed/expired |

---

## 3. Responsibilities

### ✅ Notification Center OWNS:
- Receive Notification Events from all engines
- Store, categorize, prioritize, and display notifications
- Manage notification lifecycle (unread → read → archived → expired)
- Top Bar integration (unread count + dropdown panel)
- Deduplication & grouping
- Actionable deep-links (open the relevant page)
- Notification history

### ❌ Notification Center does NOT own:
- Running job progress → `Activity Center`
- Broadcast execution → `WhatsApp Broadcast Engine`
- Business logic of any engine
- Audit trail → `subscription_events` / `activity_logs`
- Identity resolution → `Customer Identity Engine`

---

## 4. Domain Boundary

```
┌─────────────────────────────────────────────────────────────┐
│               ENTERPRISE NOTIFICATION CENTER                 │
│  (WHAT happened — outcome events → user notifications)       │
│                                                              │
│  Notification · Category · Severity · Priority · Action      │
│  Lifecycle · Dedup · Grouping · TopBar · History             │
└──────────┬──────────────────────────────────────────────────┘
           ▲ consumes NotificationEvent (from any engine)
           │
   ┌───────┴──────────┬──────────────┬──────────────┬──────────────┐
   │                  │              │              │              │
┌──▼──────────┐ ┌─────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐ ┌─────▼──────┐
│Broadcast    │ │Payment     │ │Inventory │ │FactoryReset│ │OCR Engine  │
│Engine       │ │Engine      │ │Engine    │ │Engine      │ │(future)    │
└─────────────┘ └────────────┘ └──────────┘ └────────────┘ └─────────────┘
```

---

## 5. Notification Flow

```
Any Engine
   │
   ▼
Notification Event (plain object)
   │
   ▼
Notification Center (consume)
   │
   ├─ Validate & deduplicate
   ├─ Store (INSERT notification_log)
   ├─ Update Top Bar (unread count++)
   └─ Display in Notification Panel
        │
        ▼
User opens notification
   ├─ Mark as READ
   └─ Click Action → deep-link to relevant page
```

---

## 6. Notification Lifecycle

```
CREATED ──▶ UNREAD ──(user clicks)──▶ READ ──▶ ARCHIVED ──▶ EXPIRED ──▶ DELETED
                │                        │
                └──(user dismisses)──────┘
```

- `CREATED`: Event received, stored
- `UNREAD`: Visible in Top Bar (badge count)
- `READ`: User opened notification panel / clicked
- `ARCHIVED`: User explicitly archived (moved to history)
- `EXPIRED`: Auto-archived after TTL (config `notification.ttl_days`, default 30)
- `DELETED`: Hard-deleted by cleanup scheduler (> retention period)

---

## 7. Notification Model

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | PK |
| `tenant_id` | UUID | Recipient tenant |
| `user_id` | UUID | Recipient user (nullable = tenant-wide) |
| `title` | String | "Broadcast Promo Juli selesai." |
| `message` | String | "350 dari 350 pesan berhasil dikirim. 0 gagal." |
| `category` | Enum | `communication | inventory | finance | sales | ...` |
| `severity` | Enum | `critical | high | medium | low | info | success | warning | error` |
| `priority` | Enum | `critical | high | normal | low` |
| `source_engine` | String | `broadcast | payment | inventory | factory_reset | ocr | ...` |
| `recipient_id` | UUID | Who should see this |
| `action_label` | String | "Lihat Broadcast" (button text) |
| `action_link` | String | `/platform/broadcast/123` (deep link) |
| `is_read` | Boolean | DEFAULT false |
| `is_archived` | Boolean | DEFAULT false |
| `metadata` | JSONB | Engine-specific payload |
| `correlation_id` | UUID | Links to Activity / Event |
| `expires_at` | TIMESTAMPTZ | Auto-archive threshold |
| `created_at` | TIMESTAMPTZ | When the event was received |

---

## 8. Category Model

| Category | Source Engine(s) | Example |
|----------|------------------|---------|
| `communication` | Broadcast, Reminder | "Broadcast selesai." |
| `inventory` | Inventory Engine | "Stok Paracetamol di bawah minimum." |
| `finance` | Payment, Billing | "Pembayaran Rp 299.000 berhasil." |
| `sales` | Cashier, Transaction | "100 transaksi berhasil hari ini." |
| `purchasing` | Purchase Engine | "PO #123 diterima." |
| `security` | Auth, RBAC | "Password berhasil diubah." |
| `maintenance` | Factory Reset, Backup | "Factory Reset selesai." |
| `system` | Scheduler, Cron | "Scheduler sweep completed." |
| `administration` | Platform, Tenant | "Tenant baru terdaftar." |
| `customer` | Customer Identity | "Pelanggan baru terhubung." |
| `bpjs` | BPJS Integration | "Sinkronisasi BPJS selesai." |
| `integration` | Marketplace, API | "Marketplace sync completed." |
| `automation` | Automation Engine | "Workflow #5 selesai." |
| `ai` | AI Engine | "Analisis prediksi selesai." |

---

## 9. Severity Model

| Severity | Icon | Meaning | Example |
|----------|------|---------|---------|
| `critical` | 🔴 | Needs immediate action | "Backup gagal. Data berisiko." |
| `error` | ❌ | Something failed | "Pembayaran gagal." |
| `warning` | 🟡 | Attention recommended | "Stok di bawah minimum." |
| `high` | 🟠 | Important but not blocking | "Trial akan berakhir besok." |
| `medium` | 🔵 | Normal information | "10 tenant baru minggu ini." |
| `low` | ⚪ | Low importance | "Cache dibersihkan." |
| `info` | 🔵 | Purely informational | "Sistem diperbarui ke v2.1." |
| `success` | 🟢 | Positive outcome | "Broadcast berhasil." |

---

## 10. Priority Model

| Priority | Order in Panel | Example |
|----------|:---:|---------|
| `critical` | Top | Backup failed, payment gateway offline |
| `high` | Below critical | Trial expiring, large invoice overdue |
| `normal` | Middle | Broadcast complete, stock alert |
| `low` | Bottom | System info, cache cleared |

Priority determines sort order. Critical notifications appear first regardless
of timestamp.

---

## 11. Deduplication Strategy

### Rule: Notification Center is NOT spam.

| Scenario | Strategy |
|----------|----------|
| 100 transaksi sukses dalam batch | **Aggregated**: 1 notification = "100 transaksi berhasil." |
| 1 transaksi sukses individual | **Individual**: 1 notification per transaction |
| Broadcast progress (every batch) | **NOT a notification** → Activity Center handles this |
| Broadcast complete | **1 notification**: "Broadcast selesai. 350 terkirim." |
| Repeated same error (same entity) | **Update existing**: bump timestamp, increment counter |

### Dedup Key
`(tenant_id, source_engine, category, correlation_group)` — if a notification
with the same dedup key exists and is UNREAD, UPDATE the existing one (increment
counter, bump timestamp) instead of creating a new one.

### Aggregation Window
Config-driven: `notification.aggregation_window_seconds` (default 300s = 5 min).
Events within the window with the same dedup key are aggregated.

---

## 12. Action Model

Notifications can carry optional actions. Actions are deep-links — the
Notification Center opens the target page. Business logic remains in the
source engine.

| Notification | Action Label | Action Link |
|-------------|-------------|-------------|
| Stok minimum | "Buka Inventory" | `/inventory?product=paracetamol` |
| Pembayaran gagal | "Lihat Invoice" | `/settings/subscription/billing` |
| Broadcast selesai | "Lihat Broadcast" | `/platform/broadcast/123` |
| Backup gagal | "Coba Lagi" | ACTION: retry backup (future) |
| Trial berakhir | "Upgrade Paket" | `/settings/subscription/upgrade` |

Types:
- `navigate` — deep link to page
- `action` — call a server action (retry, approve, etc.) — future

---

## 13. Grouping Strategy

Anti-spam. Notifications are NEVER sent per progress tick.

```
WRONG ❌:
  "Broadcast: batch 1/50"
  "Broadcast: batch 2/50"
  ...
  "Broadcast: batch 50/50"
  → Activity Center handles progress.

CORRECT ✅:
  (Activity Center shows: 🔵 Broadcast Promo Juli 350/350)
  (Notification Center shows: 🟢 Broadcast selesai. 350 terkirim.)
```

### Group-by rules
- Same source_engine + same entity → aggregate into one notification
- Progress events → NEVER become notifications
- Only TERMINAL events (completed, failed, cancelled) produce notifications
- Exception: `critical` events fire immediately (e.g., backup failed, provider offline)

---

## 14. Top Bar Integration

```
┌──────────────────────────────────────────────────────────────┐
│  [🔔 3]    [📋 2 running]                                    │
├──────────────────────────────────────────────────────────────┤
│  NOTIFICATIONS (dropdown panel)                              │
│                                                               │
│  🔴 CRITICAL                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Backup gagal. Data berisiko.        [Coba Lagi] 10m ago │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  🟠 HIGH                                                     │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Stok Paracetamol di bawah minimum.  [Buka]      1h ago  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  🟢 SUCCESS                                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Broadcast selesai. 350 terkirim.    [Lihat]     2h ago  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  [Tandai Semua Dibaca]  [Lihat Semua Notifikasi →]           │
└──────────────────────────────────────────────────────────────┘
```

### Rules
- Grouped by severity section (critical → high → ... → success)
- Within each section: newest first
- Running processes do NOT appear here (Activity Center)
- Unread count badge on bell icon
- "Mark All Read" dismisses all
- Click notification → mark read + navigate to action link

---

## 15. Activity Center Boundary

| Concern | Activity Center | Notification Center |
|---------|:---:|:---:|
| **What it shows** | Jobs in progress | Outcomes that happened |
| **Update pattern** | Same card, progress ticks | New notification per outcome |
| **Example (same broadcast)** | 🔵 Broadcast Promo Juli 23/350 Running | 🟢 "Broadcast selesai. 350 terkirim." |
| **Click action** | Expand to see detail (progress bar, speed, ETA) | Deep link to result page |
| **Lifecycle** | queued → running → completed/failed | created → unread → read → archived |
| **Where in UI** | Top Bar (Activity panel) | Top Bar (Notification panel) |
| **Deduplication** | Not needed (one card = one job) | Aggregated + dedup key |

### Handoff: Activity → Notification

```
Activity: 🔵 running → progress ticks → ✅ completed
   │                                          │
   │                                          └──▶ triggers ONE notification event
   │                                               "Broadcast selesai. 350 terkirim."
   │
   Activity Center keeps the ✅ completed card in history.
   Notification Center creates ONE success notification.
```

---

## 16. Future Extension Points

| Future Domain | Category | Example Notification |
|---------------|----------|---------------------|
| Marketplace Sync | `integration` | "Sinkronisasi marketplace selesai. 50 produk diperbarui." |
| Email Campaign | `communication` | "Email campaign terkirim ke 200 pelanggan." |
| SMS Campaign | `communication` | "SMS blast selesai." |
| Telegram Bot | `communication` | "Notifikasi Telegram terkirim." |
| Push Notification | `communication` | "Push campaign selesai." |
| Cloud Backup | `maintenance` | "Backup cloud selesai. 2.3 GB." |
| AI Analysis | `ai` | "Prediksi penjualan siap." |
| BPJS Claim | `bpjs` | "100 klaim BPJS diproses." |
| IoT Alert | `system` | "Sensor suhu gudang: 28°C (di atas threshold)." |

Adding a new producer = defining its `category` + `source_engine`. Zero
architecture change to Notification Center.

---

## 17. Integration Points

### How an engine produces a notification:
1. Engine detects a terminal event (completed, failed, warning threshold, etc.)
2. Emit `NotificationEvent { title, message, category, severity, priority, action, metadata }`
3. Notification Center receives, validates, deduplicates, stores
4. UI updates Top Bar badge count
5. User sees notification in panel

### Existing infrastructure reused:
- `notification_log` table (migration 064) — already exists
- Extension Bus (ADR-39) — same event pattern as Activity Center
- `reminderRepo.logNotification()` — existing method for notification persistence
- `widget-shell` / `AppBadge` / `AppCard` — UI patterns for the Notification Center page

---

## 18. Self Review

| Requirement | Status |
|---|---|
| Zero implementation | ✅ |
| Zero migration | ✅ |
| Zero UI code | ✅ |
| Zero React component | ✅ |
| Zero API | ✅ |
| Zero database schema | ✅ |
| Pure architecture | ✅ |
| Activity Center boundary clear | ✅ §15 |
| No engine creates its own notification UI | ✅ §3 |
| Deduplication strategy | ✅ §11 |
| Grouping / anti-spam | ✅ §13 |
| Actionable notifications | ✅ §12 |
| Top Bar design | ✅ §14 |
| Future extension without redesign | ✅ §16 |
