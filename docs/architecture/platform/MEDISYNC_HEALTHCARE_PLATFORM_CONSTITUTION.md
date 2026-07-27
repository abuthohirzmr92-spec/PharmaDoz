# MEDISYNC Healthcare Platform — Constitution

> **Status: SUPREME ARCHITECTURAL AUTHORITY**
>
> This document is the highest architectural reference for MEDISYNC. Every
> architecture document, domain design, platform decision, and implementation
> plan MUST conform to this Constitution. No lower document may contradict it.

---

## 1. What is MEDISYNC?

MEDISYNC is a **Healthcare Platform** — not a pharmacy app, not a clinic
management system, not an ERP, and not hospital software.

MEDISYNC is the digital infrastructure on which healthcare businesses operate,
connect, and grow. It provides reusable shared platforms (Identity, Communication,
Billing, AI, Analytics, Automation) and composes them into business platforms
(Pharmacy, Clinic, Laboratory, Telemedicine, and future healthcare modules).

A single pharmacy using MEDISYNC runs on the same platform foundation that a
national pharmacy chain, a clinic network, or a telemedicine provider runs on.

**MEDISYNC is:**
- A Healthcare Digital Ecosystem
- A Platform of Platforms
- Cloud Native, Multi-Tenant, API First
- Domain-Driven, Event-Driven, AI Ready

**MEDISYNC is NOT:**
- A monolithic pharmacy application
- A single-product ERP
- A clinic-only or hospital-only system
- Tied to any single provider, vendor, or technology stack

---

## 2. Vision

To become the **Connected Healthcare Platform** of Indonesia —
and beyond.

A platform where:
- Pharmacies, clinics, laboratories, and telemedicine providers operate on
  shared, reusable digital infrastructure.
- Patients have a unified healthcare experience across providers.
- AI assists every clinical and operational decision.
- Healthcare data flows securely, with consent, between authorized parties.
- Every healthcare business — from a single UMKM pharmacy to a national chain —
  can access enterprise-grade technology.

---

## 3. Mission

- **Digitize Healthcare Operations** — replace paper, spreadsheets, and
  fragmented systems with a unified platform.
- **Connect Healthcare Businesses** — enable seamless data and workflow
  integration between pharmacies, clinics, labs, insurers, and patients.
- **Simplify Healthcare Workflows** — make complex healthcare operations
  intuitive through thoughtful domain design.
- **Improve Patient Experience** — put the patient at the center of every
  interaction, from prescription to payment to follow-up.
- **Create an Open Healthcare Ecosystem** — provide APIs, SDKs, and a
  marketplace for third-party healthcare innovation.
- **Enable AI Healthcare** — build the data foundation for AI-assisted
  diagnostics, predictions, recommendations, and automation.

---

## 4. Core Philosophy

| Principle | Meaning |
|-----------|---------|
| **Platform First** | Build shared platforms before business features. Reuse across domains. |
| **Domain Driven** | Every business domain is independent. They communicate via events, not direct calls. |
| **Healthcare First** | Every design decision starts from healthcare needs, not technology preferences. |
| **Patient Centric** | The patient's identity, history, and consent flow across all domains. |
| **Cloud Native** | Designed for the cloud from day one. Multi-tenant, elastic, resilient. |
| **API First** | Every capability is exposed via API before any UI is built. |
| **AI Ready** | Data is structured, events are tracked, models are pluggable. |
| **Modular** | Business domains are independent modules. Add or remove without cascading changes. |
| **Composable** | Complex workflows are composed from simple, reusable domains. |
| **Event Driven** | Domains communicate through events (Enterprise Event Bus), not direct calls. |
| **Enterprise Grade** | Multi-tenant isolation, RBAC, audit trail, SLA, compliance — built in. |
| **Scalable** | Architecture supports 1 tenant or 100,000 tenants without redesign. |

---

## 5. Platform Architecture

MEDISYNC is a **Platform of Platforms** organized into three layers.

