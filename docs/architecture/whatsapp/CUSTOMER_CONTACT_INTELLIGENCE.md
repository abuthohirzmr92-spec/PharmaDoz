# Customer Contact Intelligence — Architecture Blueprint

Pondasi CRM & Broadcast WhatsApp. Tidak ada kode, migration, atau implementasi.

---

## Phone Identity

Nomor HP adalah **identity anchor** Customer — bukan UUID, bukan nama, bukan email.
Semua pencarian, pencocokan, dan penyimpanan menggunakan **Normalized Phone Number**,
bukan nomor mentah.

### Identity Rules (mandatory)

| # | Rule |
|---|---|
| R1 | Nomor HP merupakan identity anchor Customer |
| R2 | Nomor HP **wajib** dinormalisasi sebelum pencarian |
| R3 | Nomor HP yang sudah ada **tidak boleh** membuat Customer baru |
| R4 | Nomor HP yang sudah ada **tidak boleh** disimpan ulang |
| R5 | Seluruh transaksi berikutnya **harus** menggunakan Customer existing |

### Unique Policy

`phone_normalized` bersifat **UNIQUE** per tenant. Tidak boleh ada dua Customer
dengan nomor HP yang sama dalam satu tenant. Database-level: `UNIQUE(tenant_id, phone_normalized)`.
Aplikasi-level: `normalizePhone()` + `SELECT` sebelum `INSERT`.

---

## Phone Normalization Layer

### Normalization Function (pure, stateless)

```
normalizePhone(raw: string): string | null

Algorithm:
  1. Strip ALL non-digit characters (spasi, dash, kurung, titik)
  2. If starts with '0',  replace prefix with '+62'
  3. If starts with '62', prepend '+'
  4. If starts with '8',  prepend '+62'      (Indonesian mobile, 10-12 digits)
  5. If already starts with '+', keep as-is
  6. Validate: 10–15 digit characters after '+'
  7. Return normalized string, or null if invalid/unparseable
```

### Examples

| Input (raw) | Output (normalized) |
|---|---|
| `0812-3456-7890` | `+6281234567890` |
| `0812 3456 7890` | `+6281234567890` |
| `+6281234567890` | `+6281234567890` |
| `6281234567890` | `+6281234567890` |
| `81234567890` | `+6281234567890` |
| `(021) 123-4567` | `+62211234567` (landline) |
| `abc` | `null` (invalid) |

### Normalization Responsibility
Normalisasi terjadi di **satu tempat** — `PhoneNormalization` pure utility.
Dipanggil oleh: checkout hook, Customer form (UI), broadcast recipient filter,
import CSV. **Tidak** diduplikasi di mana pun.

---

## Checkout Flow (Phone Identity)

```
CHECKOUT SUCCESS (TransactionService.recordSale)
   │
   ├─ Kasir mengisi Nomor HP?
   │
   ├─ TIDAK ──▶ Checkout selesai. Transaksi tetap berhasil.
   │            Customer Intelligence TIDAK aktif untuk transaksi ini.
   │
   └─ YA ──▶ normalizePhone(raw)
                │
                ├─ null (invalid) ──▶ Abaikan. Checkout tetap berhasil.
                │
                └─ normalized ──▶ SELECT FROM customers
                                    WHERE phone_normalized = ? AND tenant_id = ?
                    │
                    ├─ FOUND ──▶ Customer EXISTING
                    │            • JANGAN buat Customer baru
                    │            • JANGAN simpan nomor lagi
                    │            • JANGAN ubah nama Customer
                    │            • Hubungkan transaksi → customer.id
                    │            • UPDATE customer_stats (increment)
                    │
                    └─ NOT FOUND ──▶ Customer BARU
                                     • INSERT customers(name, phone, phone_normalized)
                                     • INSERT customer_stats(customer_id, ...)
                                     • Hubungkan transaksi → customer.id
```

