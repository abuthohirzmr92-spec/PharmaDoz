# WhatsApp Broadcast Engine — UI Blueprint

Semua halaman berada di bawah Settings → Integrasi → WhatsApp (Super Admin).
Reuse pola widget dari Phase 6/7 (WidgetShell, useAsync, AppCard, AppBadge,
skeleton/empty/error).

## Navigation

```
Platform Sidebar → Subscription Management → Integrasi
                                                 └── WhatsApp (new)
                                                      ├── Koneksi
                                                      ├── Broadcast
                                                      ├── Queue
                                                      ├── Keamanan
                                                      ├── Provider
                                                      ├── Template
                                                      ├── Statistik
                                                      └── Log
```

## Pages

### 1. Koneksi (Connection)

```
┌──────────────────────────────────────────────────────┐
│  Status Koneksi WhatsApp                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 🟢 Terhubung · Evolution API v2.1 · Production   │ │
│  │ Terakhir dicek: 2 menit lalu                     │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  Informasi Provider                                   │
│  Provider      Evolution API                          │
│  URL           https://evo.example.com                │
│  Mode          Production                             │
│  [Ubah Provider]  [Test Koneksi]                      │
│                                                       │
│  Health                                              │
│  Success Rate   98.5%                                 │
│  Avg Latency    1.2s                                  │
│  Last Error     —                                     │
└──────────────────────────────────────────────────────┘
```

### 2. Broadcast (Campaign)

```
┌──────────────────────────────────────────────────────┐
│  [+ Campaign Baru]                                    │
│                                                       │
│  Campaign Aktif                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Promo Juli 2026        🔵 Processing  45%        │ │
│  │ 450/1000 terkirim · 2 gagal · ETA 12 menit       │ │
│  │ [⏸ Pause]  [⏹ Stop]  [Lihat Detail]             │ │
│  ├──────────────────────────────────────────────────┤ │
│  │ Reminder Obat Mingguan  🟢 Completed  100%       │ │
│  │ 200/200 terkirim · 0 gagal · Selesai 10:30       │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  Campaign Terjadwal                                   │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Follow-up Membership   ⚪ Scheduled  Besok 08:00  │ │
│  │ 500 penerima · delay pool [5,10,15]              │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 2a. Create Campaign (Form)

```
┌──────────────────────────────────────────────────────┐
│  Campaign Baru                                        │
│                                                       │
│  Nama Campaign    [Promo Juli 2026          ]         │
│  Template         [▼ Promo Diskon            ]         │
│  Penerima         [▼ Semua Tenant Aktif      ]        │
│                   [ ] Filter by Package               │
│                                                       │
│  ── Strategi Penerima ──                              │
│  Urutan           [▼ Shuffle Every Campaign  ]        │
│  Seed (custom)    [__________________________]        │
│                                                       │
│  ── Delay Pool ──                                     │
│  Delay (detik)    [3,5,8,10,15,20           ]        │
│                                                       │
│  ── Batch ──                                          │
│  Batch Size       [5                        ]         │
│  Pause Per Batch  [2                        ] detik   │
│  Random Pause     [1] - [5]                 detik    │
│                                                       │
│  ── Keamanan ──                                       │
│  Jam Kerja        [08:00] - [20:00] WIB             │
│  Max / Menit      [10]                                │
│  Max / Hari       [1000]                               │
│  Max Retry        [3]                                 │
│                                                       │
│  ┌── Preview Snapshot ──────────────────────────────┐ │
│  │ Penerima: 500 tenant                             │ │
│  │ Urutan: Shuffle (seed: campaign-uuid)            │ │
│  │ Estimasi: ~45 menit                              │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  [Simpan Draft]  [Review & Mulai]                     │
└──────────────────────────────────────────────────────┘
```

### 3. Queue (Live Monitor)

```
┌──────────────────────────────────────────────────────┐
│  Queue Monitor — Promo Juli 2026                       │
│                                                       │
│  Progress                                             │
│  ████████████████░░░░░░░░░░░░░░  450/1000 (45%)       │
│                                                       │
│  Status                                               │
│  ✅ Terkirim    450                                   │
│  ⏳ Pending     540                                   │
│  🔄 Retry       8                                     │
│  ❌ Failed      2                                     │
│                                                       │
│  Saat Ini                                             │
│  Batch #90/200 · Delay 5 detik · ETA 12 menit         │
│                                                       │
│  [⏸ Pause]  [⏹ Stop]  [🔄 Retry Failed]              │
└──────────────────────────────────────────────────────┘
```

### 4. Keamanan (Safety Settings)

```
┌──────────────────────────────────────────────────────┐
│  Pengaturan Keamanan Broadcast                        │
│                                                       │
│  Jam Kerja                                            │
│  Mulai     [08:00]  WIB                              │
│  Selesai   [20:00]  WIB                              │
│                                                       │
│  Rate Limit                                           │
│  Max / Menit   [10]                                  │
│  Max / Jam     [200]                                 │
│  Max / Hari    [1000]                                 │
│                                                       │
│  Queue Limit    [5000]   penerima                    │
│                                                       │
│  Retry                                                │
│  Max Retry     [3]                                   │
│  Retry Delay   [60]      menit                       │
│                                                       │
│  [Simpan]                                             │
└──────────────────────────────────────────────────────┘
```

### 5. Provider

```
┌──────────────────────────────────────────────────────┐
│  WhatsApp Provider                                    │
│                                                       │
│  Provider Aktif                                       │
│  [▼ Evolution API                     ]               │
│                                                       │
│  ┌─ Evolution API ──────────────────────────────────┐ │
│  │ Status      🟢 Connected                         │ │
│  │ URL         https://evo.example.com               │ │
│  │ API Key     ********                              │ │
│  │ Instance    default                               │ │
│  │ Mode        Production                            │ │
│  │ [Test] [Edit]                                     │ │
│  ├──────────────────────────────────────────────────┤ │
│  │ ── Tersedia (Registered, inactive) ──             │ │
│  │ Official API    ⚪ Not Configured       [Setup]   │ │
│  │ Baileys         ⚪ Not Configured       [Setup]   │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 6. Template

