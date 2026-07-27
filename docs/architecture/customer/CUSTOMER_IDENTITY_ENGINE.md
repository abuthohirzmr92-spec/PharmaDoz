# Customer Identity Engine — Architecture Blueprint

The **single entry point** for customer identity resolution. Every module in
MEDISYNC that needs to identify a customer MUST use this engine. No direct
lookups. No duplicate normalization logic. No bypass.

---

## 1. Vision

Customer Identity Engine is the **single source of truth** for WHO a customer is.
It answers exactly one question: *"Who is this?"* — and nothing else.

All identity concerns (phone normalization, duplicate detection, merge, consent,
audit) live here. All intelligence concerns (statistics, segmentation, broadcast,
reminders, loyalty, recommendations) live in `Customer Contact Intelligence` and
CONSUME identity through this engine.

---

## 2. Responsibility

### ✅ Engine owns:
- Identity Resolution
- Phone Normalization
- Duplicate Detection
- Customer Lookup (by phone, by id)
- Customer Linking (transaction → customer)
- Customer Merge
- Identity Confidence
- Verification Status
- Contact Consent
- Contact Channel Preference
- Identity Audit

### ❌ Engine does NOT own:
- Customer Statistics → `Customer Contact Intelligence`
- Broadcast → `WhatsApp Broadcast Engine`
- Reminder → `Reminder Service` (SLE)
- Loyalty → Future domain
- Membership → Future domain
- Segmentation → `Customer Contact Intelligence`
- AI Recommendation → Future domain
- Purchase Analytics → `Customer Contact Intelligence`

---

## 3. Domain Boundary

```
┌─────────────────────────────────────────────────────────────┐
│                CUSTOMER IDENTITY ENGINE                      │
│  (WHO — identity resolution, phone, consent, audit)          │
│                                                              │
│  NormalizePhone · LookupCustomer · LinkCustomer · MergeCust  │
│  IdentityConfidence · Consent · ChannelPreference · Audit    │
└────────────┬────────────────────────────────────────────────┘
             │ provides IdentityResolution
             ▼
┌─────────────────────────────────────────────────────────────┐
│            CUSTOMER CONTACT INTELLIGENCE                     │
│  (WHAT — statistics, segmentation, targeting, timeline)      │
│                                                              │
│  CustomerStats · Segment · BroadcastTarget · Timeline        │
└────────────┬────────────────────────────────────────────────┘
             │ provides targeting / scheduling input
     ┌───────┴──────────┬──────────────────┐
     ▼                  ▼                  ▼
┌──────────┐    ┌────────────┐    ┌──────────────┐
│Broadcast │    │  Reminder  │    │   Loyalty    │
│ Engine   │    │  Service   │    │  (future)    │
└──────────┘    └────────────┘    └──────────────┘
```

**Rule:** No module may perform a direct customer lookup (`SELECT FROM customers`)
except the Identity Engine. All modules go through `IdentityEngine.resolve()`.

---

## 4. Identity Flow

```
Any Module (Kasir, Broadcast, Reminder, Import, API, ...)
   │
   ▼
Customer Identity Engine
   │
   ├─ 1. Normalize Identity (phone → normalized)
   ├─ 2. Validate Identity (format, blacklist check)
   ├─ 3. Lookup Existing Customer (by normalized phone)
   ├─ 4. Duplicate Detection (check multiple candidates)
   ├─ 5. Identity Resolution (decide: existing / new / duplicate-candidate / anonymous)
   ├─ 6. Link Customer (transaction → customer.id)
   └─ 7. Return IdentityResult { customerId, confidence, status, consent }
```

Every module follows the **exact same flow**. No exceptions. No shortcuts.

---

## 5. Identity Resolution

The engine resolves a normalized phone into one of five outcomes:

| Resolution | Condition | Action |
|-----------|-----------|--------|
| **Existing** | Exact match on `phone_normalized`, single row | Return `customerId` |
| **Anonymous** | No phone provided (null input) | Return `anonymous` — no customer linked |
| **Duplicate Candidate** | Multiple rows match → merge required | Flag for admin review; return oldest `customerId` |
| **New Customer** | No match, phone valid | INSERT customer; return new `customerId` |
| **Invalid** | Phone fails normalization/validation | Reject — do not create customer |

### Resolution Algorithm (pure logic — no I/O)

```
function resolveIdentity(
  normalizedPhone: string | null,
  existingMatches: Customer[],
): IdentityResult {
  if (normalizedPhone === null)   return { status: 'anonymous' };
  if (existingMatches.length === 1) return { status: 'existing', customerId: matches[0].id };
  if (existingMatches.length > 1)   return { status: 'duplicate_candidate', customerId: matches[0].id, candidates: matches };
  return { status: 'new' };
}
```