**Aturan kunci:**
- Nomor HP **OPSIONAL** — Kasir tidak boleh dipaksa.
- Jika nomor tidak diisi, checkout **tetap berhasil**.
- Jika nomor invalid (gagal normalisasi), **diabaikan** — checkout tetap berhasil.
- Nama Customer existing **tidak pernah** di-overwrite otomatis oleh input Kasir.

---

## Customer Name Policy

| Skenario | Tindakan |
|---|---|
| Kasir mengetik nama "Budi" saat checkout, HP sudah ada sebagai "Budi Santoso" | Customer "Budi Santoso" tetap dipakai. Nama TIDAK diubah. |
| Kasir tidak mengisi nama, hanya nomor HP | Customer dibuat dengan `name = NULL`. Bisa diisi nanti via Customer Management. |
| Admin ingin mengubah nama Customer | Harus melalui halaman **Customer Management** (Platform), bukan dari Kasir. |

**Rasional:** Nama Customer adalah data master. Kasir adalah titik transaksi cepat —
tidak boleh menjadi pemutakhir data master secara tidak sengaja.

---

## Customer Statistics — Auto-Update Flow

```
Customer Statistics diperbarui SETIAP transaksi yang terhubung Customer:

TransactionService.recordSale()
  → Extension Bus: after.sale
     → CustomerIntelligenceService.updateStats(customerId, sale)
        → customer_stats.total_transactions   += 1
        → customer_stats.total_spent          += sale.amount
        → customer_stats.total_items          += sale.itemCount
        → customer_stats.largest_purchase      = MAX(current, sale.amount)
        → customer_stats.last_purchase_amount  = sale.amount
        → customer_stats.first_purchase_at    ??= now
        → customer_stats.last_purchase_at      = now
        → recomputeSegment(customerId)
```

### Statistic Definitions

| Metric | Source | Formula |
|--------|--------|---------|
| Total Transaction | `COUNT(transactions WHERE customer_id)` | Counter di stats |
| Total Purchase | `SUM(amount)` | Akumulasi di stats |
| Total Item | `SUM(item_count)` | Akumulasi di stats |
| Largest Purchase | `MAX(amount)` | Dibandingkan tiap transaksi |
| Average Purchase | `total_spent / total_transactions` | Computed on read |
| Last Purchased Product | `transactions.product_name ORDER BY created_at DESC LIMIT 1` | Query on demand |
| First Transaction | `MIN(created_at)` | `first_purchase_at` |
| Last Transaction | `MAX(created_at)` | `last_purchase_at` |
| Days Since Last Purchase | `NOW() - last_purchase_at` | Computed on read |
| Visit Frequency | `total_transactions / weeksSince(first_purchase_at)` | Computed on read |

---

## Duplicate Prevention Strategy

### Database Level
- `UNIQUE(tenant_id, phone_normalized)` constraint — mencegah duplikasi di level DB.

### Application Level
1. `normalizePhone(raw)` — pastikan format konsisten.
2. `SELECT ... WHERE phone_normalized = ?` — cek sebelum INSERT.
3. `INSERT ... ON CONFLICT (tenant_id, phone_normalized) DO NOTHING` — safe insert.
4. Jika terjadi race (dua checkout simultan dengan nomor yang sama), ON CONFLICT
   menangani — pemenang INSERT, yang kalah DO NOTHING lalu re-query untuk
   mendapatkan ID.

### Merge Existing Duplicates (admin tool)
Jika duplikat ditemukan (mis. dari data migration lama):
1. Admin melihat daftar potensi duplikat (sama `phone_normalized`).
2. Admin memilih survivor.
3. Re-point semua transaction non-survivor → survivor.id.
4. Recompute survivor stats.
5. Soft-delete non-survivor.

---

## Future Extension Points

Customer Contact Intelligence menjadi **single source of truth** untuk identitas
pelanggan. Berikut adalah konsumen masa depan yang **tidak memerlukan perubahan
identity model**:

