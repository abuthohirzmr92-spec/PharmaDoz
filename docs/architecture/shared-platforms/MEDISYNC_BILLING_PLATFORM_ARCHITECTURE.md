# MEDISYNC Billing Platform — Architecture

> **Shared Platform — SaaS Lifecycle Manager.**
>
> The Billing Platform governs whether a tenant is allowed to use MEDISYNC.
> It owns the complete subscription lifecycle — trial, subscription, package,
> feature entitlement, billing cycle, invoice, payment, suspension,
> reactivation, upgrade, downgrade, renewal, and cancellation. Every Business
> Platform depends on Billing to know whether a tenant has access.

---

## 1. What is Billing Platform?

Billing Platform is NOT an accounting system. It is NOT merely invoice
management. It is the **SaaS Lifecycle Manager** of MEDISYNC.

It answers:
- Is this tenant allowed to use MEDISYNC right now?
- What package are they on?
- What features do they have access to?
- How many users, branches, and resources can they use?
- Is their payment up to date?
- Are they in trial, active, grace, or suspended?
- When does their subscription renew?

Every Business Platform (Pharmacy, Clinic, Laboratory, ...) depends on Billing
Platform to enforce access, limits, and feature availability. No Business
Platform decides its own billing rules.

---

## 2. Vision

Billing Platform supports every pricing model — now and in the future — without
redesign.

| Model | Status | Description |
|-------|:---:|-------------|
| Monthly Subscription | 🟢 Active | Recurring monthly billing |
| Quarterly Subscription | 🟢 Active | Recurring quarterly billing |
| Yearly Subscription | 🟢 Active | Recurring annual billing |
| Lifetime License | 🟢 Active | One-time purchase, perpetual access |
| Enterprise Contract | 🟢 Active | Custom terms, manual invoicing |
| Trial | 🟢 Active | Time-limited free access |
| Usage-Based Billing | ⚪ Future | Pay per API call, AI request, storage |
| Hybrid Billing | ⚪ Future | Base subscription + usage overages |
| Marketplace Add-ons | ⚪ Future | Purchase individual add-ons |

---

## 3. Responsibilities

### ✅ Billing Platform OWNS:
- Trial lifecycle (request → review → approve → provision → activate → expire → convert)
- Subscription lifecycle (active → grace → read-only → suspend → terminate)
- Package catalog (definition, versioning, resource limits, pricing)
- Feature entitlement (which features are enabled per package)
- Invoice generation and lifecycle
- Payment recording and reconciliation
- Renewal orchestration
- Suspension and reactivation
- Tenant license status (access gate)
- Billing policies (grace period, retry, auto-suspend)
- Billing configuration (trial duration, pricing, limits — all from `subscription_settings`)
- Billing audit trail (subscription_events — immutable ledger)

### ❌ Billing Platform DOES NOT OWN:
- Business transactions (sales, inventory) → Pharmacy Platform
- Communication delivery → Communication Platform
- Identity resolution → Identity Platform
- User management → Identity Platform
- Analytics → Analytics Platform
- Notifications → Notification Center

---

## 4. Core Domains

```
┌────────────────────────────────────────────────────────────────┐
│                     BILLING PLATFORM                            │
│                                                                │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐        │
│  │  Trial   │  │ Subscription │  │ Package Catalog    │        │
│  │Management│  │  Management  │  │ + Feature Entitle  │        │
│  └────┬─────┘  └──────┬───────┘  └────────┬──────────┘        │
│       │               │                   │                    │
│  ┌────▼───────────────▼───────────────────▼──────────┐        │
│  │               BILLING ENGINE                       │        │
│  │  Invoice Management · Payment Management           │        │
│  │  Renewal Orchestration · Suspension Automation     │        │
│  └───────────────────────┬────────────────────────────┘        │
│                          │                                      │
│  ┌───────────────────────▼────────────────────────────┐        │
│  │              BILLING CONFIGURATION                   │        │
│  │  subscription_settings (trial, grace, retry, ...)   │        │
│  └─────────────────────────────────────────────────────┘        │
└────────────────────────────────────────────────────────────────┘
```

| Domain | Responsibility |
|--------|---------------|
| **Trial Management** | Intake, review, approval, provisioning, expiry, conversion |
| **Subscription Management** | Lifecycle FSM, state transitions, access-gate derivation |
| **Package Catalog** | Package definition, versioning, resource limits, pricing, feature assignment |
| **Feature Entitlement** | Feature flags per package, dependency resolution, tenant overrides |
| **Invoice Management** | Invoice creation, lifecycle, proration, promotion application |
| **Payment Management** | Payment recording, webhook processing, retry, provider integration |
| **Billing Configuration** | Config-driven rules: trial duration, grace period, retry policy, auto-suspend |

