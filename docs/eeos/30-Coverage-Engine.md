# EEOS v2.3 — Coverage Engine

## Purpose

Measure architecture completeness. Identify gaps before they become problems.

## Coverage Dimensions

| Dimension | What It Measures | Calculation |
|-----------|-----------------|-------------|
| **Blueprint Coverage** | % of Blueprint sections with corresponding implementation | `implemented_sections / total_sections × 100` |
| **ADR Coverage** | % of major decisions with ADR records | `adr_count / decision_points × 100` |
| **Business Rule Coverage** | % of business rules with documented source of truth | `documented_rules / total_rules × 100` |
| **Regression Coverage** | % of modules with regression test definitions | `modules_tested / total_modules × 100` |
| **Documentation Coverage** | % of architecture packages with complete docs | `complete_packages / total_packages × 100` |
| **Knowledge Coverage** | % of resolved bugs with KB entries | `documented_bugs / resolved_bugs × 100` |
| **Policy Coverage** | % of policies with enforcement rules | `enforced_policies / total_policies × 100` |
| **Engine Coverage** | % of engines with formal contracts | `contracted_engines / total_engines × 100` |

## Gap Identification

```
Coverage < 100% → GAP exists
    │
    ├── ≥ 90% → MINOR GAP (document, resolve when convenient)
    ├── 70–89% → MODERATE GAP (prioritize in next sprint)
    └── < 70% → MAJOR GAP (blocking for new Epics in this area)
```

## Output

```json
{
  "engine": "Coverage Engine",
  "dimensions": {
    "blueprint": { "covered": 18, "total": 18, "pct": 100 },
    "adr": { "covered": 15, "total": 18, "pct": 83 },
    "business_rule": { "covered": 6, "total": 8, "pct": 75 },
    "documentation": { "covered": 3, "total": 4, "pct": 75 }
  },
  "gaps": [
    { "dimension": "business_rule", "severity": "MODERATE", "missing": ["Sales Unit Policy implementation", "Return Policy"] }
  ]
}
```
