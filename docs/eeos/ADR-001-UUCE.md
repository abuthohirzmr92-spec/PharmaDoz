# ADR-001-UUCE: Base Unit as Single Source of Truth

| Field | Value |
|-------|-------|
| **ADR ID** | ADR-001-UUCE |
| **Status** | approved |
| **Date** | 2026-07-03 |
| **Decision Type** | standard |
| **Domain** | Cross-cutting (all modules) |

---

## Context

MEDISYNC must support multiple units of measure: Karton → Box → Pack → Strip → Tablet. Suppliers deliver in large units (Dus/Karton), cashiers sell in smaller units (Strip/Tablet), and inventory must have a consistent canonical unit for stock counting, FEFO allocation, and HPP calculation.

Two architectures were evaluated:

**Option A**: Database stores Display Unit
**Option B**: Database stores Base Unit (canonical)

---

## Decision

**Option B — Database stores Base Unit.**

All persistent quantities (purchase_items, product_batches, transaction_items, stock_movements, sale_batch_allocations) store quantities in the product's base unit (e.g., "Tablet", "mL", "Gram"). Display units are computed at runtime via UUCE.

---

## Alternatives Considered

| | Option A (Display Unit) | Option B (Base Unit) |
|---|---|---|
| Multi-unit FEFO | Cannot compare across units | ✅ All batches in same unit |
| HPP calculation | Must convert before summing | ✅ Direct arithmetic |
| Stock equation | Mix of units — not summable | ✅ All in base unit |
| Reporting | Must normalize all queries | ✅ Direct SUM |
| New module onboarding | Must handle unit conversion | ✅ No unit logic needed |
| Adopted | — | ✅ |

---

## Consequences

### Easier
- FEFO: no unit awareness needed
- HPP: direct arithmetic
- Reports: direct SUM queries
- Stock integrity: `Σ movements = batch.quantity`
- New modules: no unit logic

### Harder
- Display requires runtime formatting via UUCE
- Batch quantities are not human-readable without conversion
- Existing non-base-unit data would need migration (not applicable — MEDISYNC was built on base unit from day one)

---

## Compliance Verification

- [x] All database quantities are base unit
- [x] FEFO operates in base unit only
- [x] HPP uses base unit quantities
- [x] Reports read base unit
- [x] No display unit stored in database
- [x] UUCE is single conversion engine

---

## Related

- ADR-002 (UUCE): UnitTree as Conversion Model
- ADR-003 (UUCE): Integer Quantities for Solids
- ADR-006 (UUCE): Quantity Only (no pricing)
- ENGINE_LOCK.md
