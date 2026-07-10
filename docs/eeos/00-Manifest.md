# EEOS v2.0 — Engineering Execution Orchestration System

**Status: ARCHITECTURE DRAFT**

---

## Preamble

EEOS v2.0 is the Engineering Operating System of MEDISYNC. It orchestrates every engineering task from request to release. It replaces prompt-driven workflows with an architecture-driven orchestration system.

## Mission

The Product Owner describes WHAT to build. EEOS determines HOW engineering execution proceeds — which documents to consult, which risks exist, which modules are affected, which validations are required, which documentation must be updated.

## Architecture

EEOS v2 is composed of distinct engines, each with a single responsibility:

```
Request
    │
    ▼
┌─────────────────────────────────────────────────┐
│              EEOS ORCHESTRATOR                    │
│                                                   │
│  Context ──► Knowledge ──► Dependency ──► Risk    │
│                                                   │
│  Architecture ──► Implementation ──► Regression   │
│                                                   │
│  Documentation ──► Release Recommendation        │
└─────────────────────────────────────────────────┘
    │
    ▼
Completed
```

## Engines

| Engine | Responsibility |
|--------|---------------|
| Context Discovery | Determine module, feature, sprint, epic |
| Knowledge Discovery | Locate KB entries, bugs, retrospectives |
| Dependency Discovery | Identify affected repos, stores, UI, services |
| Risk Analysis | Classify P0-P3, regression, migration risk |
| Architecture Compliance | Verify Constitution, Blueprint, ADR, Principles |
| Implementation | Define implementation workflow |
| Regression | Define mandatory regression strategy |
| Documentation | Determine documentation impact |
| Release | Determine release readiness |

## Principles

1. **Architecture First** — No implementation before architecture review
2. **Deterministic** — Same inputs produce same execution plan
3. **Repository-Aware** — Reads from and writes to the project repository
4. **Documentation-Aware** — Consults existing docs before creating new ones
5. **Framework-Independent** — No dependency on React, Next.js, or any framework

## Scope

EEOS governs engineering PROCESS. It does NOT implement application features. It operates at the meta-level of the project.
