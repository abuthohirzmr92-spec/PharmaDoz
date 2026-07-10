# EEOS v2.2 — Policy Engine

## Purpose

Centralized engineering policy enforcement. The Policy Engine is the highest operational authority after the Architecture Constitution.

## Policy Catalog

| # | Policy | Trigger | Enforcement | Blocking? | Escalation | Exception |
|---|--------|---------|-------------|:---------:|------------|-----------|
| P1 | **Architecture First** | Any implementation task | Architecture Compliance Engine must PASS before Implementation | **Yes** | Architecture Board | Emergency hotfix (documented post-fix) |
| P2 | **Business Rule Protection** | Change affecting FEFO, pricing, inventory, checkout | Risk Analysis must verify 0 business rule changes | **Yes** | Domain Architect | ADR-approved rule change |
| P3 | **Documentation Minimalism** | Any document creation | Documentation Engine verifies no duplicate exists | No | Engineering Lead | None |
| P4 | **Repository Integrity** | Pre-push | Working tree clean, no debug code, no secrets | **Yes** | Engineering Lead | None |
| P5 | **Regression Mandatory** | Post-implementation | Regression Engine defines scope, tests must pass | **Yes** | Engineering Lead | UI-only changes (no logic) |
| P6 | **SSOT Protection** | Data duplication detection | Dependency Engine checks for duplicate sources of truth | No | Domain Architect | Caching layer (documented) |
| P7 | **ADR Compliance** | Architecture change | Relevant ADRs consulted, no conflicts | **Yes** | Architecture Board | New ADR supersedes old |
| P8 | **Blueprint Compliance** | Feature implementation | Implementation matches Blueprint design | **Yes** | Chief Architect | ADR-approved deviation |
| P9 | **Constitution Compliance** | Every task | All 15 Principles, 18 Invariants verified | **Yes** | Architecture Board | None |
| P10 | **No Silent Breaking Changes** | API/type/store change | Breaking change must be documented in ADR or sprint plan | No | Engineering Lead | Dual-write transition period |
| P11 | **No UI Changes Without Approval** | UI modification | Product Owner approval for visual changes | No | Product Owner | Bug fix that incidentally changes UI |
| P12 | **No Duplicate Documents** | Document creation | Documentation Engine checks existing docs first | No | Engineering Lead | None |

## Policy Hierarchy

```
Architecture Constitution (supreme)
    │
    ▼
Policy Engine (operational)
    │
    ├── Blocking Policies (P1, P2, P4, P5, P7, P8, P9)
    │     Failure → BLOCKED, escalate to Architecture Board
    │
    └── Advisory Policies (P3, P6, P10, P11, P12)
          Failure → WARNING, document and continue
```

## Exception Process

1. Engineer identifies need for exception
2. Documents: which policy, why exception, risk, mitigation
3. Submits to Policy Engine
4. Policy Engine routes to appropriate authority:
   - Architecture Board (architecture policies)
   - Product Owner (feature/UI policies)
   - Engineering Lead (process policies)
5. Exception documented in sprint notes
