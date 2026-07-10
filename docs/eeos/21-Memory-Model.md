# EEOS v2.2 — Memory Model

## Purpose

Define how EEOS remembers and retrieves prior engineering knowledge. Memory is deterministic, categorized, and refreshed per execution cycle.

## Memory Categories

| # | Category | Purpose | Source | Priority | Lifetime | Consumers | Refresh |
|---|----------|---------|--------|:--------:|----------|-----------|---------|
| M1 | **Architecture Memory** | Constitution, Blueprints, ADRs | `docs/architecture/` | **P0** | Until superseded | Architecture Compliance, Risk Analysis | Per Blueprint/ADR change |
| M2 | **Bug Memory** | Prior bugs, root causes, resolutions | `docs/bugs/` | **P0** | Forever | Knowledge Discovery, Regression | Per bug resolution |
| M3 | **Knowledge Memory** | Lessons learned, retrospectives | `docs/engineering/*Retrospective*` | P1 | Per sprint cycle | Knowledge Discovery, Implementation | Per retrospective |
| M4 | **Sprint Memory** | Engineering plans, closures, war rooms | `docs/engineering/` | P1 | Per sprint | Context Discovery, Planning | Per sprint |
| M5 | **Decision Memory** | ADRs, governance, principles | `docs/architecture/adr/`, `GOVERNANCE.md` | **P0** | Until superseded | All engines | Per ADR change |
| M6 | **Business Rule Memory** | FEFO, pricing, unit conversion, inventory | Module-specific | **P0** | Until rule changes | Risk Analysis, Regression | Per rule change |
| M7 | **Feature Memory** | PRDs, specifications, requirements | `docs/architecture/{epic}/` | P1 | Per Epic lifecycle | Context Discovery, Planning | Per Epic |

## Memory Resolution

EEOS resolves memory in fixed order:

```
1. Architecture Memory (Constitution + Blueprint + ADRs)
   → Determines WHAT is architecturally possible
2. Decision Memory (Governance + Principles)
   → Determines HOW decisions must be made
3. Business Rule Memory (Domain rules)
   → Determines WHAT behavior must be preserved
4. Bug Memory (Prior bugs)
   → Determines WHAT mistakes to avoid
5. Knowledge Memory (Lessons learned)
   → Determines WHAT processes to follow
6. Sprint Memory (Prior sprints)
   → Determines WHAT patterns worked
7. Feature Memory (Specifications)
   → Determines WHAT to build
```

## Memory Lifetime

| Lifetime | Categories | Rationale |
|----------|-----------|-----------|
| **Permanent** | Architecture, Decision, Bug, Business Rule | Must survive all sprints |
| **Sprint-scoped** | Sprint, Knowledge | Relevant for current sprint planning |
| **Epic-scoped** | Feature | Relevant while Epic is active |

## Refresh Strategy

- Architecture Memory: refreshed on Blueprint/ADR change
- Bug Memory: refreshed on new bug resolution
- Knowledge Memory: refreshed on retrospective completion
- Sprint Memory: refreshed on sprint closure
- Decision Memory: refreshed on governance amendment
- Business Rule Memory: refreshed on rule change (via ADR)
- Feature Memory: refreshed on PRD update