```
┌─────────────────────────────────────────────────────────────────┐
│                   EXPERIENCE PLATFORM LAYER                      │
│                                                                  │
│  Admin Portal · Doctor Portal · Pharmacist Portal               │
│  Patient Portal · Cashier Workspace · Mobile Apps · Kiosk       │
│  Public API · Partner Portal · Developer Portal                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                   BUSINESS PLATFORM LAYER                        │
│                                                                  │
│  Pharmacy · Clinic · Laboratory · Telemedicine · EMR            │
│  Radiology · Dental · Optical · Homecare · Vaccination          │
│  Insurance · Future Healthcare Modules                           │
│                                                                  │
│  Each domain is INDEPENDENT but consumes Shared Platforms       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                    SHARED PLATFORM LAYER                          │
│                                                                  │
│  Identity · Communication · Integration · Billing               │
│  AI · Notification · Analytics · Automation · Security          │
│  Document · Media · Storage · Audit · Configuration             │
│  Feature Flag · Search · Workflow · Event Bus                   │
│                                                                  │
│  These are reusable across EVERY healthcare module              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. Shared Platform Layer

Shared platforms are reusable infrastructure that every business domain consumes.
They are built ONCE and used EVERYWHERE.

| Platform | Responsibility |
|----------|---------------|
| **Identity Platform** | User identity, authentication, RBAC, tenant membership (Customer Identity Engine) |
| **Communication Platform** | WhatsApp, SMS, Email, Push — Decision → Orchestrator → Scheduler → Dispatcher → Provider Framework |
| **Integration Platform** | BPJS, Marketplace, Payment Gateways, Webhook, REST API |
| **Billing Platform** | Subscription lifecycle, invoicing, payments, proration (SLE) |
| **AI Platform** | Diagnostics, OCR, forecasting, recommendations, intent detection |
| **Notification Platform** | User notifications — all engines publish here (Enterprise Notification Center) |
| **Analytics Platform** | MRR, ARR, sales trends, customer analytics, operational metrics |
| **Automation Platform** | Workflow engine, scheduled jobs, event-triggered actions |
| **Security Platform** | Encryption, secret management, audit, compliance |
| **Document Platform** | Templates, PDF generation, e-signature |
| **Media Platform** | Image upload, optimization, CDN |
| **Storage Platform** | File storage, backup, archival |
| **Audit Platform** | Immutable audit log across all domains |
| **Configuration Platform** | Feature flags, tenant settings, subscription_settings |
| **Search Platform** | Global search across tenants, domains, entities |
| **Workflow Platform** | Business process orchestration (approvals, multi-step workflows) |
| **Event Bus** | Enterprise Event Bus — the communication backbone between all domains |

---

## 7. Business Platform Layer

Each business domain is a standalone module that consumes shared platforms.

| Domain | Description | Status |
|--------|-------------|:---:|
| **Pharmacy Platform** | Inventory, sales, purchasing, FEFO, batch tracking, cashier, reporting | 🟢 Active |
| **Clinic Platform** | Patient registration, queue management, prescription, billing | ⚪ Future |
| **Laboratory Platform** | Test ordering, result entry, reporting, reference ranges | ⚪ Future |
| **Telemedicine Platform** | Video consultation, chat, e-prescription | ⚪ Future |
| **EMR Platform** | Electronic medical records, SOAP notes, history | ⚪ Future |
| **Radiology Platform** | Image ordering, PACS integration, reporting | ⚪ Future |
| **Dental Platform** | Odontogram, treatment planning | ⚪ Future |
| **Optical Platform** | Refraction, lens prescription | ⚪ Future |
| **Homecare Platform** | Home visit scheduling, care plans | ⚪ Future |
| **Vaccination Platform** | Vaccine inventory, scheduling, certification | ⚪ Future |
| **Insurance Platform** | Claim processing, verification, adjudication | ⚪ Future |

**Rule:** Each business domain is independent. Adding a new business domain
does not require changes to shared platforms or other business domains.

---

## 8. Experience Platform Layer

Experiences are built on top of business domains. Multiple experiences can
consume the same business domain.

| Experience | Audience | Status |
|-----------|----------|:---:|
| **Super Admin Portal** | Platform operators | 🟢 Active |
| **Owner Portal** | Pharmacy/clinic owners | 🟢 Active |
| **Pharmacist Portal** | Pharmacist workflow | ⚪ Future |
| **Doctor Portal** | Doctor workflow | ⚪ Future |
| **Patient Portal** | Patients (appointments, history, payments) | ⚪ Future |
| **Cashier Workspace** | Fast checkout, optimized for speed | 🟢 Active |
| **Mobile Apps** | iOS, Android for all roles | ⚪ Future |
| **Tablet Apps** | iPad for clinical workflows | ⚪ Future |
| **Kiosk** | Self-service in pharmacy/clinic | ⚪ Future |
| **Public API** | Third-party developers | ⚪ Future |
| **Partner Portal** | Suppliers, BPJS, marketplace partners | ⚪ Future |
| **Developer Portal** | SDK, documentation, sandbox | ⚪ Future |

---

## 9. Platform Relationship

```
Dependency direction (ALWAYS downward):

Business Platform (Pharmacy, Clinic, Lab, ...)
   │  depends on
   ▼
Shared Platform (Identity, Communication, Billing, AI, ...)
   │  depends on
   ▼
Infrastructure (Supabase, Vercel, PostgreSQL, Storage)

NEVER:
  Shared Platform → depends on → Business Platform  ❌
  Infrastructure → depends on → Shared Platform     ❌
