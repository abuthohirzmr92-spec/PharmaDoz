# UUCE Engine Lock Document

> **Engine**: Universal Unit Conversion Engine (UUCE)
> **Version**: v1.0
> **Status**: 🔒 LOCKED
> **Architecture Owner**: EEOS Architecture Board
> **Effective**: 2026-07-03

---

## Single Source of Truth

```
product_batches.quantity
```

All inventory quantities derive from this field. It is stored in **Base Unit** (canonical unit).

---

## Invariants (Non-Negotiable)

| # | Invariant |
|---|-----------|
| 1 | Database ONLY stores Base Unit quantities |
| 2 | Display Unit MUST NOT be stored persistently |
| 3 | ALL unit conversion MUST go through UUCE |
| 4 | No module may perform conversion arithmetic outside UUCE |
| 5 | FEFO receives and returns Base Unit only |
| 6 | HPP calculates from Base Unit quantities and per-Base-Unit prices |

---

## Prohibitions

```
❌ Creating new conversion helpers outside UUCE
❌ Conversion logic in UI components
❌ Conversion logic in Repository layer
❌ Conversion logic in Report queries
❌ Conversion logic in Dashboard widgets
❌ Direct mutation of display unit into database
❌ Skipping UUCE for "simple" conversions
❌ Modifying UUCE public API without ADR
```

---

## Permission Matrix

| Action | Authority |
|--------|-----------|
| Use UUCE public API | All modules |
| Register new strategy | Architecture Board |
| Modify public API (9 methods) | Architecture Board + ADR |
| Modify internal API (15 methods) | Architecture Board |
| Add new unit kind | Architecture Board |
| Change Base Unit SSOT | NOT ALLOWED |
| Deprecate UUCE | NOT ALLOWED |

---

## Public API (Frozen)

| # | Function | Signature |
|---|----------|-----------|
| 1 | `normalize` | `(qty, unitName, tree) → canonicalQty` |
| 2 | `format` | `(canonicalQty, unitName, tree, mode?) → ConvertResult` |
| 3 | `convert` | `(qty, fromUnit, toUnit, tree, mode?) → ConvertResult` |
| 4 | `breakdown` | `(canonicalQty, tree) → UnitBreakdown[]` |
| 5 | `compare` | `(qtyA, unitA, qtyB, unitB, tree) → CompareResult` |
| 6 | `sum` | `(items[], tree) → canonicalTotal` |
| 7 | `snapshot` | `(tree, unitName, snapshotId) → ConversionSnapshot` |
| 8 | `restore` | `(qty, unitName, snap) → { canonicalQty, treeChanged }` |
| 9 | `validate` | `(tree) → TreeValidationResult` |

---

## Governance

All changes to UUCE require:
1. Architecture Decision Record (ADR)
2. Architecture Board approval (≥4 of 6 members)
3. Impact assessment: Purchase, Sales, Inventory, FEFO, HPP, Reports, Dashboard
4. Regression test plan

---

## Certification

```
🔒 EEOS Certified Business Core Engine — Level 2
   Tests: 48/48 PASS
   ADRs: ADR-001 through ADR-009
   API: 9 public, 15 internal
   Architecture: Domain-agnostic, pure functions
```
