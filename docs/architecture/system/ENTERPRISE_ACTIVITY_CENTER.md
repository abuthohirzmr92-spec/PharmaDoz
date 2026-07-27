# Enterprise Activity Center — Architecture Blueprint

The **single place** for all background processes and long-running jobs in
MEDISYNC. A unified job monitor — like Chrome Download Manager or GitHub
Actions — not a notification feed, not an audit log, not a log viewer.

---

## 1. Vision

One place. Every job. Live progress. One card per job that updates in-place.

When a Super Admin starts a Broadcast Campaign, imports a 10,000-row Excel file,
runs a Factory Reset, or triggers an OCR batch — they see exactly one card per
job. That card shows progress, ETA, speed, and status. It updates in real-time.
It does not multiply into 50 cards for 50 progress steps.

---

## 2. Responsibilities

### ✅ Activity Center OWNS:
- Activity lifecycle (queued → running → … → completed/failed/cancelled)
- Progress tracking (per job, in-place updates)
- ETA & speed computation
- Priority model
- Activity history (completed, failed, cancelled)
- Top Bar integration (download-manager style)
- Multiple concurrent job display

### ❌ Activity Center does NOT own:
- Broadcast execution → `WhatsApp Broadcast Engine`
- Import logic → `Import Service`
- Export logic → `Export Service`
- OCR processing → `OCR Engine`
- Factory Reset execution → `FactoryResetService`
- Identity resolution → `Customer Identity Engine`
- Notification delivery → `Notification Service`
- Business logic of ANY job it monitors

---

## 3. Domain Boundary

```
┌────────────────────────────────────────────────────────────┐
│                 ENTERPRISE ACTIVITY CENTER                  │
│  (HOW is it going — unified job monitor)                   │
│                                                            │
│  ActivityCard · Progress · ETA · Speed · Status · History  │
│  Priority · TopBar · Pause/Resume/Cancel · Retry           │
└──────────┬─────────────────────────────────────────────────┘
           ▲ consumes ActivityEvent (fire-and-forget)
           │
   ┌───────┴──────────┬──────────────┬──────────────┬──────────────┐
   │                  │              │              │              │
┌──▼──────────┐ ┌─────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐ ┌─────▼──────┐
│Broadcast    │ │Import      │ │Export    │ │FactoryReset│ │OCR Engine  │
│Engine       │ │Engine      │ │Engine    │ │Engine      │ │(future)    │
│(Producer)   │ │(Producer)  │ │(Producer)│ │(Producer)  │ │(Producer)  │
└─────────────┘ └────────────┘ └──────────┘ └────────────┘ └────────────┘
```

**Rule:** Engines PRODUCE events. Activity Center CONSUMES events. Activity
Center never executes business logic on behalf of any engine.

---

## 4. Core Concepts

| Concept | Definition |
|---------|-----------|
| **Activity** | One job — one card. e.g. "Broadcast Promo Juli" |
| **Job** | The actual work being done by the producer engine |
| **Progress** | `{ current: 350, total: 1000 }` — updates in-place |
| **Status** | `queued | running | paused | retrying | completed | failed | cancelled` |
| **ETA** | Estimated time remaining (computed from speed) |
| **Speed** | Items per second (computed from recent progress) |
| **Priority** | `critical | high | normal | low` |
| **Initiator** | Who started it (`actor_id`) |
| **Source Engine** | Which engine produced it (`broadcast | import | export | factory_reset | ocr | ...`) |
| **Started At / Finished At** | Timestamps |
| **Duration** | `finished_at - started_at` (computed) |

---

## 5. Activity Lifecycle

```
QUEUED ──start──▶ RUNNING ──complete──▶ COMPLETED
                    │
                    ├──pause──▶ PAUSED ──resume──▶ RUNNING
                    │
                    ├──fail───▶ RETRYING ──retry──▶ RUNNING
                    │              │
                    │              └──max_retries──▶ FAILED
                    │
                    └──cancel──▶ CANCELLED
```

**Absolute Rule:** `RUNNING → progress++` updates the EXISTING card. No new
activity is created for progress updates. One job = one card = one `activity_id`.

---

## 6. Event Architecture

### Event Model (fire-and-forget from producer)

```
Producer Engine (Broadcast / Import / Export / OCR / ...)
  │
  ├─ emit("activity.created",    { activityId, jobType, label, totalItems, priority, actorId })
  ├─ emit("activity.started",    { activityId })
  ├─ emit("activity.progress",   { activityId, current, total, speed, eta })
  ├─ emit("activity.paused",     { activityId, reason })
  ├─ emit("activity.resumed",    { activityId })
  ├─ emit("activity.retrying",   { activityId, attempt, maxRetries, reason })
  ├─ emit("activity.completed",  { activityId, result })
  ├─ emit("activity.failed",     { activityId, error, retryable })
  └─ emit("activity.cancelled",  { activityId, reason })
```

All events carry:
- `activityId` (UUID — assigned by producer at creation)
- `timestamp`
- `correlationId` (optional, for tracing)

