# EEOS v2.0 — Engineering Workflow

## Complete Workflow

```
REQUEST
  │  Product Owner describes what to build
  ▼
DISCOVERY (Context + Knowledge + Dependency)
  │  EEOS determines: module, epic, related bugs, affected code
  ▼
ARCHITECTURE REVIEW
  │  Verify: Constitution, Blueprint, ADRs, Principles, DoD
  ▼
RISK ANALYSIS
  │  Classify: P0-P3, regression risk, migration risk, breaking change risk
  ▼
PLANNING
  │  Generate: Engineering Execution Plan with stories, tasks, dependencies
  ▼
IMPLEMENTATION
  │  Story-by-story, gate-by-gate. Code + tests.
  ▼
VERIFICATION
  │  TypeScript, build, tests, architecture grep
  ▼
REGRESSION
  │  Determine affected modules. Run regression suite.
  ▼
HARDENING
  │  Search for similar patterns. Fix all instances.
  ▼
DOCUMENTATION
  │  Update ONLY affected documents. Never create unnecessary docs.
  ▼
RELEASE RECOMMENDATION
  │  Dev Complete → Needs QA → Ready for Preview → Ready for Production
  ▼
COMPLETED
```

## Phase Transitions

| From | To | Gate |
|------|----|------|
| REQUEST | DISCOVERY | Product Owner description |
| DISCOVERY | ARCHITECTURE | Context + knowledge + dependency identified |
| ARCHITECTURE | RISK | All architecture checks passed |
| RISK | PLANNING | No P0 risks unmitigated |
| PLANNING | IMPLEMENTATION | Engineering Plan approved |
| IMPLEMENTATION | VERIFICATION | All story gates passed |
| VERIFICATION | REGRESSION | TypeScript + build + tests green |
| REGRESSION | HARDENING | No regression failures |
| HARDENING | DOCUMENTATION | Audit complete |
| DOCUMENTATION | RELEASE | Docs updated |
| RELEASE | COMPLETED | Release recommendation |

## Mandatory Gates

Every phase transition requires explicit verification. No phase may be skipped. No gate may be bypassed without Architecture Board approval.