---

## 5. Package Model

Packages are NOT hardcoded. They are catalog entries in `tenant_packages`.

| Concept | Description |
|---------|-------------|
| **Package** | A named tier with price, billing interval, resource limits, and feature assignments |
| **Version** | Packages evolve. Old tenants stay on v1. New tenants get v2. |
| **Resource Limits** | JSONB `resource_limits`: users, branches, products, storage, API calls, AI requests |
| **Feature Flags** | Per-package features: FEFO, multi-cashier, AI, BPJS, API access, priority support |
| **Add-ons** | Optional add-ons purchased on top of a package (WhatsApp, AI OCR, extra storage) |

Current packages: **Starter** (free) · **Professional** · **Enterprise**.
Future: custom packages, usage-based tiers, marketplace add-ons.

---

## 6. Feature Entitlement

Feature access is NOT determined by package name. It is determined by the
Feature Resolver chain:

```
Package Features (DB)
   ∪ Service Catalog (services → features)
   ∪ Package-level overrides (JSONB)
   ∪ Tenant-level overrides (JSONB)
   − Dependency unmet features (DAG)
   → Resolved Capability Set
```

A feature is enabled only if:
1. The package enables it (via `package_features` or `service_catalog`)
2. All its **required** dependencies are also enabled
3. The tenant's subscription is active (not suspended/terminated)
4. No tenant-level override disables it

---

## 7. Tenant Lifecycle (Access Gate)

```
REGISTERED ──▶ TRIAL ──▶ ACTIVE ──▶ GRACE_PERIOD ──▶ READ_ONLY ──▶ SUSPENDED ──▶ ARCHIVED
                │         │           │               │            │
                │         │           │               │            └──▶ (payment) → ACTIVE
                │         │           │               └──(payment)──▶ ACTIVE
                │         │           └──(no payment)──▶ EXPIRED ──▶ CANCELLED
                │         └──(payment)──▶ ACTIVE
                └──(expired)──▶ CANCELLED
```

| Status | Access | Meaning |
|--------|:---:|---------|
| `trial` | Full | Trial period active |
| `active` | Full | Paid and current |
| `grace_period` | Full + banner | Payment missed — still accessible |
| `read_only` | Read + pay + upgrade | Cannot operate, but can view data and pay |
| `suspended` | Login-blocked | No access until payment |
| `archived` | None | Data retained, access revoked |

---

## 8. Billing Lifecycle

```
SUBSCRIPTION_CREATED
   │
   ▼
INVOICE_ISSUED (draft → sent)
   │
   ▼
PAYMENT_RECEIVED (webhook / manual)
   │
   ▼
SUBSCRIPTION_ACTIVATED / RENEWED
   │
   ├──(period end)──▶ RENEWAL_INVOICE ──▶ PAYMENT ──▶ RENEWED
   │
   ├──(upgrade)──▶ PRORATED_INVOICE ──▶ PAYMENT ──▶ UPGRADED
   │
   └──(non-payment)──▶ GRACE_PERIOD ──▶ READ_ONLY ──▶ SUSPENDED
```

### Upgrade Flow
1. Tenant selects new package
2. Billing computes proration (unused credit − new package cost for remaining days)
3. Promotions applied (if valid)
4. Invoice created (draft)
5. Payment processed (via active payment provider)
6. Webhook → recordPayment → subscription_transition RPC
7. Subscription updated, feature entitlements re-resolved
8. Tenant notified

### Renewal Flow
1. Subscription period ends
2. Billing creates renewal invoice (package price)
3. If `auto_renew = true`: attempt payment automatically
4. Payment success → subscription_transition RPC (renewed event + period extension)
5. Payment failure → retry → grace → suspend

---

## 9. Events

### Published (to Enterprise Event Bus)
| Event | When |
|-------|------|
| `TRIAL_STARTED` | Trial activated after provisioning |
| `TRIAL_EXPIRED` | Trial period ended without conversion |
| `TRIAL_CONVERTED` | Trial converted to paid subscription |
| `SUBSCRIPTION_CREATED` | New paid subscription activated |
| `SUBSCRIPTION_RENEWED` | Subscription renewed for another period |
| `SUBSCRIPTION_UPGRADED` | Package upgraded |
| `SUBSCRIPTION_DOWNGRADED` | Package downgraded |
| `SUBSCRIPTION_SUSPENDED` | Access suspended |
| `SUBSCRIPTION_REACTIVATED` | Access restored after payment |
| `SUBSCRIPTION_CANCELLED` | Subscription terminated |
| `PAYMENT_RECEIVED` | Payment confirmed |
| `PAYMENT_FAILED` | Payment attempt failed |
| `INVOICE_CREATED` | New invoice generated |
| `INVOICE_PAID` | Invoice marked as paid |
| `PACKAGE_CHANGED` | Tenant switched packages |
| `FEATURE_CHANGED` | Feature entitlement changed |
| `GRACE_PERIOD_STARTED` | Tenant entered grace period |
| `READ_ONLY_STARTED` | Tenant entered read-only mode |
| `TENANT_SUSPENDED` | Tenant access suspended |
| `TENANT_ACTIVATED` | Tenant access activated |

