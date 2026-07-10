# ACE v1.0 — Violation Model

## Violation Levels

| Level | Meaning | Example | Required Action | Certification Impact |
|:-----:|---------|---------|----------------|:-------------------:|
| **INFO** | Informational note | "ADR-006 is still PROPOSED" | None | None |
| **WARNING** | Should address | "Document has no cross-references" | Fix when convenient | None |
| **MINOR** | Must fix this sprint | "Missing contract field" | Fix before sprint closure | Blocks Verified |
| **MAJOR** | Must fix before merge | "Architecture violation found" | Fix before merge | Blocks Certified |
| **CRITICAL** | Blocks all progress | "Constitution violation" | Fix immediately | Blocks all badges |
| **BLOCKING** | Pipeline stops | "Missing required ADR" | Resolve before continue | Blocks everything |

## Violation Record

```json
{
  "violationId": "viol-001",
  "ruleId": "architecture/constitution-compliance@1.0.0",
  "severity": "CRITICAL",
  "category": "Architecture",
  "description": "Implementation imports React in domain layer",
  "evidence": ["src/lib/pricing-engine.ts:3"],
  "recommendation": "Remove React import from domain layer",
  "detectedAt": "2026-07-10T00:00:00Z"
}
```
