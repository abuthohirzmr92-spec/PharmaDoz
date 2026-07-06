# =================================================================
# MEDISYNC ENTERPRISE SAAS
# SALES UNIT BASELINE AUDIT
# =================================================================
#
# ╔══════════════════════════════════════════════════════════════╗
# ║        SALES UNIT BASELINE AUDIT — OFFICIAL                 ║
# ╚══════════════════════════════════════════════════════════════╝
#
# Type             : Business Rule Audit
# Trigger          : Strength Unit leak in inventory display
# Blueprint Ref    : V10.1 (LOCKED)
# Related ADR      : ADR-006 (Sales Unit Policy — PROPOSED)
# Status           : COMPLETE
# Date             : 2026-07-05
#
# Author           : Architecture Board
# =================================================================

---

# 1. EXECUTIVE SUMMARY

Audit menemukan **satu root cause** yang menyebabkan strength unit (mg, mL, gram) muncul sebagai display unit di inventory:

**`src/lib/inventory-demo.ts:905`** — regex fallback yang mencakup `mL|Gram|mg` sebagai kandidat unit.

Semua modul downstream (inventory display, product table, purchasing panel) membaca `product.unit` dari `InventoryProduct` — sehingga semuanya mewarisi unit yang salah.

**Dampak**: Display-only. FEFO, pricing, dan stock engine tidak terpengaruh.

**Perbaikan**: Single-point fix di `buildInventoryProducts()`. Tidak memerlukan DB migration.

---

# 2. ROOT CAUSE ANALYSIS

## 2.1 The Single Root Cause

```
File  : src/lib/inventory-demo.ts
Line  : 905
Code  : const unit = catalogUnit ||
        first?.productName?.match(
          /(Tablet|Kapsul|Botol|Ampul|Sachet|Strip|Dus|mL|Gram|mg|Inhaler|Pcs)/i
        )?.[0] || "Pcs";
```

## 2.2 Why It Fails

```
Product: Aciclovir 400 mg
  → productName.match(...) → first match is "mg" (appears in name BEFORE "Tablet")
  → inventory displays: "MG" ❌

Product: Minyak Kayu Putih 60 mL
  → productName.match(...) → first match is "mL" (appears in name BEFORE "Botol")
  → inventory displays: "ML" ❌

Product: Paracetamol 500mg
  → productName.match(...) → "Tablet" is NOT in the name → "mg" matches
  → BUT: unitLevels = [{ level: 2, unitName: "Strip", contains: 10 }]
  → catalogUnit is EMPTY (demo mode) → falls back to regex → "mg" ❌
```

## 2.3 The Pattern

```
catalogUnit (from DB)
    │
    ├── EXISTS → use it ✅
    │
    └── EMPTY (demo / missing data) → regex fallback ❌
        │
        └── /Tablet|Kapsul|Botol|Ampul|Sachet|Strip|Dus|mL|Gram|mg|Inhaler|Pcs/i
            │
            ├── "Aciclovir 400 mg" → "mg" (strength, not sales unit)
            ├── "Minyak Kayu Putih 60 mL" → "mL" (volume, not sales unit)
            └── "Paracetamol 500mg" → "mg" (strength, not sales unit)
```

## 2.4 Strength Units in the Regex

| Regex Token | Type | Should Be in Unit Regex? |
|-------------|------|:------------------------:|
| `mL` | Volume | ❌ NO |
| `Gram` | Mass | ❌ NO |
| `mg` | Mass (strength) | ❌ NO |
| `Tablet` | Solid dosage | ✅ YES |
| `Kapsul` | Solid dosage | ✅ YES |
| `Botol` | Container | ✅ YES |
| `Strip` | Packaging | ✅ YES |
| `Dus` | Packaging | ✅ YES |
| `Ampul` | Container | ✅ YES |
| `Sachet` | Packaging | ✅ YES |
| `Inhaler` | Device | ✅ YES |
| `Pcs` | Generic | ⚠️ Last resort only |

