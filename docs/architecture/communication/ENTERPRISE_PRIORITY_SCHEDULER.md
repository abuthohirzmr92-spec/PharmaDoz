# Enterprise Priority Scheduler — Architecture Blueprint

The **brain** of all communication dispatch in MEDISYNC. Every message producer
submits jobs to the Scheduler. The Scheduler decides WHO gets sent FIRST based
on priority, fairness, preemption, and multi-tenant capacity. No producer sends
directly to a provider. No provider pulls directly from a producer.

---

## 1. Vision

One queue. Many producers. Many providers. Fair dispatch.

When a Checkout happens, a Broadcast campaign runs, a Reminder fires, and an OTP
is requested — they all land in the Priority Scheduler. The Scheduler ensures
the OTP goes first, the Checkout receipt follows immediately, the Reminder goes
next, and the Broadcast fills the remaining capacity. No one starves. No one
monopolizes.

---

## 2. Responsibilities

### ✅ Scheduler OWNS:
- Priority-based dispatch order
- Preemption (pause lower priority for higher priority)
- Fair scheduling (low priority still gets CPU time)
- Starvation prevention
- Multi-tenant capacity allocation
- Job lifecycle management
- Queue selection & capacity arbitration

### ❌ Scheduler does NOT own:
- Broadcast logic → `WhatsApp Broadcast Engine`
- Reminder logic → `Reminder Service` (SLE)
- Provider execution → `WhatsApp / SMS / Email / Push adapters`
- Message content / template → Producer owns this
- Notification → `Notification Center`
- Progress UI → `Activity Center`

---

## 3. Domain Boundary

```
┌─────────────────────────────────────────────────────────────┐
│              ENTERPRISE PRIORITY SCHEDULER                   │
│  (WHO goes FIRST — priority, fairness, preemption, capacity) │
│                                                              │
│  PriorityQueue · PreemptPolicy · FairShare · TenantQuota     │
│  JobLifecycle · CapacityAllocator · ChannelDispatcher        │
└──────┬──────────────────────────────────┬───────────────────┘
       │  producers submit jobs           │ dispatches to providers
       ▼                                  ▼
┌──────────────┐                   ┌──────────────┐
│  PRODUCERS    │                   │  PROVIDERS    │
│              │                   │              │
│ Checkout     │                   │ WhatsApp     │
│ Broadcast    │                   │ SMS          │
│ Reminder     │                   │ Email        │
│ OTP          │                   │ Push         │
│ Import/Export│                   │ Telegram     │
│ Automation   │                   │ Future       │
└──────────────┘                   └──────────────┘
```

**Rule:** Producer → Scheduler → Provider. No direct producer→provider path.

---

## 4. Core Philosophy

```
ALLOWED ✅:
  Checkout  → Scheduler.submit(priority=P2) → Provider.send()
  Broadcast → Scheduler.submit(priority=P4) → Provider.send()
  OTP       → Scheduler.submit(priority=P1) → Provider.send()

FORBIDDEN ❌:
  Checkout  → Provider.send()   ← bypasses scheduler
  Broadcast → Provider.send()   ← bypasses scheduler
```

The Scheduler is the **only** path from any producer to any provider.

---

## 5. Priority Model

| Priority Tier | Label | Use Cases | Preempts | Can Be Preempted By |
|:---:|--------|----------|:---:|:---:|
| **P1** | Critical | OTP, Password Reset, Login Verification, Emergency | P2, P3, P4 | — (highest) |
| **P2** | High | Checkout Success, Receipt, Invoice, Payment Confirmation | P3, P4 | P1 |
| **P3** | Normal | Reminder, Membership, Loyalty, Survey | P4 | P1, P2 |
| **P4** | Low | Broadcast, Marketing, Promotion, Campaign | — | P1, P2, P3 |

### Priority resolution (per tick)
```
1. Are there any P1 jobs waiting? → dispatch them first
2. If no P1, any P2? → dispatch P2
3. If no P1 or P2, any P3? → dispatch P3
4. If only P4 → dispatch P4 (with fair-share guarantee)
```

---

## 6. Scheduling Model

### Dispatch algorithm
```
every dispatch_tick (config: scheduler.tick_interval_ms, default 100ms):
  availableSlots = provider.capacity - provider.currentLoad
  
  for priority in [P1, P2, P3, P4]:
    jobs = queue.peek(priority, availableSlots)
    
    // Apply fair-share: if P4 hasn't been served in N ticks, reserve 1 slot
    if priority === P4 AND P4.starvation_counter >= scheduler.p4_starvation_threshold:
      jobs = min(1, availableSlots)
    
    // Apply tenant quota: per-tenant max concurrent
    jobs = applyTenantQuota(jobs)
    
    for job in jobs:
      provider.dispatch(job)
      availableSlots--

    if availableSlots === 0: break
```

