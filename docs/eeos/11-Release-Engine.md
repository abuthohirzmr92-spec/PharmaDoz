# EEOS v2.0 — Release Engine

## Responsibility

Determine release readiness and recommend next action.

## Release States

| State | Meaning |
|-------|---------|
| `DEV_COMPLETE` | Implementation done, not yet verified |
| `NEEDS_QA` | Requires manual QA review |
| `NEEDS_HARDENING` | Requires hardening audit |
| `READY_PREVIEW` | Ready for preview deployment |
| `READY_PRODUCTION` | Ready for production deployment |
| `BLOCKED` | Cannot proceed (architecture violation, test failure, risk) |

## Release Gates

| Gate | Requirement |
|------|-------------|
| TypeScript | 0 errors |
| Build | PASS |
| Tests | All PASS |
| Architecture | 0 violations |
| Hardening | Complete |
| Documentation | Updated |
| QA | Manual smoke test PASS |
| Regression | No regressions |

## Output

```json
{
  "status": "READY_PREVIEW",
  "gates_passed": ["TypeScript", "Build", "Tests", "Architecture", "Hardening"],
  "gates_remaining": ["QA"],
  "recommendation": "Deploy to preview for manual QA"
}
```