---

## 6. Phone Normalization — SINGLE Location

Only the Identity Engine may normalize phone numbers. This is enforced by
design: `normalizePhone()` is a **module-private** pure function inside the
engine. All other modules call `IdentityEngine.resolve(phone)` — they never
call `normalizePhone()` directly.

### Contract (identical to CCI blueprint)
```
normalizePhone(raw: string): string | null
  1. Strip non-digit chars
  2. Map Indonesian prefixes: 0→+62, 62→+62, 8→+628
  3. Validate 10-15 digits after '+'
  4. Return normalized or null
```

---

## 7. Duplicate Detection

### Prevention (proactive)
- `UNIQUE(tenant_id, phone_normalized)` on `customers` — prevents INSERT of duplicate.

### Detection (reactive)
- Periodic scan: `SELECT phone_normalized, COUNT(*) FROM customers GROUP BY phone_normalized, tenant_id HAVING COUNT(*) > 1`.
- Flag candidates → Platform UI → Admin review.

### Race Condition Strategy
```
Two concurrent checkouts with same new phone:
  Checkout-A: SELECT → no match → INSERT (wins)
  Checkout-B: SELECT → no match → INSERT → UNIQUE violation
  → ON CONFLICT DO NOTHING → re-SELECT → gets Checkout-A's customer
  → Link transaction to existing customer
```

### Conflict Resolution
- Survivor = oldest `customer_id` (by `joined_at`).
- Admin confirms merge via Platform UI.

---

## 8. Merge Strategy

### Steps (admin-initiated)
1. Admin selects survivor + victims via Platform UI
2. `IdentityEngine.merge(survivorId, victimIds)`
   a. Re-point ALL `transactions.customer_id` from victim → survivor
   b. Recompute `customer_stats` for survivor
   c. Record `identity_audit_log( action='merge', survivor, victims )`
   d. Record `customer_phone_history` (victim phones → history)
   e. Soft-delete victims (`deleted_at = NOW()`)

### Rollback
- `customer_phone_history` + `identity_audit_log` allow full reconstruction.
- Unmerge = re-point transactions back + reactivate victims.

---

## 9. Identity Confidence

| Level | Meaning | Trigger |
|-------|---------|---------|
| **Verified** | Identity confirmed (e.g., OTP verified) | Phone verification flow (future) |
| **Trusted** | Multiple successful transactions, long history | Auto-promoted after N transactions (config) |
| **Anonymous** | No phone provided | Checkout without phone |
| **Merged** | Created from duplicate merge | Admin merge action |
| **Unknown** | Newly created, single transaction, no verification | Default for new customers |

Stored in `customers.identity_confidence`. Consumed by Broadcast (prioritize
verified/trusted), Reminder, and future loyalty/membership.

---

## 10. Verification Status

| Status | Meaning | Action |
|--------|---------|--------|
| `unverified` | Default — phone not verified | Can be used; lower confidence |
| `verified` | Phone verified (OTP / callback) | Full confidence |
| `invalid` | Phone known to be unreachable (bounce/off) | Skip in broadcasts |
| `blacklisted` | Spam / abuse / opt-out | Never contact |
| `opt_out` | Customer explicitly opted out of ALL contact | Never contact; flag respected everywhere |

---

## 11. Contact Consent

### Consent Types
| Type | Meaning | Default |
|------|---------|:---:|
| `marketing` | Promo, campaign, discount offers | `false` |
| `reminder` | Refill, pickup, payment reminders | `true` |
| `operational` | Transaction receipts, system alerts | `true` |

### Consent Model
```
customers.consent JSONB:
{
  "marketing": {
    "status": "granted",
    "granted_at": "2026-01-15T...",
    "source": "checkout_opt_in",
    "channel": "whatsapp"
  },
  "reminder":   { "status": "granted", ... },
  "operational": { "status": "granted", ... }
}
```

### Consent History
`identity_audit_log` records every consent change: who, when, source, old value,
new value.

### Broadcast Integration
Before sending a broadcast, the Engine checks:
1. `consent.marketing.status === 'granted'` → send
2. `verification_status !== 'blacklisted' && !== 'opt_out'` → send
3. Otherwise → skip, log as consent-rejected

---

## 12. Contact Channel Preference

| Channel | Status (current) | Priority |
|---------|:---:|:---:|
| WhatsApp | 🟢 Active | 1 |
| SMS | ⚪ Future | 2 |
| Email | ⚪ Future | 3 |
| Push Notification | ⚪ Future | 4 |
| Telegram | ⚪ Future | 5 |

Stored in `customers.channel_preferences JSONB`:
```
{ "whatsapp": { "enabled": true, "priority": 1 }, "sms": { "enabled": false } }
```

