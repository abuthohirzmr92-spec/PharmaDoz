# EEP v1.0 — Protocol Lifecycle

## Universal Lifecycle

```
REQUEST ──► DISCOVERY ──► PLANNING ──► ARCHITECTURE_REVIEW
                                               │
                                               ▼
                                          EXECUTION
                                               │
                                               ▼
                                          VALIDATION
                                               │
                                               ▼
                                            REPORT
                                               │
                                               ▼
                                           ARCHIVE
```

## Stages

| Stage | Owner | Exit Condition |
|-------|-------|---------------|
| **REQUEST** | Product Owner | Request documented with scope |
| **DISCOVERY** | Context + Knowledge + Dependency Engines | Module, epic, dependencies identified |
| **PLANNING** | Planning Engine | Stories + tasks + dependencies defined |
| **ARCHITECTURE_REVIEW** | Architecture Compliance Engine | 0 violations |
| **EXECUTION** | Implementation Engine | All story gates passed |
| **VALIDATION** | Verification + Regression Engines | TS + Build + Tests PASS |
| **REPORT** | Documentation + Release Engines | Release recommendation |
| **ARCHIVE** | Workspace | Immutable record stored |

## Transitions

All transitions are FORWARD only. No backwards transitions. ARCHIVE is terminal.

## Ownership

Each stage is OWNED by exactly one engine. No two engines may claim the same stage.
