# WhatsApp Broadcast Engine — Implementation Plan

## Phase Overview

| Phase | Scope | Target |
|-------|-------|--------|
| **W1** | Database Foundation | Tables + config |
| **W2** | Provider Abstraction | Interface + Evolution API adapter |
| **W3** | Campaign Engine | CRUD + Snapshot + Queue |
| **W4** | Broadcast Runtime | Batch + Delay + Safety engines |
| **W5** | Dashboard & Monitoring | UI pages |
| **W6** | Reminder Integration | SLE Reminder → Broadcast |
| **W7** | Hardening | Idempotency, retry, audit, production safety |

---

## W1 — Database Foundation

### New tables (additive, idempotent, RLS)

```sql
-- Campaigns
whatsapp_campaigns(id, name, template_id, status, recipient_strategy,
  recipient_filter JSONB, delay_pool JSONB, batch_config JSONB,
  safety_config JSONB, seed TEXT, snapshot_at TIMESTAMPTZ,
  started_at, paused_at, completed_at, cancelled_at, created_by, created_at)

-- Broadcast Queue (satu row per penerima per campaign)
whatsapp_broadcast_queue(id, campaign_id, recipient_phone, recipient_name,
  status, batch_number, retry_count, sent_at, error, created_at)

-- Templates
whatsapp_templates(id, template_key, name, body, variables JSONB,
  is_active, created_at)

-- Campaign Log (audit)
whatsapp_campaign_log(id, campaign_id, action, actor_id, metadata JSONB,
  created_at)

-- Provider Config (reuse integration_registry pattern)
-- Extend integrations table with WhatsApp provider config via
-- subscription_settings key: whatsapp.provider.*
```

### Config (subscription_settings seed)
```
whatsapp.provider.active       = "evolution_api"
whatsapp.safety.working_hours  = {start:"08:00", end:"20:00", tz:"Asia/Jakarta"}
whatsapp.safety.max_per_minute = 10
whatsapp.safety.max_per_hour   = 200
whatsapp.safety.max_per_day    = 1000
whatsapp.safety.max_retries    = 3
whatsapp.safety.batch_pause_min= 2
whatsapp.safety.batch_pause_max= 10
whatsapp.safety.queue_limit    = 5000
```

**Risk: LOW** — semua tabel baru, additive, nol data mutation

---

## W2 — Provider Abstraction

### Interface
```typescript
interface IWhatsAppProvider {
  key: string;
  capabilities(): WhatsAppProviderCapabilities;
  sendMessage(to, template, params): Promise<SendResult>;
  getStatus(messageId): Promise<MessageStatus>;
  healthCheck(): Promise<ProviderHealth>;
}
```

### WhatsAppProviderManager
Pola identik `PaymentProviderManager`: baca config → pilih provider → return instance.

### EvolutionApiProvider (adapter #1)
Implementasi `IWhatsAppProvider` menggunakan Evolution API REST endpoint.
Webhook untuk delivery receipt (opsional di fase ini).

### OfficialApiProvider (stub, future)
### BaileysProvider (stub, future)

**Risk: LOW** — interface murni, pola existing dari Payment Provider

---

## W3 — Campaign Engine

### CampaignService
- `createCampaign(params)` → INSERT campaign (draft)
- `buildRecipientList(filters, strategy, seed)` → menghasilkan array penerima
- `createSnapshot(campaignId)` → INSERT queue rows + freeze state
- `startCampaign(campaignId)` → status=processing, mulai broadcast

### Recipient Engine (pure helpers)
- `buildRecipientOrder(recipients[], strategy, seed)` → ordered list
- `shuffleWithSeed(array, seed)` → fisher-yates deterministik

### Campaign Repository
- CRUD campaign + queue + log

**Risk: MEDIUM** — logika inti; butuh unit test menyeluruh

---

## W4 — Broadcast Runtime