Broadcast engine reads this to determine delivery channel. Customer can update
via future Preference Center.

---

## 13. Customer Status

| Status | Meaning |
|--------|---------|
| `active` | Normal — receiving broadcasts, reminders |
| `inactive` | No transactions > 180 days |
| `blocked` | Admin-blocked (fraud, abuse) |
| `archived` | Soft-deleted, retained for audit |
| `anonymous` | Transacted without phone (not stored) |

Status machine:
```
active ←→ inactive (auto by days_since_last)
active → blocked (admin)
blocked → active (admin unblock)
active → archived (soft delete)
```

---

## 14. Identity Audit

### Audit Table: `identity_audit_log`
```
id, customer_id, tenant_id, action, actor_id,
metadata JSONB (before, after, reason),
created_at
```

### Actions logged
- `customer_created` (via checkout, import, API)
- `identity_resolved` (lookup hit)
- `phone_updated` (old → new, with history)
- `identity_merged` (survivor + victims)
- `consent_updated` (who changed what, source)
- `verification_changed` (unverified → verified → invalid)
- `status_changed` (active → blocked → archived)
- `channel_preference_updated`

### Identity Timeline (per customer)
Concatenated from `identity_audit_log WHERE customer_id = X ORDER BY created_at`.

---

## 15. Household Extension (Future)

```
customers.household_id (nullable FK → households, future)

households:
  id, tenant_id, name, primary_contact_id (FK → customers)

Use case: "Keluarga Budi" — Ayah, Ibu, Anak, Wali.
Shared family account. Broadcast to household = deduplicate by household_id.
```

Not implemented now. Extension point reserved via nullable `household_id`.

---

## 16. Future Extension Points

| Domain | Integration | Impact on Identity Engine |
|--------|-------------|:---:|
| WhatsApp Broadcast | Reads `phone_normalized`, `consent.marketing` | NONE |
| Reminder (SLE) | Reads `phone_normalized`, `consent.reminder` | NONE |
| Membership | Reads `identity_confidence`, `joined_at` | NONE |
| Loyalty | Reads `joined_at`, `status` | NONE |
| AI Recommendation | Reads purchase history (via CCI) | NONE |
| REST API | Calls `IdentityEngine.resolve()` | NONE |
| Mobile App | Calls `IdentityEngine.resolve()` | NONE |
| Import CSV | Calls `IdentityEngine.resolve()` per row | NONE |
| OTP Verification | Writes `verification_status` | Add `verifyPhone()` method |
| Household | Reads/writes `household_id` | Add nullable FK |

**Identity Engine remains unchanged** as downstream domains are added.

---

## 17. Integration Points

### Entry Points (all modules MUST use)

```
Kasir → IdentityEngine.resolve(phone, tenantId) → customerId
Customer Management → IdentityEngine.lookupById(customerId) → Customer
Import CSV → IdentityEngine.resolveBatch(phones[], tenantId) → customerId[]
Broadcast → IdentityEngine.resolveTargets(filter) → customerId[]
Reminder → IdentityEngine.resolveTargets(filter) → customerId[]
REST API → IdentityEngine.resolve(phone, tenantId) → customerId
Mobile App → IdentityEngine.resolve(phone, tenantId) → customerId
```

### Hard dependency rule
- **NO** module may `SELECT FROM customers` directly.
- **NO** module may call `normalizePhone()` outside the engine.
- **NO** module may `INSERT INTO customers` directly.
- **ALL** identity operations go through `Customer Identity Engine`.

---

## 18. Self Review

| Requirement | Status | Section |
|---|---|---|
| Semua modul memakai Customer Identity Engine | ✅ | §17 |
| Tidak ada lookup customer langsung | ✅ | §3, §17 |
| Identity terpisah dari Intelligence | ✅ | §2, §3 |
| Broadcast tidak tahu struktur Customer | ✅ | §16 (reads via engine) |
| Reminder tidak tahu struktur Customer | ✅ | §16 |
| Loyalty tidak tahu struktur Customer | ✅ | §16 |
| Tidak ada duplicate customer | ✅ | §7 (DB + app guard) |
| Single Normalization | ✅ | §6 |
| Identity Confidence | ✅ | §9 (5 tiers) |
| Verification Status | ✅ | §10 (5 statuses) |
| Contact Consent | ✅ | §11 (3 types + history) |
| Channel Preference | ✅ | §12 (5 channels) |
| Customer Status | ✅ | §13 (5 states) |
| Duplicate Detection + Merge | ✅ | §7 + §8 |
| Household Extension | ✅ | §15 (future) |
| Future Ready | ✅ | §16 (10 extension points) |
| Audit | ✅ | §14 (8 action types) |