| Fitur | Konsumen | Data yang dipakai |
|-------|----------|-------------------|
| WhatsApp Broadcast | WhatsApp Broadcast Engine | `phone_normalized`, `segment`, stats |
| Reminder Otomatis | Reminder Service (SLE) | `days_since_last`, `has_purchased_category` |
| Membership | Membership Engine (future) | `total_spent`, `joined_at` |
| Loyalty Program | Loyalty Engine (future) | `total_transactions`, `total_spent` |
| AI Recommendation | AI Engine (future) | Purchase history, categories |
| Customer Intelligence | Analytics Dashboard (future) | Stats aggregation by segment |

---

## 1. Domain Model

```
Customer (phone = identity anchor)
  ├── id (UUID)
  ├── tenant_id (FK → tenants)
  ├── name (nullable — could be "Pelanggan")
  ├── phone (VARCHAR, normalized +62)
  ├── phone_normalized (VARCHAR UNIQUE per tenant — strip spaces, +62 prefix)
  ├── segment (computed, updated after each transaction)
  ├── joined_at (first transaction date)
  │
  ├──< Transaction[] (1:N via transaction.customer_id FK)
  │
  └──< CustomerStats (1:1, updated on every checkout success)
        ├── total_transactions INT
        ├── total_spent DECIMAL(12,2)
        ├── total_items INT
        ├── largest_purchase DECIMAL(12,2)
        ├── last_purchase_amount DECIMAL(12,2)
        ├── first_purchase_at TIMESTAMPTZ
        ├── last_purchase_at TIMESTAMPTZ
        ├── visit_frequency FLOAT (transactions per week)
        └── days_since_last INT (computed on read)
```

---

## 2. Phone as Identity — Duplicate Detection Strategy

### Normalization Pipeline (pure function)
```
normalizePhone(raw: string): string | null
  1. Strip all non-digit characters
  2. If starts with '0',  replace with '+62'
  3. If starts with '62', prepend '+'
  4. If starts with '8',  prepend '+62'
  5. Validate: length 10-15 digits after '+'
  6. Return normalized, or null if invalid
```

### Duplicate Resolution
```
Checkout flow:
  1. Kasir inputs phone (optional)
  2. normalizePhone(raw) → normalized
  3. SELECT FROM customers WHERE phone_normalized = ? AND tenant_id = ?
     → FOUND: link transaction to existing customer
     → NOT FOUND: INSERT new customer (name, phone, phone_normalized)
  4. UPDATE customer_stats (increment counters)
```

### Merge Strategy (future)
- Jika terdeteksi dua customer dengan `phone_normalized` yang sama (race / manual entry error):
  1. Pilih customer tertua (`MIN(joined_at)`) sebagai survivor
  2. Re-point semua transaction → survivor.id
  3. Recompute stats survivor
  4. Soft-delete duplikat
- Admin trigger via Platform UI (Customer Merge tool)

### Number Change (future)
- Customer mengaku ganti nomor → Admin merges old → new
- Old phone disimpan di `customer_phone_history(previous_phone, changed_at)`

---

## 3. Transaction Linkage (Checkout Success Hook)

### Flow
```
Cashier Checkout Success
  → TransactionService.recordSale(...)
  → after-hook: CustomerIntelligenceService.updateCustomer(tenantId, phone, transactionData)
     → normalizePhone(raw) → phone_normalized
     → upsertCustomer(tenantId, phone_normalized, name)
     → incrementStats(customerId, amount, itemCount)
     → recomputeSegment(customerId)
```

### Integration Point
```
Extension Bus (ADR-39):
  bus.on("after.sale", updateCustomerContact)
```
Nol perubahan pada TransactionService. Hook dipasang via Extension Bus.

---

## 4. Customer Statistics — Auto-Computed

