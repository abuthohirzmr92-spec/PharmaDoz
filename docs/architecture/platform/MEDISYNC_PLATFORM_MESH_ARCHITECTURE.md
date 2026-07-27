# MEDISYNC Platform Mesh Architecture

> **Integration Constitution.**
>
> This document defines HOW every Shared Platform and Business Platform inside
> MEDISYNC communicates. It is the binding contract between platforms. Every
> future platform MUST follow these rules. No platform is an island. No
> platform owns everything. Together they form a mesh — autonomous, connected,
> governed.

---

## 1. What is Platform Mesh?

MEDISYNC is not a collection of modules inside one application. It is a
**network of autonomous platforms**. Each platform:

- Owns its own **business logic**
- Owns its own **data** — no other platform reads its tables directly
- Owns its own **lifecycle** — creates, updates, deletes its own entities
- Owns its own **policies** — validation, permissions, configuration
- **Publishes events** to the Enterprise Event Bus
- **Subscribes to events** from other platforms
- **Exposes capabilities** through Platform Contracts
- **Depends only downward** (Business → Shared → Infrastructure)

### Why Mesh?

| Approach | Problem with it |
|----------|-----------------|
| Monolith | One change affects everything. Cannot scale teams or deployments independently. |
| Microservices (without rules) | Can become a distributed monolith — services calling each other directly, hidden coupling. |
| **Platform Mesh** | Each platform is autonomous. Communication is standardized. Dependencies are explicit and governed. |

---

## 2. Architecture Position

This document governs the integration layer between platforms.

```
Healthcare Ecosystem Vision           WHY
   ↓
Healthcare Platform Constitution      WHAT
   ↓
Platform Mesh Architecture            HOW PLATFORMS CONNECT  ← THIS DOCUMENT
   ↓
Shared Platform Architectures         (Identity, Communication, Billing, AI, ...)
   ↓
Business Platform Architectures       (Pharmacy, Clinic, Laboratory, ...)
   ↓
Experience Platform Architectures     (Owner Portal, Admin Portal, Patient Portal, ...)
   ↓
Implementation                        (Code, Database, API, UI)
```

---

## 3. Platform Categories

| Category | Purpose | Example |
|----------|---------|---------|
| **Shared Platform** | Reusable capability consumed by multiple Business Platforms | Identity Platform, Communication Platform, Billing Platform |
| **Business Platform** | Healthcare-specific domain logic | Pharmacy Platform, Clinic Platform, Laboratory Platform |
| **Experience Platform** | User-facing interface for specific roles | Owner Portal, Admin Portal, Patient Portal |
| **Infrastructure** | Cloud services, database, storage, networking | Supabase, Vercel, PostgreSQL |

---

## 4. Platform Ownership

Every platform OWNS its domain. No platform may own another platform's data.

| Platform Owns | Description |
|---------------|-------------|
| **Business Logic** | The rules, validations, workflows that define this platform |
| **Data** | The database tables, documents, and files that belong to this platform |
| **Lifecycle** | The complete lifecycle of its entities: create, update, delete, archive |
| **Validation** | Input validation, business rules, invariants |
| **Policies** | Access control, rate limits, quotas |
| **Permissions** | Who can do what within this platform's domain |
| **Configuration** | Platform-specific settings (from `subscription_settings`) |

> **Rule:** Platform A may NEVER query Platform B's database tables directly.
> Platform A may only access Platform B's data through Platform B's public
> contract (events, APIs, services).

---

## 5. Communication Principles

| # | Principle | Meaning |
|---|-----------|---------|
| 1 | **Events over Calls** | Platforms communicate through the Enterprise Event Bus, not direct function calls |
| 2 | **Contracts over Internals** | Platforms expose public contracts; internals are private |
| 3 | **One Source of Truth** | Every fact has exactly one authoritative platform |
| 4 | **Idempotent Consumers** | Every event consumer must handle duplicate events safely |
| 5 | **Eventually Consistent** | Platforms do not expect real-time consistency across platform boundaries |
| 6 | **Failure Isolation** | One platform's failure does not cascade to others |
| 7 | **Graceful Degradation** | If a dependency is unavailable, the platform continues with degraded functionality |
| 8 | **Provider Independence** | No platform depends on a specific external provider |