### Subscribed (from other platforms)
| Event | Action |
|-------|--------|
| `TENANT_CREATED` | Initialize trial subscription if applicable |
| `PAYMENT_WEBHOOK_RECEIVED` | Process payment confirmation |
| `ADMIN_APPROVE_TRIAL` | Approve and provision trial tenant |

---

## 10. Platform Communication

### Publishes (Events)
- 20 event types (see §9 above)

### Subscribes (Events)
- `TENANT_CREATED`, `PAYMENT_WEBHOOK_RECEIVED`, `ADMIN_APPROVE_TRIAL`

### Provides (Public Services)
- `checkAccess(tenantId)` → AccessGate
- `resolveFeatures(tenantId)` → FeatureSet
- `checkQuota(tenantId, resource)` → QuotaCheck
- `createInvoice(params)` → Invoice
- `recordPayment(webhook)` → PaymentResult

### Consumes (from other platforms)
- Identity Platform: `resolveIdentity()` — to link subscription to customer
- Communication Platform: `sendMessage()` — payment receipts, reminders
- Notification Center: `createNotification()` — payment failed, trial expiring

---

## 11. Dependencies

### Required Platforms
| Platform | Why |
|----------|-----|
| Identity Platform | Resolve tenant identity for subscription operations |
| Configuration Platform | Read billing rules from `subscription_settings` |

### Optional Platforms
| Platform | Why |
|----------|-----|
| Communication Platform | Send payment receipts and reminders |
| Notification Center | Notify admins of payment failures, trial expirations |
| Analytics Platform | Report MRR, ARR, churn |

### Forbidden Dependencies
| Platform | Reason |
|----------|--------|
| Pharmacy Platform | Business Platform → Business Platform is forbidden (Mesh §7) |
| Any other Business Platform | Same rule |

---

## 12. Data Ownership

| Entity | Owned By | Notes |
|--------|----------|-------|
| `subscriptions` | Billing Platform | Current subscription state, lifecycle_state, type, timing |
| `subscription_events` | Billing Platform | Immutable event ledger — single source of truth for lifecycle history |
| `tenant_packages` | Billing Platform | Package catalog |
| `package_features` | Billing Platform | Feature-to-package mapping |
| `invoices` | Billing Platform | All billing invoices |
| `payments` | Billing Platform | All payment records |
| `trial_requests` | Billing Platform | Trial intake queue |
| `subscription_settings` | Billing Platform | Versioned billing configuration |
| `tenant_quota_usage` | Billing Platform | Per-tenant resource usage counters |
| `marketing_promotions` | Billing Platform (Marketing) | Offer definitions (consumed by Billing for discount) |
| `payment_providers` | Billing Platform (shared with Communication) | Provider registry for payment gateways |

---

## 13. Public Capabilities

(Conceptual — not API definition. Describes WHAT the platform can do.)

| Capability | Description |
|-----------|-------------|
| `checkAccess(tenantId)` | Returns the tenant's access gate status (active, trial, grace, suspended, ...) |
| `resolveFeatures(tenantId)` | Returns the complete set of features the tenant has access to |
| `checkQuota(tenantId, resource)` | Returns current usage vs limit for a resource |
| `createInvoice(params)` | Creates a draft invoice for the tenant |
| `recordPayment(webhookEvent)` | Processes a payment webhook — idempotent, auditable |
| `suspendTenant(tenantId)` | Suspends access — called by scheduler or admin |
| `activateTenant(tenantId)` | Restores access after successful payment |
| `renewSubscription(tenantId)` | Extends subscription period |
| `upgradePackage(tenantId, newPackageId)` | Changes package with proration |
| `downgradePackage(tenantId, newPackageId)` | Changes package with proration (credit-only, no refund) |
| `cancelSubscription(tenantId)` | Terminates subscription |

---

## 14. Quality Attributes

| Attribute | Target |
|-----------|--------|
| **Availability** | 99.9% — billing is critical path for tenant access |
| **Consistency** | Strong consistency for subscription state (single-writer RPC). Eventual consistency for analytics. |
| **Scalability** | Subscription operations are per-tenant, index-backed. Payment webhooks are idempotent by reference. |
| **Security** | All writes through privileged server actions or RPC. RLS on reads (tenant-scoped). Credentials encrypted. |
| **Auditability** | Every lifecycle change is an immutable `subscription_events` row. Every invoice and payment is timestamped and traceable. |
| **Reliability** | Idempotent webhook processing. Atomic subscription transitions (RPC). Config-driven retry policy. |