```

Lower layers have **zero knowledge** of higher layers. The Communication
Platform does not know it is being used by the Pharmacy Platform. The Identity
Platform does not know it is resolving a Patient vs a Pharmacist.

---

## 10. Architecture Principles

| # | Principle | Description |
|---|-----------|-------------|
| 1 | **Shared Before Duplicate** | If a capability is needed by 2+ domains, it belongs in Shared Platform |
| 2 | **Platform Before Product** | Build the platform foundation before building vertical products |
| 3 | **Business Independence** | Business domains do not import or call each other directly |
| 4 | **Loose Coupling** | Domains communicate through events, not direct function calls |
| 5 | **High Cohesion** | Everything within a domain belongs together; nothing leaks out |
| 6 | **Single Responsibility** | Each domain owns exactly one business capability |
| 7 | **Provider Independent** | No business logic depends on a specific external provider |
| 8 | **Vendor Independent** | No architectural decision locks MEDISYNC to a vendor |
| 9 | **AI Ready** | Every domain designs data and events for future AI consumption |
| 10 | **Cloud Native** | Stateless where possible, elastic, multi-tenant, resilient |
| 11 | **API First** | Every capability is exposed via API. UI consumes API. |
| 12 | **Configuration Over Hardcode** | Business rules live in `subscription_settings`, not in code |
| 13 | **Composition Over Inheritance** | Complex behavior is composed from simple domains |
| 14 | **Event Sourcing for Critical Paths** | Lifecycle events are append-only and immutable |
| 15 | **Defense in Depth** | Security at every layer: RLS, RPC, server actions, encryption, audit |

---

## 11. Naming Convention

Consistent naming across the platform communicates architectural intent.

| Suffix | Meaning | Example |
|--------|---------|---------|
| **Platform** | A complete business or shared capability layer | Pharmacy Platform, Communication Platform |
| **Engine** | A domain that owns a specific business process | Broadcast Engine, Decision Engine |
| **Center** | A domain that aggregates and presents | Activity Center, Notification Center |
| **Hub** | A central integration point | Integration Hub (future) |
| **Framework** | An abstraction layer over external providers | Communication Provider Framework |
| **Gateway** | A single entry point to external systems | Payment Gateway, BPJS Gateway |
| **Workspace** | A role-specific UI | Cashier Workspace, Doctor Workspace |
| **Portal** | A multi-role UI | Owner Portal, Admin Portal, Patient Portal |
| **Service** | An orchestrator of domain logic | BillingService, ReminderService |
| **Registry** | A catalog of registered entities | Provider Registry, Channel Registry |
| **Resolver** | A component that resolves one entity from input | Provider Resolver, Identity Resolver |
| **Manager** | A component that manages lifecycle of entities | Credential Manager, Health Monitor |
| **Coordinator** | A component that coordinates across entities | (reserved for future) |
| **Dispatcher** | A component that executes dispatch | Enterprise Dispatcher |
| **Orchestrator** | A component that plans and decides | Communication Orchestrator |
| **Validator** | A component that validates rules | Business Hour Validator, Compliance Engine |
| **Decision Engine** | A component that makes binary decisions | Communication Decision Engine |
| **Lifecycle Engine** | A component that manages post-event lifecycle | Communication Lifecycle Engine |

---

## 12. Document Hierarchy

Architecture documents are organized in a strict hierarchy. Higher documents
govern lower documents. No lower document may contradict a higher document.

```
CONSTITUTION (this document)
   │
   ▼
PLATFORM ARCHITECTURE
   (Shared Platform / Business Platform / Experience Platform)
   │
   ▼
DOMAIN ARCHITECTURE
   (Pharmacy Domain / Identity Domain / Communication Domain / ...)
   │
   ▼
SUBSYSTEM DESIGN
   (Broadcast Engine / Decision Engine / Dispatcher / ...)
   │
   ▼
FEATURE SPECIFICATION
   (Campaign Snapshot / Consent Engine / Provider Failover / ...)
   │
   ▼
IMPLEMENTATION
   (Code, Database, API, UI)