### Consumer

```
Activity Center
  ├─ on("activity.created")    → create card (QUEUED)
  ├─ on("activity.started")    → update card (RUNNING)
  ├─ on("activity.progress")   → update card (progress++, speed, ETA)
  ├─ on("activity.paused")     → update card (PAUSED)
  ├─ on("activity.resumed")    → update card (RUNNING)
  ├─ on("activity.retrying")   → update card (RETRYING)
  ├─ on("activity.completed")  → update card (COMPLETED, green)
  ├─ on("activity.failed")     → update card (FAILED, red, retry-CTA)
  └─ on("activity.cancelled")  → update card (CANCELLED, grey)
```

**Key principle:** The same `activityId` is used for every event. The card is
found by ID and updated in-place. No duplicate cards.

---

## 7. Producer & Consumer Model

### Registered Producers (current + future)

| Producer | Job Type | Typical Events |
|----------|----------|---------------|
| `WhatsApp Broadcast Engine` | `broadcast` | created → started → progress (per batch) → completed |
| `Import Service` | `import_excel`, `import_csv` | created → started → progress (per row) → completed |
| `Export Service` | `export_excel`, `export_pdf` | created → started → completed (or progress if chunked) |
| `FactoryResetService` | `factory_reset` | created → started → progress (per step) → completed |
| `OCR Engine` (future) | `ocr_batch` | created → started → progress → completed |
| `AI Analysis` (future) | `ai_analysis` | created → started → progress → completed |
| `BPJS Sync` (future) | `bpjs_sync` | created → started → progress → completed |
| `Marketplace Sync` (future) | `marketplace_sync` | created → started → completed |
| `Backup Service` (future) | `backup` | created → started → progress → completed |
| `Report Generator` (future) | `report` | created → started → completed |

### Consumer
Exactly ONE consumer: **Activity Center**. No other module consumes ActivityEvents.

---

## 8. Activity Resolution Flow

```
Producer Engine starts a job
   │
   ├─ 1. Generate activityId (UUID)
   ├─ 2. emit("activity.created", { activityId, jobType, label, totalItems, priority, actorId })
   │
   └─ Activity Center receives event
        ├─ INSERT activity_cards(id, job_type, label, total_items, status='queued', priority, actor_id, created_at)
        └─ RETURN the card (visible in Top Bar)
   │
   ├─ 3. Start work
   ├─ 4. emit("activity.started", { activityId })
   │     → Activity Center: UPDATE activity_cards SET status='running', started_at=NOW()
   │
   ├─ 5. As work progresses:
   │     emit("activity.progress", { activityId, current, total, speed, eta })
   │     → Activity Center: UPDATE progress fields (same card)
   │
   ├─ 6. On completion:
   │     emit("activity.completed", { activityId, result })
   │     → Activity Center: UPDATE status='completed', finished_at=NOW()
```

One `activityId`. One card. Updated many times.

---

## 9. Activity Status Model

| Status | Icon | Color | Meaning |
|--------|------|-------|---------|
| `queued` | ⏳ | Grey | Waiting to start |
| `running` | 🔵 | Blue | In progress |
| `paused` | ⏸️ | Yellow | Paused by user |
| `retrying` | 🔄 | Orange | Failed, retrying |
| `completed` | ✅ | Green | Finished successfully |
| `failed` | ❌ | Red | Failed (max retries exceeded) |
| `cancelled` | 🚫 | Grey | Cancelled by user |

---

## 10. Progress Tracking Strategy

### Progress update (same card, in-place)

```
Event N:   activity.progress { activityId, current: 23,  total: 350, speed: 5.2, eta: "62s" }
Event N+1: activity.progress { activityId, current: 24,  total: 350, speed: 5.1, eta: "64s" }
Event N+2: activity.progress { activityId, current: 25,  total: 350, speed: 4.9, eta: "66s" }
...
Event N+349: activity.progress { activityId, current: 350, total: 350 }
Event N+350: activity.completed { activityId }
```

**All updates go to the same `activityId`.** The card shows the LATEST values.
No history of every single progress event is stored — only the latest progress.

### COMPLETED vs FAILED cards move to History section
Running/Paused/Queued cards remain in the Active section of the Top Bar.

---

## 11. ETA & Speed Model

### Computed on each progress event (by the producer)

```
speed = (current - previousCurrent) / (now - previousTimestamp)   // items per second
eta   = (total - current) / speed                                 // seconds remaining
```

The producer computes speed & ETA and includes them in the progress event.
Activity Center displays them — it never computes them itself.

### Display format
- Speed: `5.2/s`
- ETA: `~1m 4s` or `~45m` or `~2h 15m`

---

## 12. Priority Model

| Priority | Order in Top Bar | Example job types |
|----------|:---:|------|
| `critical` | Top | Factory Reset, System Recovery |
| `high` | Below critical | Broadcast Campaign |
| `normal` | Middle | Import, Export, OCR |
| `low` | Bottom | Report Generation, Sync |

