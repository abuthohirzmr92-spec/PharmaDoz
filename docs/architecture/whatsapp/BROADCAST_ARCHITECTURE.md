# WhatsApp Broadcast Engine — Architecture

## 1. Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CAMPAIGN SERVICE (orchestrator)                │
│  create / start / pause / resume / cancel / retry                    │
└───────┬───────┬───────┬───────┬───────┬────────┬──────────┬─────────┘
        │       │       │       │       │        │          │
   ┌────▼──┐ ┌─▼───┐ ┌─▼────┐ ┌▼────┐ ┌▼─────┐ ┌▼──────┐ ┌─▼────────┐
   │Campaign│ │Queue│ │Batch │ │Delay│ │Safety│ │Provider│ │Recipient │
   │Snapshot│ │Eng. │ │Eng.  │ │Eng. │ │Eng.  │ │Adapter │ │  Engine  │
   └───────┘ └──┬──┘ └──────┘ └──┬──┘ └──┬───┘ └───┬────┘ └────┬─────┘
                │                │        │         │           │
           ┌────▼────────────────▼────────▼─────────▼───────────▼─────┐
           │                    REPOSITORY LAYER                       │
           │  CampaignRepo · BroadcastQueueRepo · LogRepo · RecipRepo │
           └───────────────────────────┬──────────────────────────────┘
                                       │
           ┌───────────────────────────▼──────────────────────────────┐
           │                    DATABASE (PostgreSQL)                  │
           └──────────────────────────────────────────────────────────┘
```

## 2. Provider Abstraction (ADSOR-14 terapan)

Menggunakan pola adapter yang **identik** dengan Payment Provider (Phase 5).
Billing Engine tidak tahu Flip/Midtrans/Xendit. Broadcast Engine tidak tahu
Evolution API / Official API / Baileys.

```typescript
interface IWhatsAppProvider {
  readonly key: string;
  capabilities(): WhatsAppProviderCapabilities;
  sendMessage(to: string, template: string, params: Record<string,string>): Promise<SendResult>;
  getStatus(messageId: string): Promise<MessageStatus>;
  healthCheck(): Promise<ProviderHealth>;
}

// Adapters (future implementations):
// - EvolutionApiProvider implements IWhatsAppProvider
// - OfficialApiProvider implements IWhatsAppProvider
// - BaileysProvider implements IWhatsAppProvider
```

Provider dipilih via `SettingsRepository` (`integration.providers.whatsapp.active`),
pola yang persis sama dengan `PaymentProviderManager`.

## 3. Broadcast Queue Engine

### State Machine
```
PENDING ──start──▶ PROCESSING ──complete──▶ COMPLETED
  │                   │
  │              ┌────┼────┐
  │              ▼    ▼     ▼
  │           PAUSED FAILED CANCELLED
  │              │    │
  └──cancel──▶ CANCELLED
                 │    └──retry──▶ PROCESSING
                 └──resume──▶ PROCESSING
```

### Queue Table (conceptual)
```
broadcast_queue:
  id, campaign_id, recipient_id, recipient_phone, status (pending|processing|sent|failed|retry|cancelled),
  batch_number, retry_count, sent_at, error, created_at
```

Setiap campaign menghasilkan N row di broadcast_queue (satu per penerima).
Queue diproses per batch. Status di-update setelah pengiriman.

## 4. Delay Engine — Delay Pool Shuffle

### Algoritma
```
delayPool = [3, 5, 8, 10, 15, 20]  // detik, dikonfigurasi user
shuffledPool = shuffle(delayPool, campaignSeed)
index = 0

function nextDelay():
  if index >= shuffledPool.length:
    shuffledPool = shuffle(delayPool, campaignSeed + 1)
    index = 0
  delay = shuffledPool[index]
  index++
  return delay