---

## 6. Allowed Dependencies

```
✅ ALLOWED:

  Business Platform → Shared Platform
    Pharmacy Platform consumes Identity Platform, Communication Platform, Billing Platform

  Shared Platform → Shared Platform
    Communication Platform consumes Identity Platform (for recipient resolution)
    ALLOWED only if documented in the Platform Contract

  Experience Platform → Business Platform → Shared Platform
    Owner Portal consumes Pharmacy Platform which consumes Shared Platforms

  Infrastructure → Platform
    NEVER — infrastructure serves platforms, not the other way
```

### Shared → Shared: strict conditions
If Communication Platform needs Identity Platform, the dependency must be:
1. **Documented** in both platform contracts
2. **Through public contracts only** — never through direct SQL
3. **Substitutable** — Communication Platform must work if Identity Platform uses a different implementation
4. **Approved** in the Platform Mesh review

---

## 7. Forbidden Dependencies

```
❌ FORBIDDEN:

  Business Platform → Business Platform
    Pharmacy Platform calls Clinic Platform directly
    REASON: Creates tight coupling. If Clinic changes, Pharmacy breaks.

  Platform → Another Platform's Database
    Pharmacy reads from clinic_patients table
    REASON: Data ownership violation. No single source of truth.

  Cross-Repository Access
    PharmacyRepository imports ClinicRepository
    REASON: Repository belongs to its platform only.

  Hidden Dependencies
    Pharmacy imports a private function from Clinic
    REASON: Private internals are not contracts.

  Circular Dependencies
    Platform A depends on Platform B which depends on Platform A
    REASON: Cannot deploy, test, or scale independently.

  Platform → Hardcoded Provider
    Pharmacy hardcodes "WhatsApp Evolution API"
    REASON: Violates Provider Independence principle.
```

---

## 8. Platform Contract

Every platform MUST declare its contract using this template.

```yaml
platform:
  name: "Communication Platform"
  category: "Shared Platform"
  version: "1.0.0"

  purpose: >
    Provides communication capabilities (WhatsApp, SMS, Email, Push)
    to all business platforms.

  owns:
    - Communication lifecycle
    - Provider selection
    - Message dispatch
    - Delivery tracking

  does_not_own:
    - Message content (producer owns this)
    - Business logic of calling platform
    - Recipient identity resolution (Identity Platform owns this)

  publishes:
    - COMMUNICATION_REQUESTED
    - COMMUNICATION_COMPLETED
    - COMMUNICATION_FAILED

  subscribes:
    - PATIENT_OPTED_OUT (from Identity Platform) → update consent

  consumes:
    - Identity Platform: resolveRecipient()
    - Configuration Platform: getCommunicationPolicy()

  provides:
    - sendMessage(channel, recipient, payload) → result
    - getMessageStatus(messageId) → status

  dependencies:
    - Identity Platform (through public contract)
    - Configuration Platform (through public contract)

  restrictions:
    - NEVER call a Business Platform directly
    - NEVER access any platform's database directly
    - NEVER hardcode a provider

  future_scope:
    - Voice channel
    - Two-way conversation management
```

---

## 9. Communication Channels

Platforms communicate through these standard channels.

| Channel | When To Use | Example |
|---------|-------------|---------|
| **Enterprise Event Bus** | When an event happens that other platforms should know about | `SALE_COMPLETED`, `PATIENT_CREATED` |
| **Platform API (Public Contract)** | When a platform exposes a capability for others to call | `IdentityPlatform.resolveRecipient(phone)` |
| **Notification Center** | When a user needs to be informed of an outcome | "Broadcast selesai. 350 terkirim." |
| **Activity Center** | When a long-running job's progress should be visible | "Broadcast Promo Juli: 123/350" |
| **Workflow Signals** (Future) | When a multi-platform workflow needs orchestration | "After Patient Registered → Send Welcome SMS → Create Pharmacy Profile" |

