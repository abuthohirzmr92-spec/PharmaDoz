# EEOS v2.0 — Orchestrator

## Responsibility

The Orchestrator is the central coordinator. It sequences engine execution, enforces phase transitions, and ensures no phase is skipped.

## Architecture

```
Orchestrator
    │
    ├── 1. Context Discovery   → module, epic, sprint
    ├── 2. Knowledge Discovery → KB, bugs, retros
    ├── 3. Dependency Discovery → affected files, stores, UI
    ├── 4. Architecture Review  → Constitution, Blueprint, ADR
    ├── 5. Risk Analysis        → P0-P3, regression, migration
    ├── 6. Planning             → Engineering Plan
    ├── 7. Implementation       → Story-by-story
    ├── 8. Verification         → TS, build, tests
    ├── 9. Regression           → Affected modules
    ├── 10. Hardening           → Pattern search
    ├── 11. Documentation       → Impact analysis
    └── 12. Release             → Recommendation
```

## Orchestration Rules

1. Every engine MUST complete before the next begins
2. If any engine returns BLOCKED, the pipeline stops
3. If any engine returns WARNING, the pipeline continues with notation
4. The Orchestrator never implements — it only sequences

## Input

- Product Owner request (natural language)
- Current branch context
- Repository state

## Output

- Complete execution plan
- Phase-by-phase status
- Release recommendation
