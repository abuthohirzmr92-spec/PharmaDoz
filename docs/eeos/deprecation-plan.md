# EEOS Deprecation Plan v1.0

> **Status**: 🔒 APPROVED
> **Last Updated**: 2026-07-01

---

## Active Deprecations

| Component | Status | Replacement | Deprecation Date | Removal Target |
|-----------|--------|-------------|-----------------|----------------|
| `src/lib/unit-helper.ts` | ⚠️ Deprecated | `@/lib/uuce` (UUCE) | 2026-07-01 | MEDISYNC v2.0 |
| `src/lib/unit-converter.ts` (old impl) | ⚠️ Deprecated (migrated) | `@/lib/uuce` (UUCE) | 2026-07-01 | MEDISYNC v2.0 |

## Migration Guide

### Before (deprecated)
```typescript
import { toBaseUnit, fromBaseUnit } from "@/lib/unit-converter";
const baseQty = toBaseUnit(5, "Dus", product.unitLevels);
```

### After (recommended)
```typescript
import { normalize, format } from "@/lib/uuce";
import { getTree } from "@/lib/uuce";

const tree = getTree(product.id, product.unitLevels, product.unit);
const baseQty = normalize(5, "Dus", tree);
```

## Removal Schedule

| Milestone | Date | Action |
|-----------|------|--------|
| M1 | 2026-07-01 | Deprecation notices added ✅ |
| M2 | 2026-09-01 | All internal callers migrated ✅ |
| M3 | 2026-12-01 | Remove from public documentation |
| M4 | MEDISYNC v2.0 | Remove deprecated files |

## Policy

1. Deprecated components remain functional until removal
2. No new code may use deprecated components
3. All replacements must be documented
4. Removal requires Architecture Board approval
