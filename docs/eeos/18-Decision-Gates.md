# EEOS v2.1 — Decision Gates

## Gate Definitions

| Gate | Phase | Success | Failure | Blocking? | Escalation |
|------|-------|---------|---------|:---------:|------------|
| **DISCOVERY_COMPLETE** | After Discovery | Context + Knowledge + Dependency identified | Unable to determine module or dependencies | Yes | Architecture Board clarifies scope |
| **ARCHITECTURE_PASS** | After Architecture Review | 0 violations | ≥1 violation | **Yes** | Chief Architect resolves |
| **RISK_ACCEPTABLE** | After Risk Analysis | No P0 risks | P0 risk found, unmitigated | **Yes** | Architecture Board approves mitigation or rejects |
| **PLAN_APPROVED** | After Planning | Stories + tasks + deps documented | Incomplete or infeasible plan | **Yes** | Engineering Lead revises plan |
| **IMPLEMENTATION_COMPLETE** | After all stories | All story gates passed | Any story gate failed | **Yes** | Engineer fixes, re-submits |
| **VERIFICATION_PASS** | After Verification | TS + Build + Tests all PASS | Any failure | **Yes** | Engineer fixes immediately |
| **REGRESSION_PASS** | After Regression | No regression failures | Regression detected | **Yes** | Engineer investigates, fixes or documents |
| **HARDENING_COMPLETE** | After Hardening | Audit complete, findings documented | — | No (warnings only) | Engineer documents findings |
| **DOCUMENTATION_COMPLETE** | After Documentation | Docs updated (or confirmed no update needed) | — | No | Documentation Engine confirms |
| **RELEASE_APPROVED** | After Release Recommendation | Ready for target environment | Blocked | **Yes** | Product Owner + Architecture Board |

## Gate Behavior

- **PASS**: Pipeline continues to next phase
- **FAIL (Blocking)**: Pipeline STOPS. Resolution required before retry.
- **FAIL (Non-Blocking)**: Pipeline continues with notation. Findings documented.

## Escalation Path

```
Gate Failed
    │
    ├── Engineer resolves (simple fix) → re-submit
    ├── Engineering Lead resolves (design issue) → re-submit
    └── Architecture Board resolves (architecture conflict) → may require ADR
```

## Rollback

If a gate fails after previous gates passed, the pipeline does NOT roll back. Completed phases remain complete. Only the failed phase is re-executed after resolution.
