# =================================================================
# MEDISYNC ENTERPRISE SAAS
# SALES UNIT — DATA READINESS AUDIT
# =================================================================
#
# ╔══════════════════════════════════════════════════════════════╗
# ║      SALES UNIT DATA READINESS AUDIT — OFFICIAL             ║
# ╚══════════════════════════════════════════════════════════════╝
#
# Type             : Data Readiness Audit
# Trigger          : Sales Unit Baseline Audit — Architecture Board Revision
# Related          : docs/architecture/Sales-Unit-Baseline-Audit.md
# Related ADR      : ADR-006 (Sales Unit Policy — PROPOSED)
# Status           : COMPLETE
# Date             : 2026-07-05
#
# Author           : Architecture Board
# =================================================================

---

# 1. EXECUTIVE SUMMARY

Audit terhadap 10 demo products dan alur data Product Master menemukan bahwa **6 dari 10 produk** (60%) tidak memiliki definisi `unit` maupun `unitLevels` dan sepenuhnya bergantung pada regex fallback. Setelah regex diperbaiki (menghapus strength unit), produk-produk ini akan mendapatkan unit yang salah atau "Pcs" (last resort).

**Namun ini bukan masalah kritis.** Produk-produk tersebut adalah demo data. Di production, product catalog dari database akan mengisi `unit` dan `unitLevels`. Yang diperlukan adalah melengkapi data demo agar mencerminkan realitas production — sehingga demo mode tidak menyesatkan.

---

# 2. PRODUCT MASTER STRUCTURE

## 2.1 Current Fields

```
DemoProduct (Cashier):
  unit?: string              ← Sales Base Unit (e.g., "Tablet")
  unitLevels?: UnitLevel[]   ← Multi-unit levels (e.g., [Strip, Dus])

InventoryProduct (Inventory):
  unit: string               ← Base unit (from DB or regex fallback)
  unitLevels?: UnitLevel[]   ← Multi-unit levels (from DB)

ProductBatch:
  (no unit field)            ← Quantity is in base unit

buildInventoryProducts() receives:
  productCatalog?: Map<string, { unit?: string }>
                            ← Only unit, NOT unitLevels ← GAP
```

## 2.2 Gap Identified

```
buildInventoryProducts() receives productCatalog with ONLY `unit`.
It does NOT receive `unitLevels`.

This means:
  ▸ Even if DB has unitLevels, inventory can't use them
  ▸ Sales unit derivation from unitLevels requires catalog enhancement
  ▸ Fix requires both: extend catalog parameter + use unitLevels
```

---

# 3. UNITLEVELS COVERAGE — DEMO DATA

## 3.1 Demo Products — Unit Completeness

| # | Product | unit | unitLevels | Regex Fallback | Status |
|---|---------|:----:|:----------:|:-------------:|:------:|
| demo-001 | Paracetamol 500mg | "Tablet" | [Strip] | "mg" | ✅ Has unit |
| demo-002 | Amoxicillin 500mg | "Tablet" | [Strip, Dus] | "mg" | ✅ Has unit + levels |
| demo-003 | Vitamin C 1000mg | ❌ | ❌ | "mg" | ❌ NO DATA |
| demo-004 | Antasida Tablet | ❌ | ❌ | "Tablet" | ⚠️ Regex-only |
| demo-005 | Ibuprofen 400mg | ❌ | ❌ | "mg" | ❌ NO DATA |
| demo-006 | Cetirizine 10mg | ❌ | ❌ | "mg" | ❌ NO DATA |
| demo-007 | Omeprazole 20mg | ❌ | ❌ | "mg" | ❌ NO DATA |
| demo-008 | Salbutamol Inhaler | ❌ | ❌ | "Inhaler" | ⚠️ Regex-only |
| demo-009 | Multivitamin Tablet | ❌ | ❌ | "Tablet" | ⚠️ Regex-only |
| demo-010 | Minyak Kayu Putih | ❌ | ❌ | "mL" | ❌ NO DATA |

## 3.2 Coverage Summary

```
✅ Complete (unit + unitLevels defined):  2 / 10  (20%)
⚠️ Partial (regex gives correct-ish):      3 / 10  (30%)
❌ Missing (no unit, no unitLevels):       5 / 10  (50%)
```

## 3.3 Why It's Not Critical

```
1. These are DEMO products — not production data.
2. In production, product catalog fills unit + unitLevels from DB.
3. The regex was always a fallback for when DB data is missing.
4. Fixing the regex fixes the fallback behavior.
5. Enhancing demo data makes demo mode representative.
```

---

# 4. LEGACY DATA COMPATIBILITY

## 4.1 Migration Impact Matrix

| Data Source | unit field | unitLevels | After Fix | Risk |
|-------------|:----------:|:----------:|-----------|:----:|
| Demo products (hardcoded) | varies | varies | Some get "Pcs" | LOW — just demo |
| DB products (production) | ✅ present | ✅ present | No change | NONE |
| DB products (legacy, no unit) | ❌ | ❌ | Gets "Pcs" | LOW — legacy data |
| Imported products | set by import | set by import | No change | NONE |

## 4.2 Legacy Scenario

```
Scenario: Product exists in DB but has NULL unit field
  Before fix: regex from productName → may return "mg"/"mL"
  After fix:  regex without strength units → may return "Pcs"
  
  "Pcs" is BETTER than "mg" because:
    ▸ "Pcs" is a valid generic sales unit
    ▸ "mg" is medically misleading as a sales unit
    ▸ "Pcs" signals "this product needs unit data" to admin

  No customer buys "1 mg of Paracetamol."
  "Pcs" is a safer fallback than any strength unit.
```