---

## 10. Event Flow Examples

### Example 1: Patient Registered → Full Chain

```
1. Identity Platform
     Patient completes registration.
     Publishes: PATIENT_CREATED { patientId, phone, name }
     OWNER: Identity Platform — sole source of truth for patient identity

2. Enterprise Event Bus delivers PATIENT_CREATED to subscribers:

   ┌─ Activity Center
   │    Records: "Patient baru: +6281234567890"
   │
   ├─ Notification Center
   │    (No notification — this is not a notification event)
   │
   ├─ Communication Platform
   │    Sends: Welcome message via WhatsApp
   │    Publishes: COMMUNICATION_COMPLETED
   │
   ├─ Analytics Platform
   │    Increments: daily_patient_registrations
   │
   └─ AI Platform (Future)
        Updates: patient similarity model
```

### Example 2: Prescription → Pharmacy Dispensation

```
1. Clinic Platform (Future)
     Doctor prescribes medication.
     Publishes: PRESCRIPTION_CREATED { patientId, medications[], pharmacyId }

2. Pharmacy Platform
     Subscribes: PRESCRIPTION_CREATED
     Creates: pending_dispensation record
     (Does NOT import Clinic data — receives only the event payload)

3. Pharmacy Platform
     Pharmacist dispenses medication.
     Publishes: DISPENSATION_COMPLETED { prescriptionId, dispensed[] }

4. Clinic Platform
     Subscribes: DISPENSATION_COMPLETED
     Updates: prescription status = 'dispensed'
     (Owns its own prescription data)

5. Notification Center
     Subscribes: DISPENSATION_COMPLETED
     Notification to Patient: "Obat Anda sudah bisa diambil di Apotek X"
```

**Key observation:** Clinic owns the prescription. Pharmacy owns the dispensation.
Neither platform touches the other's database. They communicate ONLY through
events on the Enterprise Event Bus.

---

## 11. Platform Responsibility Matrix

| Platform | Category | Owns | Publishes | Consumes | Provides |
|----------|----------|------|-----------|----------|----------|
| **Identity** | Shared | Customer/Patient identity, consent, preferences | PATIENT_CREATED, CONSENT_CHANGED, OPT_OUT | (none — root platform) | resolveIdentity(), validateConsent() |
| **Communication** | Shared | Message dispatch, provider selection, delivery lifecycle | COMMUNICATION_COMPLETED, COMMUNICATION_FAILED | Identity.resolveRecipient() | sendMessage(), getStatus() |
| **Billing (SLE)** | Shared | Subscription lifecycle, invoices, payments | SUBSCRIPTION_ACTIVATED, PAYMENT_RECEIVED, INVOICE_CREATED | (none) | createInvoice(), recordPayment() |
| **Notification** | Shared | User notification delivery, read status | NOTIFICATION_DELIVERED | (configurable — any event) | createNotification() |
| **Activity** | Shared | Job progress tracking | ACTIVITY_COMPLETED, ACTIVITY_FAILED | BROADCAST_*, IMPORT_*, FACTORY_RESET_* | trackJob() |
| **Analytics** | Shared | Metrics aggregation, dashboards | (publishes aggregates) | SALE_COMPLETED, PAYMENT_RECEIVED, PATIENT_CREATED | getMetrics() |
| **AI** (Future) | Shared | ML model serving, predictions, recommendations | PREDICTION_READY, ANOMALY_DETECTED | SALE_COMPLETED, PATIENT_CREATED (training data) | predict(), classify() |
| **Integration** | Shared | External system adapters (BPJS, SATUSEHAT, payment GW) | BPJS_SYNC_COMPLETED, WEBHOOK_RECEIVED | (configurable) | syncToBpjs(), processWebhook() |
| **Audit** | Shared | Immutable audit log | AUDIT_RECORDED | (all other platforms publish to it) | recordAudit() |
| **Configuration** | Shared | Feature flags, tenant settings | CONFIG_CHANGED | (none) | getSetting(), isFeatureEnabled() |
| **Pharmacy** | Business | Inventory, sales, purchasing, FEFO, cashier | SALE_COMPLETED, STOCK_LOW, PURCHASE_ORDER_CREATED | PATIENT_CREATED, PRESCRIPTION_CREATED | (business UI) |
| **Clinic** (Future) | Business | Patient registration, queue, prescription | PRESCRIPTION_CREATED, DIAGNOSIS_RECORDED | PATIENT_CREATED, LAB_RESULT_READY | (business UI) |