---

## 7. Preemption Policy

### When preemption is allowed
| Current Job Priority | Preempted By | Rule |
|:---:|:---:|------|
| P4 (Broadcast) | P1, P2 | **Immediately** — Broadcast is batch, can pause/resume |
| P3 (Reminder) | P1 | **Immediately** — critical over normal |
| P3 (Reminder) | P2 | **After current message** — don't interrupt mid-send |
| P2 (Checkout) | P1 | **Immediately** — OTP/emergency over checkout |
| P1 (OTP) | — | **Never preempted** |

### Preemption mechanism
```
1. P1 job arrives while P4 broadcast is sending
2. Scheduler sends PAUSE signal to P4 dispatch
3. P4 current batch completes (don't abort mid-message)
4. P4 state saved (progress pointer, batch number)
5. P1 job dispatched immediately
6. P1 completes → P4 auto-resumed
```

---

## 8. Fair Scheduling

### The problem
P4 Broadcast (10,000 messages) should not block P2 Checkout (1 receipt) forever.

### The solution
```
FairShare algorithm:
  Every scheduler tick, each priority gets a minimum time slice:

  P1: unlimited (always dispatch if available)
  P2: min 40% of available slots
  P3: min 25% of available slots
  P4: min 10% of available slots  (guaranteed floor)

  Unused allocation cascades down:
    If P1+P2 use only 50%, P3+P4 split the remaining 50%
```

---

## 9. Starvation Prevention

### Starvation counter
Each priority tier has a `starvation_counter` — ticks since last dispatch.