```

Delay pool di-shuffle ulang **hanya setelah seluruh pool habis**, bukan setiap
kali ambil. Seed berasal dari Campaign Snapshot → urutan delay deterministik
selama campaign.

## 5. Recipient Shuffle Engine

### Strategi (configurable per campaign)

| Strategy | Behavior |
|----------|----------|
| `db_order` | Urutan sesuai database (ORDER BY created_at) |
| `shuffle_campaign` | Shuffle sekali saat campaign start (seed = campaign.id) |
| `shuffle_day` | Shuffle ulang setiap hari (seed = campaign.id + date) |
| `shuffle_week` | Shuffle ulang setiap minggu |
| `custom_seed` | Seed ditentukan manual oleh Super Admin |

### Implementasi (conceptual)
```
function buildRecipientOrder(recipients, strategy, seed):
  if strategy == 'db_order': return recipients
  if strategy == 'shuffle_campaign': return fisherYates(recipients, seed)
  if strategy == 'shuffle_day': return fisherYates(recipients, seed + today())
  ...
```

## 6. Batch Engine

```
Konfigurasi per campaign:
  batchSize: 5           // penerima per batch
  pausePerBatch: 2       // jeda antar batch (detik)
  randomPause: [1,5]     // jeda random antara 1-5 detik (opsional)

Flow:
  while queue.hasPending():
    batch = queue.nextBatch(batchSize)
    for recipient in batch:
      safety.check()
      delay.wait()
      provider.send(recipient)
    if pausePerBatch: sleep(pausePerBatch)
    if randomPause: sleep(random(randomPause))
```

## 7. Safety Engine

```
Konfigurasi per campaign (dari subscription_settings):
  whatsapp.safety.working_hours: {start: "08:00", end: "20:00", tz: "Asia/Jakarta"}
  whatsapp.safety.max_per_minute: 10
  whatsapp.safety.max_per_hour: 200
  whatsapp.safety.max_per_day: 1000
  whatsapp.safety.batch_pause_min: 2
  whatsapp.safety.batch_pause_max: 10
  whatsapp.safety.max_retries: 3
  whatsapp.safety.queue_limit: 5000

Safety Engine mengecek SEBELUM setiap pengiriman:
  1. Apakah dalam working hours? → tidak → PAUSE sampai jam kerja berikutnya
  2. Apakah rate limit per menit/jam/hari terlampaui? → ya → delay
  3. Apakah jumlah retry melebihi max_retries? → ya → FAILED
  4. Apakah queue limit terlampaui? → ya → reject campaign baru
```

## 8. Campaign Snapshot

Saat START diklik, Campaign Service:

```
1. Freeze daftar penerima (INSERT broadcast_queue dari hasil Recipient Engine)
2. Freeze urutan (snapshot order = kolom pada queue)
3. Freeze delay pool (simpan array + shuffled order + current index)
4. Freeze seed (disimpan di campaign row)
5. Simpan progress pointer (batch_number, last_processed_id)
```

Snapshot **tidak berubah** selama campaign aktif. Resume setelah restart
server membaca state dari snapshot (pointer + queue rows yang belum selesai).

## 9. Dependency Graph

```
Campaign Service
  ├── CampaignRepository (new)          → campaign + queue tables
  ├── Recipient Engine (new, pure)       → shuffle + strategy logic
  ├── Broadcast Queue (new)              → enqueue + dequeue + progress
  ├── Batch Engine (new, pure)           → batch sizing + pausing
  ├── Delay Engine (new, pure)           → delay pool logic
  ├── Safety Engine (new, pure)          → working hours + rate limits
  ├── IWhatsAppProvider (new interface)  → provider abstraction
  │   └── Adapters (Evolution/Official/Baileys, future)
  ├── SettingsRepository (existing)      → config-driven (subscription_settings)
  ├── IntegrationRegistry (existing)     → provider registration
  └── Log Repository (new)               → audit trail

Dependencies on SLE:
  ├── ReminderService (existing)         → trigger broadcast from reminders
  └── SchedulerService (existing)        → scheduled campaigns (future)
```

## 10. Provider-Agnostic Design

Mengikuti pola `PaymentProvider`:
- `PaymentProviderManager` → `WhatsAppProviderManager`
- `IPaymentProvider` → `IWhatsAppProvider`
- `ManualProvider / FlipProvider / ...` → `EvolutionApiProvider / OfficialApiProvider / BaileysProvider`
- Provider dipilih via config (`integrations.whatsapp.provider`)
- Nol business logic yang bergantung pada provider spesifik
