# EEOS v2.0 — Dependency Discovery Engine

## Responsibility

Identify every file, store, service, and UI component affected by a change.

## Discovery Rules

| Change Type | Affected Areas |
|-------------|---------------|
| Type/interface change | All consumers of that type |
| Store method change | All components using that method |
| Repository change | All services using that repository |
| UI component change | All pages rendering that component |
| Business rule change | All modules implementing that rule |

## Dependency Graph

The engine produces a graph showing:

1. Direct dependencies (files that import the changed file)
2. Indirect dependencies (files that import direct dependents)
3. Test files that must be re-run
4. Documentation files that may need updates

## Output

```json
{
  "changed_files": ["src/lib/inventory-demo.ts"],
  "direct_dependents": ["inventory-stock-table.tsx", "inventory-store.ts"],
  "indirect_dependents": ["reports/sales-table.tsx"],
  "tests_to_run": ["allocation-builder.test.ts", "cashier-store.test.ts"],
  "docs_to_update": []
}
```