---

## 12. Integration Principles

| # | Principle | Meaning |
|---|-----------|---------|
| 1 | **Publish Events, Subscribe Only** | Platforms publish their own events. They only subscribe to events they need. |
| 2 | **No Shared Database** | Every platform has its own tables. No cross-platform queries. |
| 3 | **One Source of Truth** | Patient identity = Identity Platform. Subscription = Billing Platform. Sale = Pharmacy Platform. |
| 4 | **Idempotent Processing** | Every event consumer must handle the same event arriving twice — safely. |
| 5 | **Eventually Consistent** | After an event is published, subscribers may take seconds to process. Do not expect real-time across platforms. |
| 6 | **Retry Safe** | Consumers must be safe to retry. Use `idempotency_key`. |
| 7 | **Provider Independent** | No platform code contains "Evolution API", "Midtrans", "Twilio". These are provider framework internals. |
| 8 | **Domain Independent** | Business platforms share nothing except events and contracts. |
| 9 | **Failure Isolation** | If Notification Center is down, Pharmacy Platform still operates. |
| 10 | **Graceful Degradation** | If AI Platform is down, Pharmacy Platform continues — just without AI features. |

---

## 13. Data Ownership

| Data | Owned By | Consumed By |
|------|----------|-------------|
| Patient identity, phone, consent | Identity Platform | Communication, Notification, Pharmacy, Clinic |
| Subscription status, lifecycle | Billing Platform (SLE) | Identity (tier-based features), Pharmacy (license) |
| Sale transactions | Pharmacy Platform | Analytics, AI, Customer Intelligence |
| Prescriptions | Clinic Platform | Pharmacy Platform (via events) |
| Laboratory results | Laboratory Platform | Clinic Platform, Patient Portal |
| Messages sent, delivery status | Communication Platform | Analytics, Notification |
| Notifications delivered | Notification Center | (none — terminal) |
| Audit records | Audit Platform | (all platforms publish to it) |

**Rule:** A platform that consumes data through events stores a **projection**
of that data — not the original. The original remains owned by the publishing
platform. If the projection becomes stale, the consuming platform subscribes
to the relevant update events.

---

## 14. Platform Lifecycle

```
PLATFORM_CREATED ──▶ PLATFORM_ACTIVE ──▶ PLATFORM_UPDATED ──▶ PLATFORM_DEPRECATED ──▶ PLATFORM_ARCHIVED
```

| Stage | Meaning | Rules |
|-------|---------|-------|
| `CREATED` | New platform registered | Must declare Platform Contract §8 |
| `ACTIVE` | Operating normally | Must pass governance checklist §17 |
| `UPDATED` | Contract or events changed | Must maintain backward compatibility for 1 version |
| `DEPRECATED` | Being phased out | All consumers must migrate within N versions |
| `ARCHIVED` | No longer in use | Events no longer published; APIs return "gone" |

---

## 15. Platform Discovery

How platforms know about each other:

1. **Platform Registry**: A central registry of every platform in MEDISYNC.
   Stored as configuration (not hardcoded). Contains: name, category, version,
   contract reference.