### Stats Table
```
customer_stats (1:1 with customer, updated on checkout)
  customer_id UUID PK FK
  total_transactions INT DEFAULT 0
  total_spent DECIMAL(12,2) DEFAULT 0
  total_items INT DEFAULT 0
  largest_purchase DECIMAL(12,2) DEFAULT 0
  last_purchase_amount DECIMAL(12,2) DEFAULT 0
  first_purchase_at TIMESTAMPTZ
  last_purchase_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

### Increment Logic (pure function, called on checkout)
```
function incrementStats(current: Stats, saleAmount: number, itemCount: number): Stats {
  return {
    total_transactions: current.total_transactions + 1,
    total_spent: current.total_spent + saleAmount,
    total_items: current.total_items + itemCount,
    largest_purchase: Math.max(current.largest_purchase, saleAmount),
    last_purchase_amount: saleAmount,
    first_purchase_at: current.first_purchase_at ?? nowISO,
    last_purchase_at: nowISO,
  }
}
```

Computed on read (not stored):
- `visitFrequency = total_transactions / weeksSince(first_purchase_at)`
- `daysSinceLast = daysBetween(last_purchase_at, now)`

---

## 5. Customer Segmentation — Auto-Computed

### Segment Rules (config-driven, via subscription_settings)

```
whatsapp.segmentation.rules:
  new:         total_transactions = 1 AND days_since_last <= 30
  returning:   total_transactions >= 2 AND days_since_last <= 30
  loyal:       total_transactions >= 10 AND days_since_last <= 60
  inactive:    days_since_last > 60 AND days_since_last <= 180
  lost:        days_since_last > 180
  vip:         total_spent >= 5_000_000 OR total_transactions >= 50
```

### Recompute Trigger
Setiap kali `customer_stats` di-update → recompute segment.
Segment disimpan di `customers.segment` (VARCHAR) untuk query cepat.

### Pure Segment Resolver
```
function resolveSegment(stats: Stats, rules: SegmentRule[]): string {
  // Evaluate rules in priority order (vip first, then loyal, etc.)
  // Returns the first matching segment label
}
```

---

## 6. Broadcast Targeting — Filter-Based (NOT Manual Number Picking)

### Target Model (conceptual)
```
WhatsApp Campaign → Recipient Filter (bukan daftar nomor manual)

Filters (composable — AND logic):
  segment IN ['loyal', 'vip']
  days_since_last >= 30
  days_since_last >= 90
  total_transactions > 10
  total_spent > 5000000
  has_purchased_category 'vitamin'    ← BUTUH: product sales join
  has_purchased_category 'diabetes'
  has_purchased_category 'susu_anak'
  joined_between '2025-01-01' AND '2025-06-30'
  last_purchase_between '2025-01-01' AND NOW()
  broadcast_received < 3              ← BUTUH: broadcast_log join
```

### Filter Engine (pure)
```
function applyFilters(customers[], filters: Filter[]): Customer[] {
  return customers.filter(c => filters.every(f => f.evaluate(c)));
}
```

### Resolve Delivery
Filter menghasilkan array `customer_id[]` → Recipient Engine menerima array ini
sebagai input daftar penerima → Broadcast Queue.

---

## 7. Customer Dashboard — Blueprint

```
Platform → Pelanggan → [ID]

┌──────────────────────────────────────────────────────┐
│  Pelanggan: +628123456789                             │
│  Segment: 🟢 Loyal · Bergabung 10 Jan 2025            │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─ Ringkasan ──────────────────────────────────────┐ │
│  │ Total Transaksi    42                             │ │
│  │ Total Pembelian    Rp 8,450,000                   │ │
│  │ Transaksi Terakhir 25 Juli 2026                    │ │
│  │ Pembelian Terbesar Rp 1,200,000                   │ │
│  │ Frekuensi          2.3x / minggu                  │ │
│  │ Hari Sejak Terakhir 3 hari                         │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─ Broadcast ──────────────────────────────────────┐ │
│  │ Total Broadcast Diterima  8                       │ │
│  │ Broadcast Terakhir        20 Juli 2026            │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─ Timeline ───────────────────────────────────────┐ │
│  │ 10 Jul  Pembelian Rp 350,000                      │ │
│  │ 15 Jul  Broadcast Promo Juli                       │ │
│  │ 20 Jul  Pembelian Rp 220,000                      │ │
│  │ 25 Jul  Reminder Refill Obat                       │ │
│  │ 31 Jul  Broadcast Vitamin                          │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## 8. Customer List / Segmentation View

