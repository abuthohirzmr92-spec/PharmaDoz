# Enterprise Event Bus — Domain Event Backbone

The **communication backbone** of MEDISYNC. Every domain publishes events. Every
domain subscribes to events. No domain calls another domain directly. This is
a **domain architecture contract** — not a technology choice (Kafka, RabbitMQ,
Redis, NATS, etc. are implementation details).

---

## 1. Vision

One bus. Every event. Zero direct coupling.

When a Sale is completed, the Sales domain publishes `SALE_COMPLETED`. It does
NOT call Customer Intelligence. It does NOT call Notification Center. It does
NOT call Automation. The Event Bus delivers the event to whoever subscribed.

Producers don't know consumers. Consumers don't know producers — only the event
contract they subscribe to.

---

## 2. Responsibilities

### ✅ Event Bus OWNS:
- Event contract (name, schema, version)
- Event routing (who subscribed to what)
- Event naming convention (enforced)
- Correlation & causation model
- Event lifecycle (published → delivered → acknowledged)
- Event versioning strategy

### ❌ Event Bus does NOT own:
- Business logic of any domain
- Event payload validation (producer is responsible)
- Retry / dead-letter logic for consumers (consumer is responsible)
- Event persistence (infrastructure concern, not domain concern)
- Consumer error handling (consumer's own domain logic)

---

## 3. Domain Boundary

```
                    ┌──────────────────────────┐
                    │    ENTERPRISE EVENT BUS    │
                    │                           │
                    │  Publish() · Subscribe()   │
                    │  Route() · Contract()      │
                    │  Version() · Correlate()   │
                    └──────┬──────────┬──────────┘
                           │          │
              ┌────────────┘          └────────────┐
              ▼                                    ▼
      ┌──────────────┐                    ┌──────────────┐
      │  PRODUCERS    │                    │  CONSUMERS    │
      │              │                    │              │
      │ Sales        │                    │ Notification │
      │ Inventory    │                    │ Activity     │
      │ Broadcast    │                    │ Customer Intel│
      │ Payment      │                    │ Automation   │
      │ Identity     │                    │ Analytics    │
      │ Import/Export│                    │ Webhook      │
      │ Factory Reset│                    │ Audit        │
      │ Future Module│                    │ Future Module │
      └──────────────┘                    └──────────────┘
```

**Rule:** Producers call `EventBus.publish(event)`. Consumers are registered via
`EventBus.subscribe(eventName, handler)`. No producer directly imports or calls
a consumer. No consumer directly imports a producer.

---

## 4. Philosophy

```
ALLOWED ✅:
  Sales.publish(SALE_COMPLETED)
  → EventBus
  → CustomerIntelligence.on(SALE_COMPLETED)
  → NotificationCenter.on(SALE_COMPLETED)
  → Automation.on(SALE_COMPLETED)

FORBIDDEN ❌:
  Sales.complete() {
    CustomerIntelligence.updateStats()   ← DIRECT CALL
    NotificationCenter.notify()          ← DIRECT CALL
    Automation.trigger()                 ← DIRECT CALL
  }
```

The Event Bus is the **only** integration surface between domains.

---

## 5. Publish / Subscribe Model

### Publish
```
Producer:
  const event = new DomainEvent('SALE_COMPLETED', payload, metadata)
  EventBus.publish(event)
```

### Subscribe
```
Consumer:
  EventBus.subscribe('SALE_COMPLETED', async (event) => {
    // Consumer's own domain logic
    // Consumer is responsible for its own error handling
  })
```

### Routing
Event Bus maintains a registry: `Map<EventName, Set<Handler>>`.
When an event is published, ALL registered handlers for that event name fire.

### Publisher ignorance
The producer does not know:
- How many consumers exist
- Which domains consume the event
- In what order consumers process
- Whether any consumer failed

### Consumer ignorance
The consumer does not know:
- Which domain produced the event (except from `event.source`)
- Why the event was produced
- What other consumers exist

---

## 6. Domain Event Model

| Field | Type | Description |
|-------|------|-------------|
| `event_id` | UUID | Unique event identifier |
| `event_name` | String | `SALE_COMPLETED`, `PAYMENT_RECEIVED`, etc. |
| `event_type` | Enum | `business | system | domain | integration | lifecycle` |
| `aggregate_id` | UUID | The root entity this event is about (e.g., `sale.id`) |
| `aggregate_type` | String | `sale | payment | broadcast | customer` |
| `version` | Integer | Event schema version (starts at 1) |
| `timestamp` | ISO 8601 | When the event occurred |
| `tenant_id` | UUID | Tenant context |
| `correlation_id` | UUID | Links events in a causal chain |
| `causation_id` | UUID | The event that directly caused this one |
| `source_domain` | String | `sales | inventory | broadcast | identity | ...` |
| `payload` | JSON | Domain-specific data (validated by producer) |
| `metadata` | JSON | Additional context (actor, trigger, request_id) |
| `priority` | Enum | `critical | high | normal | low` |
| `idempotency_key` | String | Prevents duplicate processing |

---

## 7. Event Naming Convention

### Format
```
{AGGREGATE}_{ACTION}_{TENSE}
```

### Rules
- UPPER_SNAKE_CASE
- `AGGREGATE`: the root entity (`SALE`, `PAYMENT`, `BROADCAST`, `CUSTOMER`)
- `ACTION`: what happened (`COMPLETED`, `STARTED`, `FAILED`, `CREATED`)
- `TENSE`: past tense (it already happened)

### Catalog (partial)

| Event Name | Aggregate | Producer | Example Consumers |
|-----------|-----------|----------|-------------------|
| `SALE_COMPLETED` | Sale | Sales | CustomerIntelligence, Notification, Analytics, Automation |
| `SALE_VOIDED` | Sale | Sales | CustomerIntelligence, Analytics |
| `PAYMENT_RECEIVED` | Payment | Billing | Notification, Subscription, Analytics |
| `PAYMENT_FAILED` | Payment | Billing | Notification, RetryEngine |
| `BROADCAST_STARTED` | Broadcast | BroadcastEngine | ActivityCenter |
| `BROADCAST_PROGRESS` | Broadcast | BroadcastEngine | ActivityCenter |
| `BROADCAST_COMPLETED` | Broadcast | BroadcastEngine | ActivityCenter, Notification, Analytics |
| `BROADCAST_FAILED` | Broadcast | BroadcastEngine | ActivityCenter, Notification |
| `IMPORT_STARTED` | Import | ImportService | ActivityCenter |
| `IMPORT_COMPLETED` | Import | ImportService | ActivityCenter, Notification |
| `EXPORT_COMPLETED` | Export | ExportService | ActivityCenter, Notification |
| `CUSTOMER_CREATED` | Customer | CustomerIdentity | Notification, CustomerIntelligence |
| `CUSTOMER_MERGED` | Customer | CustomerIdentity | Notification, Audit |
| `FACTORY_RESET_STARTED` | FactoryReset | FactoryResetService | ActivityCenter |
| `FACTORY_RESET_COMPLETED` | FactoryReset | FactoryResetService | ActivityCenter, Notification, Audit |
| `BPJS_SYNC_COMPLETED` | BpjsSync | BpjsAdapter | ActivityCenter, Notification |
| `INVENTORY_LOW_STOCK` | Inventory | InventoryEngine | Notification, Automation |
| `TRIAL_APPROVED` | Trial | TrialService | Notification, ActivityCenter |
| `SUBSCRIPTION_EXPIRED` | Subscription | SubscriptionService | Notification, Scheduler |
| `BACKUP_FAILED` | Backup | BackupService | Notification, ActivityCenter |
| `OCR_BATCH_COMPLETED` | Ocr | OcrEngine | ActivityCenter, Notification |

---

## 8. Event Classification

| Type | Meaning | Example |
|------|---------|---------|
| `business` | Core business operation completed | `SALE_COMPLETED`, `PAYMENT_RECEIVED` |
| `system` | Infrastructure / maintenance event | `BACKUP_FAILED`, `FACTORY_RESET_COMPLETED` |
| `domain` | Within-domain state change | `CUSTOMER_MERGED`, `TRIAL_APPROVED` |
| `integration` | External system interaction | `BPJS_SYNC_COMPLETED`, `WEBHOOK_RECEIVED` |
| `lifecycle` | Entity lifecycle transition | `SUBSCRIPTION_EXPIRED`, `CUSTOMER_CREATED` |

---

## 9. Producer Model

Every domain CAN be a producer. A domain publishes events about its own
aggregates. It never publishes events for another domain.

| Domain | Events Published |
|--------|------------------|
| **Sales** | `SALE_COMPLETED`, `SALE_VOIDED` |
| **Inventory** | `INVENTORY_LOW_STOCK`, `STOCK_ADJUSTED` |
| **Purchasing** | `PURCHASE_ORDER_RECEIVED` |
| **Finance / Billing** | `PAYMENT_RECEIVED`, `PAYMENT_FAILED`, `INVOICE_CREATED` |
| **Broadcast Engine** | `BROADCAST_STARTED`, `BROADCAST_PROGRESS`, `BROADCAST_COMPLETED`, `BROADCAST_FAILED` |
| **Customer Identity** | `CUSTOMER_CREATED`, `CUSTOMER_MERGED`, `PHONE_UPDATED` |
| **Automation** | `WORKFLOW_TRIGGERED`, `WORKFLOW_COMPLETED` |
| **Factory Reset** | `FACTORY_RESET_STARTED`, `FACTORY_RESET_COMPLETED` |
| **Import / Export** | `IMPORT_STARTED`, `IMPORT_COMPLETED`, `EXPORT_COMPLETED` |
| **OCR Engine** | `OCR_BATCH_COMPLETED` |
| **BPJS Adapter** | `BPJS_SYNC_COMPLETED` |
| **Scheduler** | `JOB_COMPLETED`, `JOB_FAILED` |

---

## 10. Consumer Model

Every domain CAN be a consumer. A domain subscribes to events it cares about.

| Domain | Events Subscribed |
|--------|-------------------|
| **Notification Center** | `SALE_COMPLETED`, `PAYMENT_RECEIVED`, `PAYMENT_FAILED`, `BROADCAST_COMPLETED`, `FACTORY_RESET_COMPLETED`, `IMPORT_COMPLETED`, `INVENTORY_LOW_STOCK`, `BACKUP_FAILED` |
| **Activity Center** | `BROADCAST_STARTED`, `BROADCAST_PROGRESS`, `BROADCAST_COMPLETED`, `IMPORT_STARTED`, `IMPORT_COMPLETED`, `FACTORY_RESET_STARTED`, `FACTORY_RESET_COMPLETED`, `OCR_BATCH_COMPLETED`, `BPJS_SYNC_COMPLETED` |
| **Customer Intelligence** | `SALE_COMPLETED`, `CUSTOMER_CREATED`, `CUSTOMER_MERGED` |
| **Automation** | `SALE_COMPLETED`, `INVENTORY_LOW_STOCK`, `CUSTOMER_CREATED` |
| **Analytics** | `SALE_COMPLETED`, `PAYMENT_RECEIVED`, `BROADCAST_COMPLETED`, `CUSTOMER_CREATED` |
| **Webhook** | Any domain event (configurable) |
| **Audit** | `CUSTOMER_MERGED`, `FACTORY_RESET_COMPLETED`, `PAYMENT_RECEIVED` |

---

## 11. Event Flow (Example: Sale Completed)

```
1. Sales Engine:
     sale.finalize()
     → EventBus.publish(new DomainEvent('SALE_COMPLETED', {...}))

2. Event Bus routes to subscribers (no ordering guarantee):
     ┌─ CustomerIntelligence.onSaleCompleted(event)
     │    → updateStats(customerId, amount)
     │    → recomputeSegment(customerId)
     │
     ├─ NotificationCenter.onSaleCompleted(event)
     │    → (optional) create success notification
     │
     ├─ Analytics.onSaleCompleted(event)
     │    → aggregate daily sales metric
     │
     └─ Automation.onSaleCompleted(event)
          → check trigger rules (e.g., "if total_spent > 1M → assign VIP")
```

Sales Engine has **zero knowledge** of which consumers exist or what they do.

---

## 12. Correlation Model

### Identifiers
| ID | Purpose |
|----|---------|
| `event_id` | This specific event instance |
| `correlation_id` | Links all events in a logical chain (e.g., one user action → multiple domain events) |
| `causation_id` | The `event_id` that DIRECTLY caused this event (parent event) |

### Example chain
```
correlation_id = "abc-123" (shared across the chain)

User clicks "Approve Trial" → admin_action_id = "abc-123"
  ├─ event_id: "evt-001"  TRIAL_APPROVED     causation: null
  ├─ event_id: "evt-002"  TENANT_PROVISIONED  causation: "evt-001"
  ├─ event_id: "evt-003"  SUBSCRIPTION_CREATED causation: "evt-002"
  └─ event_id: "evt-004"  NOTIFICATION_SENT    causation: "evt-003"
```

Tracing: find all events with `correlation_id = "abc-123" ORDER BY timestamp`.

---

## 13. Versioning Strategy

### Schema evolution rules
1. **Additive only** — new fields may be added to the payload. Old fields are never removed.
2. **Version bump** — when payload schema changes, `version` increments.
3. **Consumer tolerance** — consumers MUST ignore unknown fields (forward-compatible).
4. **Deprecation** — fields are marked `@deprecated` for 2 versions before removal.

### Example
```
v1: { saleId, amount, items: [...] }
v2: { saleId, amount, items: [...], paymentMethod: "qris" }  ← additive
v3: { saleId, amount, items: [...], paymentMethod, customerId @deprecated }
```

Consumer that only knows v1 ignores `paymentMethod` and `customerId`.

---

## 14. Error Strategy

### Consumer failure
- Event Bus **fires and forgets**. It does NOT retry on behalf of the consumer.
- The consumer is responsible for its own error handling, retry, and dead-letter.
- If a consumer is critical, it MUST implement idempotency (check `idempotency_key`).

### Producer failure
- The producer is responsible for not publishing after a rollback.
- Event Bus does NOT validate business invariants — that's the producer's job.

### Boundary enforcement
```
Event Bus:         "I delivered the event."
Consumer:          "I processed it (or failed and logged the error)."
Event Bus NEVER:   "Let me retry that for you."
```

---

## 15. Technology Independence

### Today (Monolith)
The Event Bus is an **in-process** implementation:
- `EventBus` is a singleton with a `Map<EventName, Handler[]>`
- Handlers fire synchronously (or async, non-blocking)
- Zero external dependencies

### Tomorrow (Microservices / Distributed)
The Event Bus contract remains **identical**. Only the transport changes:
- In-process → Message Queue (Kafka, RabbitMQ, NATS, Redis Streams)
- The domain code (`EventBus.publish`, `EventBus.subscribe`) is unchanged
- Only the `EventBus` adapter swaps

### What this document does NOT specify
- The implementation technology (Kafka, RabbitMQ, Redis, NATS, SQS, PubSub)
- The serialization format (JSON is assumed; Protobuf/Avro are future options)
- The transport protocol (HTTP, gRPC, AMQP)
- The persistence strategy (event store, outbox, transaction log)

---

## 16. Relationship Map

```
Enterprise Event Bus
  │
  ├── Customer Identity Engine
  │     └── publishes: CUSTOMER_CREATED, CUSTOMER_MERGED
  │     └── subscribes: (none currently — pure producer in this context)
  │
  ├── Activity Center
  │     └── subscribes: BROADCAST_*, IMPORT_*, FACTORY_RESET_*, OCR_*, BPJS_*
  │
  ├── Notification Center
  │     └── subscribes: SALE_COMPLETED, PAYMENT_*, BROADCAST_COMPLETED, FACTORY_RESET_*, IMPORT_*, INVENTORY_*, BACKUP_*
  │
  ├── Broadcast Engine
  │     └── publishes: BROADCAST_STARTED, BROADCAST_PROGRESS, BROADCAST_COMPLETED, BROADCAST_FAILED
  │
  ├── SLE (Subscription Lifecycle Engine)
  │     └── publishes: TRIAL_*, SUBSCRIPTION_*
  │     └── subscribes: PAYMENT_RECEIVED
  │
  ├── Customer Contact Intelligence
  │     └── subscribes: SALE_COMPLETED, CUSTOMER_CREATED, CUSTOMER_MERGED
  │
  ├── Analytics
  │     └── subscribes: SALE_COMPLETED, PAYMENT_*, BROADCAST_COMPLETED, CUSTOMER_CREATED
  │
  ├── Automation Engine (future)
  │     └── subscribes: SALE_COMPLETED, INVENTORY_LOW_STOCK, CUSTOMER_CREATED
  │
  └── Webhook (future)
        └── subscribes: (configurable — any event)
```

---

## 17. Integration Points

### How a domain publishes (checklist)
1. Import `EventBus` (domain contract, not infrastructure)
2. Call `EventBus.publish(new DomainEvent(...))`
3. Done. The domain does not know or care who consumes it.

### How a domain subscribes (checklist)
1. Import `EventBus`
2. Call `EventBus.subscribe('EVENT_NAME', handler)`
3. In the handler: check `idempotency_key`, process, handle errors
4. Done. The domain does not know or care who produced it.

### Existing infrastructure alignment
- `Extension Bus` (ADR-39) — in-process pub/sub already designed for SLE
- `subscription_events` — append-only event ledger (persistence for lifecycle events)
- `notification_log` (064) — notification persistence
- `scheduler_runs` (065) — idempotency guard

The Enterprise Event Bus **generalizes** ADR-39 beyond SLE. It is the same
pattern applied universally.

---

## 18. Self Review

| Requirement | Status |
|---|---|
| Zero code | ✅ |
| Zero migration | ✅ |
| Zero schema | ✅ |
| Zero UI | ✅ |
| Zero API | ✅ |
| Zero queue/broker implementation | ✅ |
| Technology-agnostic | ✅ §15 |
| Clear domain boundary | ✅ §3 |
| Publish / Subscribe model | ✅ §5 |
| Event naming convention | ✅ §7 |
| Correlation & causation | ✅ §12 |
| Versioning strategy | ✅ §13 |
| Error strategy (bus ≠ retry) | ✅ §14 |
| Producer / Consumer model | ✅ §9, §10 |
| Relationship with existing domains | ✅ §16 |
| Future extension without redesign | ✅ §16 |
| GEN-1 alignment (ADR-39 generalization) | ✅ §17 |
| No direct domain-to-domain calls | ✅ §4 |
