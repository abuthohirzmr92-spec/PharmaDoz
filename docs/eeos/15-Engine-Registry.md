# EEOS v2.1 — Engine Registry

## Engine Catalog

| # | Engine | Purpose | Consumes | Produces | Blocking? | Mandatory? |
|---|--------|---------|----------|----------|:--------:|:--------:|
| 1 | Context Discovery | Determine module/epic/sprint | Product Owner request | `{ module, epic, sprint }` | No | Yes |
| 2 | Knowledge Discovery | Search KB for prior art | Context output | `{ related_bugs, adrs, playbooks }` | No | Yes |
| 3 | Dependency Discovery | Identify affected files | Context + Knowledge | `{ changed, dependents, tests }` | No | Yes |
| 4 | Architecture Compliance | Verify Constitution/ADR/Blueprint | All discovery outputs | `{ compliant, violations }` | **Yes** | Yes |
| 5 | Risk Analysis | Classify risks P0-P3 | Architecture output | `{ risks, blocked }` | **Yes** | Yes |
| 6 | Planning | Generate Engineering Plan | All prior outputs | `{ stories, tasks, deps }` | No | Yes |
| 7 | Implementation | Execute story-by-story | Engineering Plan | `{ story_statuses }` | No | Yes |
| 8 | Verification | Run TS/build/tests | Implementation output | `{ ts, build, tests }` | **Yes** | Yes |
| 9 | Regression | Determine regression scope | Verification output | `{ affected_modules, tests }` | **Yes** | Yes |
| 10 | Hardening | Search for similar patterns | Regression output | `{ findings }` | No | Yes |
| 11 | Documentation | Determine doc impact | All prior outputs | `{ docs_updated, docs_created }` | No | Yes |
| 12 | Release | Determine release readiness | All prior outputs | `{ status, recommendation }` | No | Yes |

## Blocking Engines

Engines marked **Blocking** stop the pipeline on failure:

- **Architecture Compliance**: Violation → BLOCKED (cannot proceed)
- **Risk Analysis**: P0 risk → BLOCKED (must mitigate)
- **Verification**: TS/build/test failure → BLOCKED (must fix)
- **Regression**: Regression failure → BLOCKED (must investigate)

## Non-Blocking Engines

Engines produce informational output but do not block:

- Context, Knowledge, Dependency: inform but don't gate
- Planning: produces plan, doesn't validate
- Hardening: findings are warnings, not blockers
- Documentation: impact report only