### BroadcastQueueProcessor (orchestrator per campaign)
```
while campaign.active AND queue.hasPending():
  batch = queue.nextBatch(batchSize)
  for each recipient in batch:
    SafetyEngine.check()   → pass/fail
    DelayEngine.wait()     → jeda antar batch
    Provider.sendMessage() → kirim
    Queue.updateStatus()   → sent/failed
  LogEngine.log(batch)
```

### Batch Engine (pure)
- `nextBatch(queue, size)` → slice penerima berikutnya
- `batchPause(config)` → sleep

### Delay Engine (pure)
- `DelayPool([3,5,8,10,15,20], seed)` → shuffle → iterasi siklik

### Safety Engine (pure)
- `isWithinWorkingHours(config)` → boolean
- `checkRateLimit(counters, config)` → boolean

### Scheduler Wiring
- Vercel Cron trigger setiap campaign aktif → memanggil `BroadcastQueueProcessor`
- Idempotent via `scheduler_runs(job_key='whatsapp_broadcast', campaign_id)`

**Risk: MEDIUM** — runtime loop; butuh idempotency + graceful shutdown

---

## W5 — Dashboard & Monitoring

### Platform Pages (8 tabs under Settings → Integrasi → WhatsApp)
Reuse pola Phase 7: WidgetShell + useAsync + skeleton/empty/error + AppCard/AppBadge.
Semua read via repository; write via server action (pola trial desk GAP-001).

**Risk: LOW** — UI read-only pada fase ini; pola existing

---

## W6 — Reminder Integration (SLE)

### Trigger dari Reminder Engine
- `ReminderService` mendeteksi `reminder.kind = "refill" | "pickup" | "payment" | "membership"`
- → `notification_log` channel = `whatsapp`
- → `WhatsAppProvider.sendMessage()` via `IWhatsAppProvider`

### Perubahan yang dibutuhkan
- `ReminderService.dispatchDue()` → tambah channel adapter untuk WhatsApp
- `NotificationService` → channel adapter WhatsApp (pola sama dengan email)
- Nol perubahan di Subscription Engine / Billing

**Risk: LOW** — additive; channel adapter baru

---

## W7 — Hardening

- Idempotency: double-send detection (by campaign_id + recipient_id)
- Retry: escalating backoff (pola `payment.retry.*`)
- Audit: campaign_log untuk setiap aksi
- Rate limit: counter di memory/Redis, reset per menit/jam/hari
- Graceful shutdown: simpan pointer sebelum mati
- Rollback: semua migrasi additive + reversible

**Risk: MEDIUM** — production safety

---

## Architecture Compliance

| Prinsip | Terpenuhi |
|----------|:---:|
| Provider-Agnostic | ✅ `IWhatsAppProvider` interface; manager selects per config |
| Queue-Based (bukan kirim langsung) | ✅ `broadcast_queue` table; processor per campaign |
| Reuse Existing Patterns | ✅ Provider adapter (PaymentProvider), Integration Registry, Settings-driven, WidgetShell, SERVER ACTION privileged |
| Database Additive | ✅ New tables only; no ALTER existing |
| Idempotent Migrations | ✅ `IF NOT EXISTS`, `DO $$` guards, reversible |
| Config-Driven | ✅ `subscription_settings` (safety, provider, rate limits) |
| No Business Logic in UI | ✅ Pure helpers + repositories + services |
| Audit Trail | ✅ `campaign_log` table |

## Dependency on Existing SLE Infrastructure

| SLE Component | Used By |
|---------------|---------|
| `SettingsRepository` | Config reader (safety rules, provider settings) |
| `IntegrationRegistry` (066) | Provider registration |
| `PaymentProviderManager` pattern | `WhatsAppProviderManager` |
| `ReminderService` | Trigger broadcast from reminders |
| `SchedulerService` / Vercel Cron | Campaign processing ticks |
| `Repository-instances` pattern | Campaign/Broadcast repos |
| `WidgetShell` / `useAsync` | Dashboard UI |
| `AppCard` / `AppBadge` | UI components |
| `Server Client Factory` | Privileged writes |