---

# 3. BUSINESS RULE DEFINITION

## 3.1 Official Rule

```
┌─────────────────────────────────────────────────────────────┐
│              SALES UNIT BUSINESS RULE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  RULE 1: Master Product adalah SOURCE OF TRUTH              │
│    Product catalog (products.unit) mendefinisikan           │
│    Sales Base Unit. Ini adalah DEFINISI BISNIS.             │
│                                                              │
│  RULE 2: UnitLevels mendefinisikan Sales Multi Unit         │
│    unitLevels[0] (Level 2) = Sales Middle Unit              │
│    unitLevels[1] (Level 3) = Sales Large Unit              │
│                                                              │
│  RULE 3: Strength Unit BUKAN Sales Unit                     │
│    mg, mcg, g, IU, %, mL adalah informasi medis.            │
│    Tidak boleh digunakan sebagai display unit.              │
│                                                              │
│  RULE 4: Regex fallback TIDAK BOLEH mengandung              │
│    strength/volume unit.                                    │
│    Jika product catalog tidak memiliki unit,                │
│    fallback HARUS safe (hanya solid/container/packaging).   │
│                                                              │
│  RULE 5: Inventory menampilkan SALES UNIT                   │
│    Bukan base unit untuk engine.                            │
│    Sales unit = apa yang dibeli customer.                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 3.2 Unit Taxonomy

```
STRENGTH UNIT (medical info — NEVER display unit)
  mg, mcg, g, IU, %, mL
  Purpose: dosage/strength on label
  Example: "Aciclovir 400 mg" → "400 mg" is strength

BASE UNIT (engine — FEFO, stock calculation)
  Tablet, Kapsul, mL (curah)
  Purpose: smallest indivisible unit for stock counting
  Example: "Tablet" — one tablet cannot be split

SALES UNIT (customer-facing — INVENTORY DISPLAY)
  Strip, Botol, Dus, Inhaler, Pcs
  Purpose: how product is sold to customer
  Example: Customer buys "1 Strip" (10 tablets), not "10 Tablet"

DISPLAY UNIT (cashier — user-selected at transaction time)
  Selected from unitLevels by cashier
  Purpose: flexible unit selection per transaction
  Example: Cashier selects "Dus" → 1 Dus = 200 Tablet
```

---

# 4. CURRENT ARCHITECTURE

## 4.1 Unit Resolution Flow

```
Product Catalog (products.unit, products.unitLevels)
    │
    ▼
buildInventoryProducts() [inventory-demo.ts:874-929]
    │
    ├── catalogUnit = productCatalog?.get(productId)?.unit  ← DATABASE
    │
    ├── IF catalogUnit EXISTS → unit = catalogUnit ✅
    │
    └── ELSE → regex from productName ❌ ← ROOT CAUSE
        │   /Tablet|Kapsul|Botol|Ampul|Sachet|Strip|Dus|mL|Gram|mg|Inhaler|Pcs/i
        │
        ▼
    InventoryProduct.unit
        │
        ├──► Inventory Stock Table    (displays product.unit)
        ├──► Product Table            (displays product.unit)
        ├──► Purchase Panel           (reads product.unit + unitLevels)
        ├──► Stock Opname             (reads product.unit)
        └──► Reports                  (reads product.unit)
```

## 4.2 Single Point of Failure

```
ONE regex. ONE line. ONE file.

src/lib/inventory-demo.ts:905