Priority is set by the producer at creation time and can be updated via
`activity.priority_changed` event.

---

## 13. Activity History

### Active Section (Top Bar)
- Status: `queued | running | paused | retrying`
- Sorted by: priority DESC, created_at ASC

### History Section (Activity Center page)
- Status: `completed | failed | cancelled`
- Sorted by: finished_at DESC
- Retained for: 30 days (config `activity.history_retention_days`)

### Cleanup
- Scheduler job: delete activities older than retention period
- `activity.deleted` event (for audit reference, if needed)

---

## 14. Top Bar Integration

### Layout (Download Manager style)

```
┌──────────────────────────────────────────────────────────────┐
│  [🔔 Notifications (3)]    [📋 Activities (2 running)]       │
├──────────────────────────────────────────────────────────────┤
│  ACTIVITIES (dropdown / popover)                              │
│                                                               │
│  🔵 Broadcast Promo Juli        23/350     5.2/s  ~62s      │
│  🔵 Import Master Produk       1,240/10,000  82/s    ~2m    │
│  ─────────────────────────────────────────────────────────── │
│  ✅ Export Laporan Keuangan     Completed    2 menit lalu    │
│  ❌ OCR Batch #12               Failed       5 menit lalu    │
│  🚫 Sinkronisasi BPJS           Cancelled    1 jam lalu      │
│                                                               │
│  [Lihat Semua Aktivitas →]                                   │
└──────────────────────────────────────────────────────────────┘
```

Active jobs at the top (priority-ordered), completed/failed below, "View All"
link to Activity Center page.

### Interaction
- Click card → expand to show detail (progress bar, ETA, speed, started_at)
- Pause / Resume / Cancel buttons on running cards
- Retry button on failed cards (if `retryable = true`)

---

## 15. Notification Boundary

| Concern | Activity Center | Notification Center |
|---------|:---:|:---:|
| **What** | HOW is the job going? (progress) | WHAT happened? (outcome) |
| **When** | During job execution (every progress tick) | After completion (one notification) |
| **Persistence** | Card updates in-place | New notification row per event |
| **Example** | "Broadcast: 23/350" → "24/350" → ... → "350/350 complete" | "Broadcast Promo Juli selesai. 350 terkirim." |
| **Dismissal** | Cards persist until dismissed (completed/failed) or expire | Notifications can be dismissed / marked read |

**Hard rule:** Activity Center does NOT replace Notification Center.
A completed job may produce ONE notification ("Broadcast selesai") plus ONE
activity card (progress now 100%). These are distinct domains.

---

## 16. Future Extension Points

Activity Center is designed to accept a new producer by simply registering a
`job_type`. No architecture change required.

| Future Domain | job_type | Events Emitted |
|---------------|----------|----------------|
| AI Analysis | `ai_analysis` | created → started → progress → completed |
| Marketplace Sync | `marketplace_sync` | created → started → completed |
| Email Campaign | `email_campaign` | created → started → progress → completed |
| SMS Campaign | `sms_campaign` | created → started → progress → completed |
| Telegram Campaign | `telegram_campaign` | created → started → progress → completed |
| Push Notification Batch | `push_batch` | created → started → progress → completed |
| IoT Device Sync | `iot_sync` | created → started → completed |
| BPJS Claim Batch | `bpjs_claim` | created → started → progress → completed |
| Cloud Backup | `cloud_backup` | created → started → progress → completed |
| Future Automation | `automation_*` | Any activity event set |

---

## 17. Integration Points

### How a producer integrates (checklist)
1. Generate `activityId` (UUID)
2. Emit `activity.created` event
3. Emit `activity.started` event
4. Emit `activity.progress` event(s) during work
5. Emit `activity.completed` or `activity.failed` or `activity.cancelled`
6. Done. Activity Center handles the rest.

### No dependency on Activity Center types
Producers emit **plain objects** (the event model). They do not import Activity
Center. Activity Center consumes events via an **Event Bus** (Extension Bus,
ADR-39). This is the same pattern used by all SLE extension points.

---

## 18. Self Review

| Requirement | Status | Section |
|---|---|---|
| Satu job = satu activity card | ✅ | §5, §10 |
| Card diperbarui in-place | ✅ | §10 (same activityId) |
| Progress, ETA, Speed | ✅ | §11 |
| Pause / Resume / Cancel / Retry | ✅ | §5, §14 |
| Event-driven (producer → consumer) | ✅ | §6, §7 |
| Activity Center tidak menjalankan business logic | ✅ | §3 |
| Multiple concurrent jobs | ✅ | §14 (Top Bar shows all) |
| Priority model | ✅ | §12 |
| Download Manager UX | ✅ | §14 |
| Top Bar Integration | ✅ | §14 |
| Distinct from Notification Center | ✅ | §15 |
| Future extension without redesign | ✅ | §16 (10+ future producers) |
| Zero code | ✅ | Architecture only |
| Zero migration | ✅ | No SQL |
| Zero UI | ✅ | Wireframe only |
| Zero API | ✅ | Event model only |
