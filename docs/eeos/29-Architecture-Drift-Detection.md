# EEOS v2.3 — Architecture Drift Detection

## Purpose

Detect when implementation diverges from architecture. Drift is measured as the gap between Blueprint and implemented code.

## Drift Categories

| Drift Type | Detection | Severity |
|------------|-----------|:--------:|
| **Blueprint Updated Without ADR** | Blueprint timestamp > last ADR timestamp in same package | HIGH |
| **ADR Updated Without Blueprint** | ADR references Blueprint section that no longer exists | HIGH |
| **Business Rule Changed Without Documentation** | Source code behavior differs from documented business rule | CRITICAL |
| **Implementation Exceeds Architecture** | Feature exists in code but not in any Blueprint | MEDIUM |
| **Deprecated Document Still Referenced** | Active document references a deprecated file | LOW |
| **Architecture Package Divergence** | Two packages define conflicting patterns for the same concern | HIGH |
| **Missing Migration Documentation** | Implementation has migration scripts without architecture documentation | MEDIUM |
| **Stale ADR** | ADR marked ACCEPTED but referenced Blueprint section is DEPRECATED | LOW |

## Drift Detection Rules

```
1. Compare: Architecture Blueprint ↔ Source Code
   → Feature in code but not in Blueprint → MEDIUM drift

2. Compare: ADR ↔ Blueprint
   → ADR references Blueprint section that changed → HIGH drift

3. Compare: Business Rule Doc ↔ Implementation
   → Implementation differs from documented rule → CRITICAL drift

4. Compare: Cross-References
   → Reference to deleted/deprecated file → LOW drift
```

## Drift Severity Matrix

| Severity | Action |
|:--------:|--------|
| **CRITICAL** | Block all implementation until resolved. Architecture Board review mandatory. |
| **HIGH** | Warning. Must be resolved within current sprint. |
| **MEDIUM** | Note. Resolve within current Epic. |
| **LOW** | Note. Resolve when the referencing document is next updated. |

## Drift Prevention

- Blueprint updates require Architecture Board approval
- ADR updates reference specific Blueprint sections
- Implementation cannot begin before Blueprint APPROVED
- Post-implementation drift check at sprint closure