All 8 downstream modules inherit from this single point.
Fix here → fix everywhere.
```

---

# 5. SOURCE OF TRUTH ANALYSIS

| Data Source | Field | Purpose | Status |
|-------------|-------|---------|:------:|
| `products.unit` (DB) | Base unit | Stock counting, FEFO | ✅ Correct |
| `products.unitLevels` (DB) | Multi-unit levels | Display conversion | ✅ Correct |
| `InventoryProduct.unit` | Derived unit | Display | ⚠️ Regex fallback when DB empty |
| `DemoProduct.unit` | Hardcoded | Cashier catalog | ✅ Correct (hardcoded per product) |
| `CartItem.selectedUnitCode` | User-selected | Transaction display | ✅ Correct |
| `resolveUnitDisplay()` | Computed | Display resolution | ✅ Correct |

---

# 6. MODULE IMPACT MATRIX

| # | Module | File(s) | How Unit Obtained | Regex? | Risk |
|---|--------|---------|-------------------|:------:|:----:|
| 1 | **Product Master** | `product-table.tsx` | `product.unit` from InventoryProduct | ⚠️ Indirect | Displays wrong unit |
| 2 | **Inventory** | `inventory-stock-table.tsx` | `product.unit` from InventoryProduct | ⚠️ Indirect | Displays wrong unit |
| 3 | **Cashier** | `use-demo-cashier.ts`, `resolve-unit-display.ts` | `product.unit` + `unitLevels` from DemoProduct | ✅ None | Uses correct unit from hardcoded catalog |
| 4 | **Purchasing** | `inventory-purchase-panel.tsx` | `product.unit` + `unitLevels` | ⚠️ Indirect | Unit conversion correct; display inherits |
| 5 | **Sales** | `page.tsx` (cart display) | `resolveUnitDisplay()` | ✅ None | Uses UnitLevel system correctly |
| 6 | **Reports** | Various report components | `product.unit` from InventoryProduct | ⚠️ Indirect | Report labels may show wrong unit |
| 7 | **FEFO Display** | `inventory-demo.ts` (FEFO functions) | Base unit (Tablet, Kapsul) | ✅ None | FEFO works in base unit — correct |
| 8 | **Barcode** | Not directly affected | — | ✅ None | Barcode uses productId, not unit |
| 9 | **Stock Opname** | `inventory-opname-form-modal.tsx` | `product.unit` + `unitLevels` | ⚠️ Indirect | Counting in base unit; display inherits |
| 10 | **Export/Import** | `product-import-modal.tsx` | `row.baseUnit` from import | ✅ None | Import sets unit explicitly |

## Summary

| Status | Count | Modules |
|--------|:-----:|---------|
| ✅ Correct — no regex impact | 4 | Cashier, Sales, FEFO, Barcode, Import |
| ⚠️ Indirect — inherits from InventoryProduct | 5 | Product Master, Inventory, Purchasing, Reports, Opname |
| ❌ Direct — root cause | 1 | `buildInventoryProducts()` in `inventory-demo.ts` |

---

# 7. RISK ASSESSMENT

| # | Risk | Level | Impact |
|---|------|:-----:|--------|
| R1 | Inventory displays "MG"/"ML" instead of "Strip"/"Botol" | LOW | Confusing but not financially impactful |
| R2 | Reports show wrong unit labels | LOW | Report accuracy unaffected (quantities correct) |
| R3 | Purchasing panel shows wrong unit in dropdown | LOW | Quantities correct; display label wrong |
| R4 | Fix breaks existing assumptions about `product.unit` | LOW | Fix is replacement, not removal |
| R5 | ADR-006 scope creep into full refactor | LOW | Fix is single-line; resist over-engineering |

---

# 8. REQUIRED CORRECTIONS

## 8.1 Primary Fix (Single Line)

```
FILE: src/lib/inventory-demo.ts
LINE: 905

CURRENT:
  const unit = catalogUnit || first?.productName?.match(
    /(Tablet|Kapsul|Botol|Ampul|Sachet|Strip|Dus|mL|Gram|mg|Inhaler|Pcs)/i
  )?.[0] || "Pcs";

CORRECTED:
  const unit = catalogUnit || first?.productName?.match(
    /(Tablet|Kapsul|Botol|Ampul|Sachet|Strip|Dus|Inhaler|Pcs)/i
  )?.[0] || "Pcs";