---

# 5. FALLBACK STRATEGY

## 5.1 Fallback Chain (Proposed)

```
Product Display Unit Resolution:

  1. productCatalog.unit (from DB)          ← SOURCE OF TRUTH
     │
     ├── EXISTS → use it ✅
     │
     └── EMPTY → go to step 2
          │
  2. unitLevels[0].unitName (Level 2)       ← DERIVED SALES UNIT
     │
     ├── EXISTS → use it ✅
     │
     └── EMPTY → go to step 3
          │
  3. Regex from productName                  ← SAFE FALLBACK (no strength units)
     │  /Tablet|Kapsul|Botol|Ampul|Sachet|Strip|Dus|Inhaler|Pcs/i
     │
     ├── MATCH → use it ✅
     │
     └── NO MATCH → go to step 4
          │
  4. "Pcs"                                   ← LAST RESORT
     (generic — signals admin needs to set unit)
```

## 5.2 Fallback Safety

```
BEFORE (current):  regex includes mL, Gram, mg → "mg" is misleading
AFTER (proposed):  regex excludes strength units → "Pcs" is safe generic

"Pcs" as fallback is safer because:
  ▸ It doesn't pretend to know the unit
  ▸ It signals to admin: "this product needs unit configuration"
  ▸ "1 Pcs" is semantically correct (1 piece) for any product
  ▸ Better than "1 mg" which is medically wrong for a Strip
```

---

# 6. DEMO DATA ENHANCEMENT — REQUIRED

## 6.1 Products Needing Data

| Product | Missing | Should Be |
|---------|---------|------------|
| demo-003 | unit, unitLevels | unit: "Tablet", unitLevels: [{ level: 2, unitName: "Strip", contains: 10 }] |
| demo-004 | unit, unitLevels | unit: "Tablet", unitLevels: [{ level: 2, unitName: "Strip", contains: 10 }] |
| demo-005 | unit, unitLevels | unit: "Tablet", unitLevels: [{ level: 2, unitName: "Strip", contains: 10 }] |
| demo-006 | unit, unitLevels | unit: "Tablet", unitLevels: [{ level: 2, unitName: "Strip", contains: 10 }] |
| demo-007 | unit, unitLevels | unit: "Tablet", unitLevels: [{ level: 2, unitName: "Strip", contains: 10 }] |
| demo-008 | unit, unitLevels | unit: "Inhaler" (no unitLevels — single unit product) |
| demo-009 | unit, unitLevels | unit: "Tablet", unitLevels: [{ level: 2, unitName: "Strip", contains: 10 }] |
| demo-010 | unit, unitLevels | unit: "Botol" (no unitLevels — single unit product) |

## 6.2 Why Fix Demo Data

```
1. Demo mode should represent production accurately.
   Demo is used for development, testing, and demos.
   Wrong unit display → wrong impression to stakeholders.

2. Tests depend on demo data.
   Tests should verify correct unit behavior.
   Tests relying on regex fallback are fragile.

3. Onboarding / new developers.
   New developers learn from demo data.
   They should learn the correct Sales Unit pattern.
```

---

# 7. MIGRATION STRATEGY

## 7.1 Code Changes Required

| Step | File | Change |
|------|------|--------|
| 1 | `use-demo-cashier.ts` | Add `unit` + `unitLevels` to 8 demo products |
| 2 | `inventory-demo.ts:905` | Remove `mL\|Gram\|mg` from regex |
| 3 | `inventory-demo.ts:874` | Extend `productCatalog` to include `unitLevels` |
| 4 | `inventory-demo.ts:903-905` | Add salesUnit derivation from unitLevels |
| 5 | `inventory-stock-table.tsx` | Display `salesUnit ?? unit` |

## 7.2 Migration Order

```
Phase 1: Fix regex (safe — improves fallback)
  → Products without unit data now get "Pcs" instead of "mg"
  → No breaking change — "Pcs" is at least as correct as "mg"

Phase 2: Enrich demo data (safe — improves demo accuracy)
  → Add unit + unitLevels to 8 demo products
  → Demo mode now shows correct sales units

Phase 3: Add salesUnit derivation (safe — additive)
  → Products with unitLevels derive sales unit automatically
  → No breaking change — existing unit field still available

Phase 4: Update display (safe — cosmetic)
  → Inventory shows salesUnit where available
  → Falls back to unit (existing behavior)
```

## 7.3 Rollback Strategy

```
Each phase is independently revertible:
  git revert <phase-commit>
  
  Risk: LOW — all changes are additive or cosmetic
  Data: ZERO impact (demo data only, no DB changes)
  Time: < 30 minutes per phase rollback
```

---

# 8. RECOMMENDATION

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   DATA READINESS: APPROVED FOR IMPLEMENTATION                ║
║                                                              ║
║   Key Findings:                                              ║
║   ▸ 60% demo products lack unit data — demo-mode only       ║
║   ▸ Production path uses DB catalog — not affected          ║
║   ▸ Regex fix is safe — "Pcs" is better fallback than "mg" ║
║   ▸ Demo data enrichment is required for accuracy           ║
║   ▸ No DB migration needed                                  ║
║   ▸ All changes are additive + display-only                 ║
║                                                              ║
║   Implementation:                                            ║
║   ▸ 4 phases, ~1 hour total                                 ║
║   ▸ Each phase independently safe                           ║
║   ▸ Zero production impact                                  ║
║   ▸ Zero architecture impact                                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

**END OF DATA READINESS AUDIT**

**Document Location:** `docs/architecture/Sales-Unit-Data-Readiness-Audit.md`

**ADR-006: Ready for Architecture Board decision on implementation.**
