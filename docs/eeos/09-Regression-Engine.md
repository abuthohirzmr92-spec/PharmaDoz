# EEOS v2.0 — Regression Engine

## Responsibility

Determine which modules require regression testing after a change.

## Regression Rules

| Changed Area | Regression Scope |
|-------------|-----------------|
| Type/interface | All consumers of that type |
| Domain service | All callers + integration tests |
| Store method | All components using that store |
| UI component | All pages rendering it |
| Repository | All services using that repository |
| Business rule | All modules implementing that rule |

## Regression Checklist

1. Run full test suite for affected module
2. Run integration tests for cross-module dependencies
3. Run architecture grep for invariant violations
4. Manual smoke test for critical flows
5. Verify no regression in:
   - FEFO allocation
   - Pricing calculation
   - Checkout flow
   - Report generation

## Output

```json
{
  "affected_modules": ["Inventory", "Reports"],
  "tests_to_run": ["inventory-store", "sales-table"],
  "smoke_tests": ["add product → checkout → receipt"],
  "architecture_checks": ["grep React in domain layer"]
}
```
