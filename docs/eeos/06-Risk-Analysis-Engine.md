# EEOS v2.0 — Risk Analysis Engine

## Responsibility

Classify every engineering risk before implementation begins.

## Risk Classification

| Level | Criteria | Action |
|:-----:|----------|--------|
| **P0** | Crash, data loss, checkout failure, security breach | BLOCK — must resolve before implementation |
| **P1** | Broken feature, incorrect business logic, wrong display | WARNING — document, fix in same sprint |
| **P2** | Cosmetic issue, performance, non-critical | NOTE — can defer |
| **P3** | Enhancement, nice-to-have | NOTE — future sprint |

## Risk Categories

| Category | Examples |
|----------|----------|
| Regression | "Changing this type breaks 5 consumers" |
| Migration | "Migration must be idempotent and rollback-safe" |
| Performance | "Adding virtual scroll to 5,000-row table" |
| Breaking Change | "Removing a public API method" |
| Architecture | "New dependency direction violates Clean Architecture" |

## Risk Matrix

For each risk, produce: probability × impact → severity.

## Output

```json
{
  "risks": [
    {
      "id": "R1",
      "category": "Regression",
      "description": "CartItem type change breaks 3 consumers",
      "probability": "Medium",
      "impact": "High",
      "severity": "P1",
      "mitigation": "Dual-write pattern"
    }
  ],
  "blocked": false,
  "warnings": 1
}
```