```
Platform → Pelanggan

Filter: [▼ Segment] [▼ Rentang Tanggal] [🔍 Nama/HP]

┌──────────────────────────────────────────────────────────────┐
│ Nama          HP              Segment   Total     Terakhir  │
├──────────────────────────────────────────────────────────────┤
│ Ibu Sari     +62812...       🟢 Loyal   Rp 8.4jt  3 hr     │
│ Bpk Budi     +62813...       🟡 New     Rp 150rb  1 hr     │
│ Ani          +62815...       🔴 Inactive Rp 2.1jt  95 hr   │
│ ...                                                          │
└──────────────────────────────────────────────────────────────┘

Aksi: [Kirim Broadcast ke Segment Ini] [Export]
```

---

## 9. Future-Ready Extensions

| Fitur | Pondasi yang sudah ada di blueprint |
|-------|--------------------------------------|
| **WhatsApp Broadcast** | Customer phone normalized + segment filter → Recipient Engine |
| **Reminder Otomatis** | `days_since_last` + `has_purchased_category` → trigger Reminder Service |
| **CRM** | Customer timeline + stats + segment |
| **Loyalty Program** | `total_spent` + `visit_frequency` → tier calculation |
| **Membership** | Extend customer with `membership_level`, `points` |
| **Kupon** | Segment filter + `total_spent` → targeted coupon distribution |
| **Point Reward** | `total_transactions` → point accrual rule |
| **AI Recommendation** | `has_purchased_category` + frequency → ML feature vector |
| **Analitik Pelanggan** | Stats aggregation by segment, cohort, RFM |

---

## 10. Dependency on Existing Infrastructure

| Existing Component | Usage |
|--------------------|-------|
| `transactions` table | Source of customer stats (read on checkout) |
| `Extension Bus` (ADR-39) | Hook `after.sale` → update customer |
| `subscription_settings` | Segment rules, normalization config |
| `Repository Pattern` | `CustomerRepository`, `CustomerStatsRepository` |
| `WhatsApp Broadcast Engine` | Target filters consume customer segments |
| `Reminder Service` (SLE) | Trigger reminders based on `days_since_last` |
| `WidgetShell` / `useAsync` | Customer Dashboard UI |

## 11. Database Impact (when implemented)

All additive:
- `customers(id, tenant_id, name, phone, phone_normalized UNIQUE(tenant, phone_normalized), segment, joined_at)`
- `customer_stats(customer_id PK FK, total_transactions, total_spent, total_items, largest_purchase, last_purchase_amount, first_purchase_at, last_purchase_at)`
- `customer_phone_history(id, customer_id, previous_phone, changed_at)` (future)

Zero modification to existing tables. `transactions.customer_id` nullable FK.

## 12. Architecture Compliance

| Prinsip | Terpenuhi |
|----------|:---:|
| Single Source of Truth | `customer_stats` — satu row per customer, di-update atomic |
| Config-Driven | Segment rules from `subscription_settings`, nol hardcode |
| Reuse Existing | Extension Bus, Repository Pattern, transaction flow |
| Pure Helpers | `normalizePhone`, `incrementStats`, `resolveSegment`, `applyFilters` |
| Database Additive | New tables only, nol ALTER existing |
| Provider-Agnostic (Broadcast) | Customer engine tidak tahu provider WhatsApp |
| Privacy-Aware | Phone normalized, history tracked, merge supported |
