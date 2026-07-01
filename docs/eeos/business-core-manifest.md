# MEDISYNC Business Core Manifest v1.0

> **Authority**: EEOS Architecture Board
> **Status**: 🔒 BUSINESS CORE LOCKED
> **Effective**: 2026-07-01

---

## Certified Engines

| Engine | Layer | Version | Certification | ADRs | Status |
|--------|-------|---------|---------------|------|--------|
| **UUCE** (Universal Unit Conversion Engine) | L0 Foundation | 1.0.0 | Level 2 | ADR-001..009 | 🔒 FROZEN |
| **Review Priority Engine** | L1 Domain | 2.0.0 | Level 1 | Implicit | ✅ Production |
| **Transaction Correction Engine** | L2 Transaction | 1.0.0 | Level 1 | ADR-001..007 | ✅ Production |
| **OTP Service** | L0 Foundation | 1.0.0 | Level 1 | ADR-004 | ✅ Production |

## Layer Architecture

```
L0 — FOUNDATION ENGINES (zero dependencies)
├── UUCE (unit conversion)
└── OTP Service (security)

L1 — DOMAIN ENGINES (depend on L0)
├── Review Priority Engine
├── Match Engine
├── Warning Engine
├── Draft Engine
└── Duplicate Engine

L2 — TRANSACTION ENGINES (depend on L0+L1)
├── Transaction Correction Engine
├── Purchase Correction Engine
└── FEFO Allocator (L1, to be promoted to L2 Engine)

L3 — EXTENSION ENGINES (future)
├── Dose Engine (Healthcare)
├── Formula Engine (Compounding)
└── IV Engine (Infusion)
```

## Certification Levels

| Level | Criteria | Examples |
|-------|----------|----------|
| **Level 1** | Pure functions, zero side effects, tested | Review Priority Engine |
| **Level 2** | Level 1 + Architecture Board approved, ADRs, public API documented, 48+ tests | UUCE |
| **Level 3** | Production Proven — stable public API, no architecture drift, used by all relevant modules, passed one production release cycle | (target) |

## Certification Registry

| Engine | Version | Level | Certified | Modules Using |
|--------|---------|-------|-----------|---------------|
| UUCE | 1.0.0 | **Level 2** | ✅ | Purchasing, Cashier, Opname, Transfer, Reporting |
| IAE | 1.0.0 | **Level 2** | ✅ | Inventory, Cashier |
| OTP Service | 1.0.0 | **Level 1** | ✅ | Correction Engine |
| Review Priority Engine | 2.0.0 | **Level 1** | ✅ | Purchasing |
| Match Engine | 1.0.0 | **Level 1** | ✅ | Purchasing Import |
| Warning Engine | 1.0.0 | **Level 1** | ✅ | Purchasing Import |
| Draft Engine | 1.0.0 | **Level 1** | ✅ | Purchasing Draft |
| Duplicate Engine | 1.0.0 | **Level 1** | ✅ | Purchasing Draft |
| Merge Engine | 1.0.0 | **Level 1** | ✅ | Purchasing Draft |
| Transaction Correction | 1.0.0 | **Level 1** | ✅ | Purchase Invoice |

## Certified Module Matrix

| Module | UUCE | IAE | OTP | Review | Match | Warn | Draft | Dup | Merge | Correct | Coverage |
|--------|------|-----|-----|--------|-------|------|------|-----|-------|---------|----------|
| Purchasing | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 100% |
| Inventory | ✅ | ✅ | — | — | — | — | — | — | — | — | 100% |
| Cashier | ✅ | ✅ | — | — | — | — | — | — | — | — | 100% |
| Stock Opname | ✅ | — | — | — | — | — | — | — | — | — | 100% |
| Stock Transfer | ✅ | — | — | — | — | — | — | — | — | — | 100% |
| Reporting | ✅ | — | — | — | — | — | — | — | — | — | 100% |

## Deprecation Status

| Component | Status | Replacement | Removal Target |
|-----------|--------|-------------|----------------|
| `unit-helper.ts` | ⚠️ Deprecated | UUCE | MEDISYNC v2.0 |
| `unit-converter.ts` (old impl) | ⚠️ Deprecated | UUCE bridge | MEDISYNC v2.0 |
| `fefo-allocator.ts` (old impl) | ⚠️ Deprecated | IAE | MEDISYNC v2.0 |

## Core Rules

### RULE-BC-001: Business Core Engine Purity

All Business Core Engines MUST be pure functions.

Business Core Engines are **PROHIBITED** from:
- Accessing Database
- Accessing Repository
- Accessing Store
- Accessing UI
- Accessing Network
- Performing Side Effects

Business Core Engines may ONLY:
- Receive Input
- Process Data
- Produce Output

This rule applies to all current and future Business Core Engines.

### RULE-BC-002: Business Core Engine Dependency Declaration

All dependencies between Business Core Engines MUST be explicitly documented in the Business Core Manifest.

Implicit dependencies are prohibited.

Every engine must declare:
- What it depends on
- What depends on it
- The nature of the dependency (required / optional)

## Dependency Graph

```
L0 — FOUNDATION (zero dependencies)
├── UUCE
│   └── dependents: IAE, HPP*, Inventory*, Cashier*, Purchase*
├── OTP Service
│   └── dependents: Correction Engine

L1 — DOMAIN (depend on L0)
├── IAE ────────── depends on: UUCE
│   └── dependents: Cashier*, Inventory*, Transfer*
├── Review Priority ─ depends on: none
├── Match Engine ── depends on: none
├── Warning Engine ─ depends on: Match Engine
├── Draft Engine ─── depends on: none
├── Duplicate Engine ─ depends on: none
└── Merge Engine ─── depends on: Duplicate Engine

L2 — TRANSACTION (depend on L0+L1)
└── Correction Engine ─ depends on: OTP Service, UUCE

*Future engines — not yet certified
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-01 | Initial Business Core Lockdown |
| 1.1.0 | 2026-07-01 | Dependency graph, RULE-BC-002, Certification Registry |