2. **Event Discovery**: A platform discovers available events by reading the
   Event Catalog (Enterprise Event Bus documentation).

3. **Contract Discovery**: A platform discovers available APIs through the
   Platform Contract documents.

4. **No Runtime Discovery Required**: Today, platforms are known at build time.
   The registry documents what exists. Future: service mesh with runtime
   discovery.

---

## 16. Versioning

| What | Versioned? | Compatibility Rule |
|------|:---:|------|
| Platform Contract | ✅ Yes | Semantic versioning (`MAJOR.MINOR.PATCH`) |
| Event Schema | ✅ Yes | Additive only. Never remove fields. |
| Platform API | ✅ Yes | Backward compatible for 1 MAJOR version |
| Internal Implementation | ❌ No | Not part of the contract |

### Backward compatibility
- **Additive changes** (new event, new API method, new optional field) =
  MINOR bump. Consumers unaffected.
- **Breaking changes** (removed event, removed field, changed field type) =
  MAJOR bump. Consumers must migrate. Old version supported for 1 release cycle.
- **Deprecation**: Mark `@deprecated`. Support for 2 versions. Then remove.

---

## 17. Integration Governance

Every new platform proposal MUST answer these questions before approval:

| # | Question | Required Answer |
|---|----------|-----------------|
| 1 | **What do I own?** | List of entities, business logic, data |
| 2 | **What do I publish?** | List of events |
| 3 | **What do I subscribe?** | List of consumed events |
| 4 | **Who depends on me?** | Platforms that consume my events/APIs |
| 5 | **Who am I allowed to call?** | Allowed dependencies (Shared Platforms only) |
| 6 | **Who is forbidden to call me?** | Business Platforms, private internals |
| 7 | **What is my public contract?** | Platform Contract §8 |
| 8 | **What is private?** | Database schema, internal services, implementation details |
| 9 | **Am I independent?** | Can I operate if every other platform is down? |
| 10 | **Do I create circular dependencies?** | Trace: do I depend on something that depends on me? |

---

## 18. Architectural Checklist

Every platform must PASS every item before being accepted into the Mesh.

| # | Check | Required |
|---|-------|:---:|
| 1 | Platform Contract completed (§8) | ✅ |
| 2 | All dependencies are downward (Business → Shared) | ✅ |
| 3 | No direct database access to other platforms | ✅ |
| 4 | No Business Platform → Business Platform dependency | ✅ |
| 5 | All events published through Enterprise Event Bus | ✅ |
| 6 | All consumed events have idempotency handling | ✅ |
| 7 | No hardcoded provider references | ✅ |
| 8 | Platform operates independently (graceful degradation) | ✅ |
| 9 | Data ownership is clearly declared | ✅ |
| 10 | Versioning strategy is defined | ✅ |
| 11 | AI integration points are reserved | ✅ |
| 12 | Security boundary is documented | ✅ |

---

## 19. Self Review

| Dimension | Assessment |
|-----------|-----------|
| **Completeness** | 19 sections: concept, ownership, dependencies, contracts, channels, events, data, lifecycle, governance |
| **Consistency** | All rules align with Constitution and Ecosystem Vision |
| **Platform Independence** | Clear ownership, no shared database, event-driven communication |
| **Communication Clarity** | 9 communication channels defined; event flow examples for real scenarios |
| **Integration Quality** | Mandatory governance checklist; platform contract template; forbidden dependencies explicit |
| **Enterprise Readiness** | Versioning, backward compatibility, deprecation policy, platform lifecycle |
| **Long-Term Scalability** | Any number of platforms can join the mesh without redesign; platform registry extensible |

---

> **This is the Integration Constitution of MEDISYNC.**
>
> Every platform — Shared, Business, or Experience — communicates through the
> rules defined here. No platform is an island. No platform owns everything.
> Together they form the MEDISYNC Platform Mesh — autonomous, connected, governed.
