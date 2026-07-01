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
| **Level 3** | Level 2 + production-hardened, performance benchmarks, load-tested | (target for UUCE) |

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