```

**Rule:** If a Domain Architecture document contradicts the Constitution, the
Constitution wins. The Domain document must be updated.

---

## 13. Future Evolution

MEDISYNC is designed for the next 10+ years. The architecture anticipates:

| Evolution | Description |
|-----------|-------------|
| **Healthcare AI** | AI-assisted diagnostics, OCR prescriptions, outcome prediction, clinical decision support |
| **Marketplace** | Third-party healthcare apps and integrations |
| **Plugin Ecosystem** | Developers build extensions on MEDISYNC APIs |
| **SDK** | Native SDKs for iOS, Android, Web, and backend |
| **Developer Platform** | Sandbox, documentation, API keys, rate limiting |
| **Integration Marketplace** | Pre-built connectors for BPJS, SATUSEHAT, payment gateways, labs |
| **Healthcare Cloud** | MEDISYNC-managed hosting for healthcare businesses |
| **Internationalization** | Multi-language, multi-currency, multi-regulation |
| **Healthcare Data Exchange** | FHIR, SATUSEHAT, interoperability standards |

---

## 14. Non-Goals

To maintain focus, MEDISYNC explicitly declares what it is NOT:

| Non-Goal | Why |
|----------|-----|
| **Monolithic application** | Architecture is modular by design |
| **Hospital-only software** | MEDISYNC serves the full healthcare spectrum |
| **Single product** | MEDISYNC is a platform, not a single application |
| **Vendor locked** | Every integration is behind an abstraction |
| **Technology locked** | Architecture is technology-agnostic |
| **Provider locked** | Provider Framework supports any communication provider |
| **Framework locked** | Domain logic is independent of Next.js, React, Supabase |
| **On-premise only** | Cloud-native from day one |
| **Indonesia only (forever)** | Architecture supports internationalization |
| **Pharmacy only** | Business platform layer supports any healthcare domain |

---

## 15. Constitutional Principles

These 20 principles govern every architectural decision in MEDISYNC.

| # | Principle |
|---|-----------|
| 1 | **Healthcare First** — every decision starts from healthcare needs |
| 2 | **Platform First** — build shared platforms before business features |
| 3 | **Shared Before Duplicate** — if 2+ domains need it, it belongs in Shared Platform |
| 4 | **Reuse Before Build** — before building, ask: does a shared platform already do this? |
| 5 | **Domain Independence** — business domains never import or call each other directly |
| 6 | **Event Communication** — domains communicate through the Enterprise Event Bus |
| 7 | **AI Ready** — data and events are structured for future AI consumption |
| 8 | **Cloud Native** — stateless, elastic, multi-tenant, resilient |
| 9 | **API First** — every capability exposed via API before UI |
| 10 | **Security By Design** — RLS, encryption, audit at every layer |
| 11 | **Privacy By Design** — patient data privacy is not optional |
| 12 | **Compliance By Design** — BPJS, SATUSEHAT, GDPR, PDPA |
| 13 | **Scalability First** — architecture supports 1 or 100,000 tenants |
| 14 | **Configuration Over Hardcode** — business rules from `subscription_settings` |
| 15 | **Composition Over Duplication** — compose simple domains into complex workflows |
| 16 | **Provider Independence** — no business logic depends on a specific external provider |
| 17 | **Vendor Independence** — switch infrastructure providers without rewriting domains |
| 18 | **Open For Extension, Closed For Modification** — new domains extend, don't modify |
| 19 | **Single Source of Truth** — every fact has exactly one authoritative source |
| 20 | **Honest Architecture** — document what IS built, mark what is FUTURE, confess gaps |

---

## 16. Architectural Governance

Every future architecture document MUST self-assess against this Constitution
before approval.

### Governance checklist (mandatory for every new architecture document):
```
□ Does it conform to the 20 Constitutional Principles?
□ Does it use the Naming Convention correctly?
□ Does it belong in the correct layer (Shared / Business / Experience)?
□ Does it depend only on lower layers?
□ Does it communicate through the Enterprise Event Bus (not direct calls)?
□ Does it declare its OWNED and NOT OWNED responsibilities clearly?
□ Does it avoid vendor/provider lock-in?
□ Is it AI Ready?
□ Is it Multi-Tenant?
□ Is it documented at the correct hierarchy level?
```

### Conflict resolution
```
Constitution > Platform Architecture > Domain Architecture > Subsystem > Feature > Implementation
```

If a lower document conflicts with a higher document, the higher document wins.

---

## 17. Self Review

| Dimension | Assessment |
|-----------|-----------|
| **Completeness** | 17 sections covering identity, vision, philosophy, architecture, governance |
| **Consistency** | Naming convention applied uniformly; principles enforced throughout |
| **Scalability** | Architecture supports 1 → 100,000 tenants without redesign |
| **Healthcare Coverage** | 11 business domains defined; shared platforms cover all cross-cutting concerns |
| **Platform Coverage** | 17 shared platforms; 11 business domains; 12 experience portals |
| **Branding Strength** | Clear identity: Healthcare Platform, not pharmacy software |
| **Architecture Strength** | 3-layer platform architecture; 15 design principles; 20 constitutional principles |
| **Future Readiness** | AI, marketplace, internationalization, SDK, data exchange — all anticipated |
| **Governance** | Document hierarchy + mandatory checklist for new architectures |

---

> **This Constitution is the highest architectural authority of MEDISYNC.**
>
> All architecture documents, platform decisions, domain designs, and
> implementation plans are governed by it. No lower document may
> contradict it.
>
> **Last Amended:** 2026-07-19
> **Status:** ACTIVE — SUPREME ARCHITECTURAL AUTHORITY
