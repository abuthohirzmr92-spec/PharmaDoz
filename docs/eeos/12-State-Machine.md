# EEOS v2.0 — State Machine

## States

```
REQUEST ──────────► DISCOVERY ──────────► ARCHITECTURE_REVIEW
                                                 │
                                                 ▼
                                            RISK_ANALYSIS
                                                 │
                                    ┌────────────┴────────────┐
                                    ▼                         ▼
                               BLOCKED                   PLANNING
                                                             │
                                                             ▼
                                                      IMPLEMENTATION
                                                             │
                                                             ▼
                                                        VERIFICATION
                                                             │
                                                             ▼
                                                         REGRESSION
                                                             │
                                                             ▼
                                                         HARDENING
                                                             │
                                                             ▼
                                                      DOCUMENTATION
                                                             │
                                                             ▼
                                                   RELEASE_RECOMMENDATION
                                                             │
                                             ┌───────────────┼───────────────┐
                                             ▼               ▼               ▼
                                        DEV_COMPLETE    READY_PREVIEW   READY_PRODUCTION
                                                             │               │
                                                             ▼               ▼
                                                        COMPLETED       COMPLETED
```

## Transitions

| From | To | Trigger |
|------|----|---------|
| REQUEST | DISCOVERY | Product Owner request received |
| DISCOVERY | ARCHITECTURE_REVIEW | Context + knowledge + dependency identified |
| ARCHITECTURE_REVIEW | RISK_ANALYSIS | All architecture checks passed |
| ARCHITECTURE_REVIEW | BLOCKED | Architecture violation found |
| RISK_ANALYSIS | PLANNING | No P0 risks |
| RISK_ANALYSIS | BLOCKED | P0 risk found, unmitigated |
| PLANNING | IMPLEMENTATION | Engineering Plan approved |
| IMPLEMENTATION | VERIFICATION | All story gates passed |
| VERIFICATION | REGRESSION | TS + build + tests green |
| REGRESSION | HARDENING | No regression failures |
| HARDENING | DOCUMENTATION | Audit complete |
| DOCUMENTATION | RELEASE_RECOMMENDATION | Docs updated |
| BLOCKED | DISCOVERY | Issue resolved, retry |

## Terminal States

- COMPLETED (via DEV_COMPLETE, READY_PREVIEW, or READY_PRODUCTION)
- BLOCKED (requires resolution before retry)
