# WhatsApp Broadcast Engine — Product Requirements Document

## 1. Tujuan Sistem

Menyediakan WhatsApp Broadcast Engine untuk MEDISYNC Enterprise SaaS yang:
- **SAFE** — tidak spam, patuh batas kecepatan & jam kerja
- **STABLE** — queue-based, idempotent, resume setelah restart server
- **PROVIDER AGNOSTIC** — tidak terikat ke satu penyedia (Baileys/Evolution API/Official API)
- **LOW RISK** — snapshot campaign, delay pool, retry terbatas, audit log

## 2. Business Flow

```
Super Admin
  └─ Membuat Campaign → memilih template, penerima, delay pool, jam kerja, batas
       └─ Review Snapshot → konfirmasi daftar penerima & urutan
            └─ START → sistem membuat Campaign Snapshot (immutable selama campaign aktif)
                 └─ Broadcast Queue: pesan masuk queue, dikirim per batch
                      └─ Delay Engine: jeda antar-batch (shuffle pool)
                           └─ Safety Engine: enforce jam kerja & rate limit
                                └─ Provider Adapter: kirim via WhatsApp provider
                                     └─ Log: audit setiap langkah
```

## 3. Actors

| Actor | Peran |
|-------|-------|
| **Super Admin** | Membuat, menjalankan, pause, resume, cancel campaign |
| **Scheduler** | Menjadwalkan campaign (future) |
| **Reminder Engine** | Memicu broadcast reminder (integrasi dengan SLE Reminder) |
| **WhatsApp Provider** | Mengirim pesan (Evolution API / Official API / Baileys) |

## 4. Use Cases

| ID | Use Case | Deskripsi |
|----|----------|-----------|
| UC-01 | Create Campaign | Super Admin memilih template, penerima, delay pool, safety rules |
| UC-02 | Campaign Snapshot | Sistem membuat snapshot immutable penerima + urutan + delay + seed |
| UC-03 | Start Campaign | Mulai mengirim broadcast per batch |
| UC-04 | Pause Campaign | Jeda broadcast — posisi queue dipertahankan |
| UC-05 | Resume Campaign | Lanjutkan dari posisi terakhir — urutan TIDAK berubah |
| UC-06 | Cancel Campaign | Batalkan — sisa queue tidak dikirim |
| UC-07 | Retry Failed | Kirim ulang batch yang gagal |
| UC-08 | View Dashboard | Progress, ETA, delay saat ini, sisa queue |
| UC-09 | View Logs | Audit trail campaign |

## 5. Sequence Diagram (Text)

```
Super Admin → UI: Create Campaign(recipients, template, delayPool, safety)
UI → Campaign Service: createCampaign(params)
Campaign Service → Campaign Repository: INSERT campaign (status=draft)
Campaign Service → Recipient Engine: buildRecipientList(filters, strategy)
Campaign Service → Campaign Snapshot: freeze(recipients, order, delayPool, seed)
Super Admin → UI: Review Snapshot → START
UI → Campaign Service: startCampaign(campaignId)
Campaign Service → Broadcast Queue: enqueue(recipients)
Broadcast Queue → Batch Engine: nextBatch(batchSize)
Batch Engine → Safety Engine: check(workingHours, rateLimit) → OK
Batch Engine → Delay Engine: wait(delayPool.next)
Batch Engine → Provider Adapter: send(recipient, template)
Provider Adapter → WhatsApp: POST message
WhatsApp → Provider Adapter: response
Provider Adapter → Log Engine: log(result)
Batch Engine → Broadcast Queue: mark(recipient, status)
Broadcast Queue → Dashboard: updateProgress
```

## 6. Requirements

| ID | Requirement | Priority |
|----|-------------|:---:|
| RQ-01 | Provider Interface (bukan implementasi spesifik Baileys) | P0 |
| RQ-02 | Queue-based broadcast (bukan kirim langsung) | P0 |
| RQ-03 | Campaign Snapshot (immutable setelah start) | P0 |
| RQ-04 | Delay Pool Shuffle (tidak berulang sebelum habis) | P0 |
| RQ-05 | Recipient Shuffle (stabil selama campaign) | P0 |
| RQ-06 | Safety Engine (jam kerja, rate limit) | P0 |
| RQ-07 | Batch Engine (ukuran batch, pause antar batch) | P0 |
| RQ-08 | Pause / Resume / Cancel | P1 |
| RQ-09 | Retry failed batch | P1 |
| RQ-10 | Broadcast Dashboard (real-time progress) | P1 |
| RQ-11 | Campaign Audit Log | P1 |
| RQ-12 | Scheduled Campaign (future cron) | P2 |
| RQ-13 | Template Management | P1 |
| RQ-14 | Recipient Strategies (DB order, shuffle campaign/day/week, custom seed) | P1 |
| RQ-15 | Integration dengan Reminder Engine (SLE) | P2 |