REMOVED: mL, Gram, mg
```

## 8.2 Secondary Enhancement (Derive Sales Unit)

```
After primary fix, additionally derive a display-friendly unit:

  // Derive sales unit from unitLevels if available
  const levels = productCatalog?.get(productId)?.unitLevels ?? [];
  const salesUnit = levels.length > 0
    ? levels[0]!.unitName   // Level 2 = smallest sales packaging
    : unit;                  // Fall back to base unit

Benefits:
  ▸ Amoxicillin with unitLevels [Strip, Dus] → displays "Strip"
  ▸ Products without unitLevels → displays base unit (e.g., "Tablet")
  ▸ Engines still use base unit for FEFO/stock calculation
```

## 8.3 Files Requiring Change

| File | Change | Impact |
|------|--------|:------:|
| `src/lib/inventory-demo.ts` | Fix regex (line 905) | Root cause |
| `src/lib/inventory-demo.ts` | Add salesUnit derivation | Enhancement |
| `src/types/inventory.ts` | Optional: add `salesUnit?: string` | Future-proof |
| `src/components/inventory/inventory-stock-table.tsx` | Use salesUnit for display | Display fix |

---

# 9. OUT OF SCOPE

| Item | Reason |
|------|--------|
| DB schema changes | Not required — fix is code-only |
| UI redesign | Not required — same components, corrected text |
| FEFO engine changes | FEFO correctly uses base unit |
| Pricing engine changes | Pricing correctly uses base unit price |
| Cashier changes | Cashier already uses UnitLevel system |
| Full ADR-006 implementation | This audit focuses on the regex root cause only |

---

# 10. RECOMMENDATION

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   SALES UNIT BASELINE CORRECTION                             ║
║                                                              ║
║   Recommendation: APPROVE AS MINI-SPRINT                     ║
║                                                              ║
║   Scope:                                                     ║
║   ▸ Fix regex in buildInventoryProducts() (line 905)        ║
║     Remove: mL, Gram, mg                                    ║
║   ▸ Add salesUnit derivation from unitLevels                 ║
║   ▸ Update inventory display to use salesUnit               ║
║                                                              ║
║   Impact:                                                    ║
║   ▸ Architecture:  NONE                                      ║
║   ▸ Database:      NONE                                      ║
║   ▸ Business Rule: CLARIFIED (not changed)                   ║
║   ▸ UI:            CORRECTED (text labels only)              ║
║   ▸ FEFO:          NONE                                      ║
║   ▸ Pricing:       NONE                                      ║
║                                                              ║
║   Files: 2-3                                                 ║
║   Effort: ~1 hour                                            ║
║   Risk:   LOW (display-only change)                          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

# 11. PROPOSED ENGINEERING PLAN (MINI-SPRINT)

## Story: Sales Unit Baseline Correction

### Task 1 — Fix Regex Root Cause
- File: `src/lib/inventory-demo.ts` (line 905)
- Remove `mL|Gram|mg` from regex
- Estimated: 10 minutes

### Task 2 — Add Sales Unit Derivation
- File: `src/lib/inventory-demo.ts`
- Derive `salesUnit` from `unitLevels` where available
- Add `salesUnit` to `InventoryProduct` type (optional field)
- Estimated: 20 minutes

### Task 3 — Update Inventory Display
- Files: `inventory-stock-table.tsx`, `product-table.tsx`
- Use `salesUnit ?? unit` for display
- Estimated: 15 minutes

### Task 4 — Validation
- Verify: "Aciclovir 400 mg" → displays "Strip" (not "MG")
- Verify: "Minyak Kayu Putih 60 mL" → displays "Botol" (not "ML")
- Verify: All existing tests PASS
- Estimated: 15 minutes

---

**END OF SALES UNIT BASELINE AUDIT**

**Document Location:** `docs/architecture/Sales-Unit-Baseline-Audit.md`

**ADR-006 Status: Supported by this audit. Ready for Architecture Board decision.**