| Priority | Threshold | Action when exceeded |
|:---:|:---:|------|
| P4 | 20 ticks | Reserve 1 slot for P4, even if P1-P3 are busy |
| P3 | 50 ticks | Reserve 1 slot for P3 |
| P2 | 100 ticks | Reserve 1 slot for P2 (shouldn't happen — P2 is high priority) |

### Guarantee
No job waits longer than `threshold * tick_interval`. For P4 at 100ms ticks:
max wait = 20 × 100ms = **2 seconds**. Broadcast never starves entirely.

---

## 10. Job Lifecycle

```
QUEUED ──scheduled──▶ SCHEDULED ──dispatch──▶ DISPATCHING
                         │
                         └──(no capacity)── stays SCHEDULED

DISPATCHING ──provider.accept──▶ WAITING_PROVIDER ──provider.confirm──▶ SENT ──▶ COMPLETED
     │                              │
     └──provider.reject────────▶ FAILED ──retry──▶ QUEUED
                                      │
                                      └──max_retry──▶ FAILED (terminal)
                                      
QUEUED / SCHEDULED ──cancel──▶ CANCELLED
```

### Status definitions
| Status | Meaning |
|--------|---------|
| `queued` | Job submitted, waiting for scheduling |
| `scheduled` | Slot assigned, waiting for dispatch |
| `dispatching` | Being sent to provider |
| `waiting_provider` | Provider accepted, waiting for delivery confirmation |
| `sent` | Provider confirmed delivery |
| `completed` | Delivery confirmed + post-processing done |
| `failed` | Permanent failure (max retries exceeded, invalid, rejected) |
| `cancelled` | Cancelled by producer or admin |

---

## 11. Multi-Tenant Fairness

### The problem
Tenant A: 5,000 Broadcast messages. Tenant B: 2 Checkout receipts.
Tenant B must NOT wait for Tenant A's 5,000 messages.

### Per-tenant quota
```
scheduler.tenant.max_concurrent_jobs: 50     // max jobs in-flight per tenant
scheduler.tenant.max_per_minute: 100         // rate limit per tenant per minute
scheduler.tenant.fair_share_weight: 1.0     // equal weight (no tenant priority)
```

### Tenant-aware dispatch
```
jobs = queue.peek(priority, availableSlots)

// Group by tenant and apply per-tenant limits
for tenant in jobs.groupBy(tenantId):
  in_flight = count(jobs where tenant_id = tenant AND status IN (dispatching, waiting_provider))
  allowed = max(0, tenant.max_concurrent_jobs - in_flight)
  tenantJobs[tenant].truncate(allowed)

// Round-robin across tenants with available capacity
return roundRobin(tenantJobs.values())
```

---

## 12. Provider Independence

The Scheduler knows **only** about channels, not providers.

```
Scheduler:       "I have a job for channel=whatsapp."
Dispatcher:      "WhatsApp provider is Evolution API. Sending..."
Scheduler:       (does not know or care which provider)
```

### Channel-to-provider mapping (config-driven)
```
scheduler.channel.whatsapp.provider = "evolution_api"
scheduler.channel.sms.provider      = "twilio"
scheduler.channel.email.provider    = "smtp"
```

Provider selection = `ChannelDispatcher` responsibility, NOT the Scheduler.

### Supported channels (future-ready)
| Channel | Current Status | Provider |
|---------|:---:|----------|
| WhatsApp | 🟢 Active | Evolution API |
| SMS | ⚪ Future | Twilio, Vonage |
| Email | ⚪ Future | SMTP, SendGrid |
| Push Notification | ⚪ Future | Firebase, OneSignal |
| Telegram | ⚪ Future | Telegram Bot API |

---

## 13. Event Integration

All Scheduler state changes publish to the **Enterprise Event Bus**.

| Scheduler Event | Published When |
|-----------------|----------------|
| `JOB_QUEUED` | Job accepted into queue |
| `JOB_SCHEDULED` | Slot assigned |
| `JOB_DISPATCHING` | Sent to provider |
| `JOB_WAITING_PROVIDER` | Provider accepted |
| `JOB_SENT` | Provider confirmed |
| `JOB_COMPLETED` | Delivery + post-processing done |
| `JOB_FAILED` | Permanent failure |
| `JOB_RETRIED` | Transient failure → retry queued |
| `JOB_CANCELLED` | Cancelled by producer/admin |
| `JOB_PREEMPTED` | Paused for higher priority |

---

## 14. Activity Center Integration

- `JOB_QUEUED` → Activity Center: new card (QUEUED)
- `JOB_DISPATCHING` → Activity Center: card updated (RUNNING)
- `JOB_COMPLETED` → Activity Center: card updated (COMPLETED)
- `JOB_FAILED` → Activity Center: card updated (FAILED)
- `JOB_PREEMPTED` → Activity Center: card updated (PAUSED)

The Scheduler publishes events. Activity Center consumes them. The Scheduler
does NOT know Activity Center exists — it just publishes to the Event Bus.

---

## 15. Notification Center Integration

- `JOB_FAILED` (terminal) → Notification Center: "Pengiriman OTP gagal."
- `BROADCAST_COMPLETED` (producer event via Broadcast Engine) → Notification
- `JOB_PREEMPTED` → NO notification (this is normal scheduling behavior)

The Scheduler does NOT create notifications directly. It publishes events.
Notification Center subscribes to the events it cares about.

---

## 16. Future Extension Points

| Capability | Description | Impact on Scheduler |
|-----------|-------------|:---:|
| **Rate Limiter** | Per-provider, per-tenant, per-channel rate limits | Extend CapacityAllocator |
| **Circuit Breaker** | Stop dispatch to failing provider | Add provider health check |
| **Maintenance Window** | Block dispatch during config hours | Extend scheduler tick |
| **Quiet Hours** | Per-tenant "do not disturb" hours | Add Job.scheduled_for |
| **Provider Failover** | WhatsApp down → SMS fallback | Extend ChannelDispatcher |
| **Geo Routing** | Dispatch to nearest provider region | Extend provider selection |
| **AI Scheduling** | ML-based priority adjustment | Add weight factor to priority tiers |
| **Batch Optimization** | Group similar messages | Pre-process queue |

All extensions are **additive** to the Scheduler — no redesign required.

---

## 17. Integration Points

### Producer Integration
```
// Any producer
Scheduler.submit({
  channel: 'whatsapp',
  priority: 'P2',
  tenant_id: '...',
  payload: { to: '+628...', template: 'receipt', params: {...} },
  correlation_id: '...',
  max_retries: 3,
  deadline: '2026-07-19T12:00:00Z'  // optional
})
```

### Provider Integration
Providers don't call the Scheduler. The Scheduler's `ChannelDispatcher` calls
providers via the `IWhatsAppProvider` / `ISmsProvider` / `IEmailProvider` interfaces.

### Existing infrastructure reused
- `IWhatsAppProvider` interface (from WhatsApp Broadcast Engine architecture)
- Enterprise Event Bus (publish JOB_* events)
- Activity Center (subscribe to job progress events)
- Notification Center (subscribe to job failure events)
- `subscription_settings` (config: scheduler.* rules)
- Extension Bus (ADR-39) — in-process event routing

---

## 18. Self Review

| Requirement | Status |
|---|---|
| Zero code | ✅ |
| Zero migration | ✅ |
| Zero schema | ✅ |
| Zero UI | ✅ |
| Zero API | ✅ |
| Zero queue implementation | ✅ |
| Zero provider implementation | ✅ |
| Priority model (P1–P4) | ✅ §5 |
| Preemption policy | ✅ §7 |
| Fair scheduling | ✅ §8 |
| Starvation prevention | ✅ §9 |
| Multi-tenant fairness | ✅ §11 |
| Provider independence | ✅ §12 |
| Channel model (future-ready) | ✅ §12 |
| Event Bus integration | ✅ §13 |
| Activity Center integration | ✅ §14 |
| Notification Center integration | ✅ §15 |
| Future extension | ✅ §16 |