```
┌──────────────────────────────────────────────────────┐
│  Template Pesan                                       │
│                                                       │
│  [+ Template Baru]                                    │
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │ promo_diskon            🟢 Active                │ │
│  │ Halo {{name}}, dapatkan diskon {{discount}}% ... │ │
│  │ [Edit] [Preview] [Nonaktifkan]                    │ │
│  ├──────────────────────────────────────────────────┤ │
│  │ reminder_obat           🟢 Active                │ │
│  │ {{name}}, jangan lupa ambil obat {{drug}} ...     │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 7. Statistik

```
┌──────────────────────────────────────────────────────┐
│  Statistik Broadcast (30 hari)                        │
│                                                       │
│  ┌──────────┬──────────┬──────────┬──────────┐       │
│  │ Campaign │ Terkirim │ Gagal    │ Rate     │       │
│  │    12    │  8,450   │   23     │ 99.7%    │       │
│  └──────────┴──────────┴──────────┴──────────┘       │
│                                                       │
│  Grafik Bulanan (placeholder — future)               │
│  │   ▄   ▄▄   ▄▄▄  ▄▄                               │
│  │  ██  ██▄  ███▄ ██▄ ...                            │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 8. Log

```
┌──────────────────────────────────────────────────────┐
│  Log Broadcast                                        │
│                                                       │
│  Campaign: Promo Juli 2026                            │
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Waktu        Aksi         Detail                 │ │
│  ├──────────────────────────────────────────────────┤ │
│  │ 08:00        STARTED      oleh admin@medisync    │ │
│  │ 08:00        SNAPSHOT     500 penerima           │ │
│  │ 08:05        PAUSED       oleh admin@medisync    │ │
│  │ 08:10        RESUMED      oleh admin@medisync    │ │
│  │ 10:30        COMPLETED    500/500 terkirim       │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```