---

## 15. Platform Contract

(Filled per Platform Contract Standard §5)

### Platform Identity
- **Name:** Billing Platform
- **Category:** Shared Platform
- **Version:** 1.0.0
- **Status:** Active

### Purpose
Govern the complete SaaS subscription lifecycle. Determine tenant access, enforce
limits, manage billing, and process payments. Every business platform depends on
Billing to know whether a tenant is allowed to operate.

### Responsibilities
**Owns:** Trial lifecycle, subscription lifecycle, package catalog, feature
entitlement, invoice management, payment recording, renewal orchestration,
suspension/activation, tenant license status, billing policies, billing
configuration, billing audit trail.

**Does NOT own:** Business transactions, communication delivery, identity
resolution, user management, analytics, notifications.

### Ownership
- **Data:** subscriptions, subscription_events, tenant_packages, package_features, invoices, payments, trial_requests, subscription_settings, tenant_quota_usage, marketing_promotions
- **Lifecycle:** Subscription lifecycle (trial → active → grace → read_only → suspended → archived)
- **Policies:** Grace period, retry policy, auto-suspend, proration policy

### Communication
- **Publishes:** 20 event types (TRIAL_STARTED, SUBSCRIPTION_CREATED, PAYMENT_RECEIVED, TENANT_SUSPENDED, ...)
- **Subscribes:** TENANT_CREATED, PAYMENT_WEBHOOK_RECEIVED, ADMIN_APPROVE_TRIAL
- **Provides:** checkAccess, resolveFeatures, checkQuota, createInvoice, recordPayment, suspend/activate/renew/upgrade/downgrade/cancel

### Dependencies
- **Required:** Identity Platform, Configuration Platform
- **Optional:** Communication Platform, Notification Center, Analytics Platform
- **Forbidden:** Any Business Platform

### Data Ownership
All billing entities owned by Billing Platform. No shared tables with other platforms. Other platforms consume billing data through events and public services.

### Lifecycle
- **Creation:** Core platform — provisioned at MEDISYNC initialization
- **Maintenance:** Additive, idempotent migrations
- **Upgrade:** Rolling, zero-downtime. Backward-compatible schema changes.
- **Deprecation:** Not applicable (foundational)

### Versioning
- Platform Version: 1.0.0
- Contract Version: 1.0.0
- Breaking changes: 1 MAJOR version backward compatibility

### Quality
- Availability: 99.9%
- Consistency: Strong (single-writer RPC)
- Performance: Subscription check < 50ms. Feature resolution < 100ms.
- Observability: All state changes as events. Structured logs with correlationId.
- Audit: Immutable subscription_events ledger.

---

## 16. Governance Review

| # | Check | Status |
|---|-------|:---:|
| 1 | Platform Contract completed | ✅ §15 |
| 2 | All dependencies downward (Shared only) | ✅ §11 |
| 3 | No direct database access to other platforms | ✅ |
| 4 | No Business Platform dependency | ✅ |
| 5 | All events through Enterprise Event Bus | ✅ §9, §10 |
| 6 | Idempotent event consumers | ✅ (payment webhooks, subscription transitions) |
| 7 | No hardcoded provider references | ✅ (PaymentProvider interface) |
| 8 | Independent operation | ✅ (core function without optional platforms) |
| 9 | Data ownership clearly declared | ✅ §12 |
| 10 | Versioning strategy defined | ✅ §15 |
| 11 | AI integration points reserved | ✅ (predictive billing, churn detection — future) |
| 12 | Security boundary documented | ✅ (RLS + privileged server actions + RPC) |

---

## 17. Self Review

| Dimension | Assessment |
|-----------|-----------|
| **Completeness** | 17 sections: identity through governance; Platform Contract fully filled |
| **Consistency** | Aligned with Constitution, Mesh, and Contract Standard. SLE Phase 1-5 implementation reflected in architecture. |
| **Future Scalability** | Package model supports custom tiers, usage-based, add-ons. Provider interface decouples payment gateways. |
| **SaaS Readiness** | Trial, subscription, grace, suspension, upgrade, downgrade, renewal — fully covered. |
| **Platform Compatibility** | Mesh-compliant. Shared Platform. Downward dependencies only. Event-driven communication. |

---

> **This is the authoritative architecture for the MEDISYNC Billing Platform.**
>
> Every implementation decision — past, present, and future — is governed by
> this document. The Subscription Lifecycle Engine (SLE), Payment Provider
> Manager, Feature Resolver, and Invoice/Payment repositories are the
> concrete realization of this architecture.
