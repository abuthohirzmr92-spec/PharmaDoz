# =================================================================
# MEDISYNC ENTERPRISE SAAS
# ADR-006: Sales Unit Policy
# =================================================================
#
# Status           : PROPOSED — Awaiting Architecture Board Review
# Type             : Business Rule Audit
# Blueprint Ref    : V10.1 (LOCKED) — No blueprint change required
# Architecture Ver : v1.0 (ACTIVE)
# Author           : Business Analyst + Domain Architect
# Date             : 2026-07-05
# =================================================================

---

# 1. CURRENT BUSINESS RULE

## 1.1 Unit Terminology (Existing)

```
MEDISYNC currently recognizes:

  Level 3 — Satuan Besar         (e.g., "Dus" = 10 Strip)
      │
  Level 2 — Satuan Menengah      (e.g., "Strip" = 10 Tablet)
      │
  Level 1 — Base Unit             (e.g., "Tablet")

  Base Unit is defined as:
  "Satuan terkecil yang tidak dapat dipecah lagi.
   Digunakan untuk FEFO, stock calculation, dan konversi."
```

## 1.2 Where Units Are Defined

| Layer | Type | Field | Purpose |
|-------|------|-------|---------|
| Product Catalog | `InventoryProduct.unit` | `unit: string` | Base unit (Level 1) |
| Product Catalog | `InventoryProduct.unitLevels` | `UnitLevel[]` | Level 2 & 3 definitions |
| Product Batch | `ProductBatch.quantity` | `quantity: number` | Stock count in base unit |
| Cashier Display | `CartItem.selectedUnitCode` | `string` | Unit preference for display |
| UUCE Engine | `unit-converter.ts` | Converter | Base ↔ Display unit conversion |

## 1.3 Current Unit Resolution Flow

```
buildInventoryProducts() in inventory-demo.ts:
  
  1. Try: productCatalog.get(productId)?.unit     ← Database (preferred)
  2. Fallback: regex match from productName        ← ❌ PROBLEM
     /Tablet|Kapsul|Botol|Ampul|Sachet|Strip|Dus|mL|Gram|mg|Inhaler|Pcs/i
  3. Fallback: "Pcs"                               ← Last resort

  The regex matches STRENGTH UNIT before SALES UNIT:
    "Aciclovir 400 mg"  → "mg"   (strength unit, NOT sales unit)
    "Minyak Kayu Putih 60 mL" → "mL" (volume unit, NOT sales unit)
```

---

# 2. CURRENT PROBLEMS

## 2.1 Inventory Display

```
Product:          Aciclovir 400 mg
Displayed as:     "MG"            ← ❌ Wrong
Should show:      "Tablet" or "Strip"
Reason:           "mg" is dosage/strength, not a sellable unit.
                  Nobody sells "1 mg of Aciclovir."

Product:          Minyak Kayu Putih 60 mL
Displayed as:     "mL"            ← ❌ Wrong
Should show:      "Botol"
Reason:           "mL" is volume, not a sellable unit.
                  Customer buys "1 Botol", not "60 mL."
```

## 2.2 Root Cause Analysis

```
┌──────────────────────────────────────────────────────────────┐
│                    ROOT CAUSE CHAIN                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Product catalog unit field is EMPTY for demo products.   │
│     buildInventoryProducts() receives catalog but no unit.   │
│                                                               │
│  2. Regex fallback kicks in:                                 │
│     /Tablet|Kapsul|Botol|Ampul|Sachet|Strip|Dus|             │
│      mL|Gram|mg|Inhaler|Pcs/i                                │
│                                                               │
│  3. Regex matches BROADER PATTERN first:                     │
│     "Aciclovir 400 mg"  → "mg" matches BEFORE "Tablet"       │
│     (because "Tablet" is NOT in the product name)            │
│                                                               │
│  4. Inventory displays what it receives: "mg", "mL"          │
│                                                               │
│  5. User sees technically correct (base unit) but            │
│     BUSINESS-WRONG display (not sales unit).                 │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## 2.3 Affected Modules

| Module | Current Behavior | Issue |
|--------|-----------------|-------|
| **Inventory** | Displays `product.unit` (base unit) | Regex fallback produces "mg", "mL" |
| **Kasir** | Uses UnitLevel system — shows display unit | ✅ Correct — `resolveUnitDisplay()` works |
| **Pembelian** | Records batch in base unit qty | ✅ Correct — FEFO needs base unit |
| **Stock Engine** | Works in base unit | ✅ Correct |
| **FEFO** | Works in base unit | ✅ Correct |
| **Laporan** | Reads InventoryProduct.unit | Inherits base unit display issue |
| **Mutasi** | Stock movement in base unit | ✅ Correct |
| **Opname** | Quantities in base unit | ✅ Correct |

**Conclusion: The problem is DISPLAY-ONLY. Engine behavior is correct.**

---

# 3. BUSINESS ANALYSIS

## 3.1 Conceptual Distinction

```
┌─────────────────────────────────────────────────────────────┐
│          MEDISYNC UNIT TAXONOMY                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  BASE UNIT (internal)                                        │
│  ├── Definition: Smallest indivisible unit                  │
│  ├── Used by:    FEFO, stock calculation, conversion        │
│  ├── Display:    NOT intended for primary UI                 │
│  ├── Example:    "Tablet", "Kapsul", "mL (curah)"          │
│  └── Field:      InventoryProduct.unit                      │
│                                                              │
│  SALES UNIT (customer-facing)                                │
│  ├── Definition: How product is sold to customer             │
│  ├── Used by:    Inventory display, Cashier, Reports        │
│  ├── Display:    PRIMARY UI unit                             │
│  ├── Example:    "Strip", "Dus", "Botol"                    │
│  └── Field:      (needs definition)                          │
│                                                              │
│  KEY RULE:                                                   │
│  "Base unit is for engines. Sales unit is for humans."      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 3.2 When Base Unit IS the Sales Unit

```
For certain products, Base Unit = Sales Unit:
  - Obat curah (loose tablets)
  - Produk tanpa kemasan bertingkat
  - Alat kesehatan satuan (termometer, tensimeter)

Example:
  Paracetamol 500mg → Base Unit: "Tablet", Sales Unit: "Tablet"
  (since it's sold per tablet when not in Strip/Dus)
```

## 3.3 When Base Unit IS NOT the Sales Unit

```
For most pharmacy products, Base Unit ≠ Sales Unit:
  - Aciclovir 400 mg → Base Unit: "Tablet", Sales Unit: "Strip"
  - Amoxicillin 500mg → Base Unit: "Tablet", Sales Unit: "Strip" or "Dus"
  - Salbutamol → Base Unit: "Inhaler", Sales Unit: "Inhaler" (same)
  - Minyak Kayu Putih → Base Unit: "mL", Sales Unit: "Botol"
```

---

# 4. ALTERNATIVE DESIGNS

## Alternative A: Fix the Regex Fallback Only (Minimal)

```
Change regex priority:
  /Tablet|Kapsul|Botol|Ampul|Sachet|Strip|Dus|Inhaler|Pcs/i
  Remove: mL, Gram, mg

  Pro: 1-line fix, no architecture change
  Con: Does NOT address the fundamental problem.
       "Tablet" still shown when "Strip" is the sales unit.
       Generic fallback is fragile.
```

## Alternative B: Hardcode Unit Per Product (Quick Fix)

```
Maintain a manual map: productId → display unit
  "demo-001" → "Tablet"
  "demo-008" → "Inhaler"
  "demo-010" → "Botol"

  Pro: Exact control, no regex
  Con: Does NOT distinguish base unit from sales unit.
       Still manual maintenance.
```

## Alternative C: Add `salesUnit` Field to Product (Architecture Change)

```
Add to InventoryProduct:
  salesUnit: string    // "Strip", "Botol", "Dus"
  
  Logic:
  - If salesUnit exists → display salesUnit
  - Else → display baseUnit (unit)

  Pro: Clean separation. Future-proof.
  Con: Requires DB migration, type change, UI update.
       Out of scope for V10.3.
```

## Alternative D: Derive Sales Unit from UnitLevel (No DB Change)

```
If unitLevels exist:
  salesUnit = unitLevels[0].unitName  (smallest non-base unit)
Else:
  salesUnit = unit (base unit)

Example:
  Amoxicillin: unitLevels = [Strip(10), Dus(10)]
  → salesUnit = "Strip"

  Pro: Zero DB change. Uses existing data.
  Con: Assumes Level 2 = smallest sales unit (may not always hold).
       Requires code change in buildInventoryProducts().
```

## Alternative E: Separate Base Unit from Sales Unit (Full Architecture)

```
Add to product definition:
  baseUnit: string    // "Tablet" — for engines
  salesUnit: string   // "Strip" — for display
  unitLevels: UnitLevel[]  // conversion chain

Inventory displays:  salesUnit
FEFO uses:           baseUnit
Kasir uses:          user-selected unit (from unitLevels)
Laporan uses:        salesUnit
```

---

# 5. RECOMMENDED DESIGN

## 5.1 Recommendation: **Alternative D (Immediate)** + **Alternative E (V11.0)**

```
SHORT TERM (V10.x):
  Alternative D — Derive sales unit from existing UnitLevel data.
  
  Implementation:
    1. In buildInventoryProducts():
       If unitLevels exist and has entries:
         salesUnit = unitLevels[0].unitName  (Level 2 = smallest sales unit)
       Else:
         salesUnit = unit (base unit)
    
    2. In inventory-stock-table.tsx:
       Display salesUnit instead of unit
    
    3. Fix regex fallback to exclude strength/volume units:
       Remove "mL", "Gram", "mg" from regex.
       Add "Tablet", "Kapsul", "Botol", "Ampul", "Sachet", "Strip", "Dus", "Inhaler", "Pcs".

  Benefits:
    - Zero DB migration
    - Zero type changes
    - Existing UnitLevel data drives the display
    - Regex fix as safety net for products without unitLevels

LONG TERM (V11.0):
  Alternative E — Full base/sales unit separation.
  
  Add to InventoryProduct:
    baseUnit: string   (existing `unit` renamed)
    salesUnit: string  (new field)
  
  Benefits:
    - Explicit, non-derived
    - Survives edge cases where Level 2 ≠ sales unit
    - Clean architecture
```

---

# 6. GOLDEN RULES

## 6.1 Unit Usage Rules (Binding)

```
┌─────────────────────────────────────────────────────────────┐
│              SALES UNIT POLICY — GOLDEN RULES               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  RULE 1: FEFO ALWAYS uses Base Unit.                        │
│    FEFO engine tidak boleh menerima sales unit.             │
│    Semua kalkulasi stok dalam base unit.                    │
│                                                              │
│  RULE 2: Stock Engine ALWAYS uses Base Unit.                │
│    quantity di ProductBatch adalah base unit.               │
│    Stock movement mencatat perubahan dalam base unit.       │
│                                                              │
│  RULE 3: Inventory Display SHOULD use Sales Unit.           │
│    Halaman inventory menampilkan sales unit ke user.        │
│    Base unit TIDAK ditampilkan kecuali produk curah.        │
│                                                              │
│  RULE 4: Cashier ALWAYS uses User-Selected Unit.            │
│    Kasir memilih unit display dari unitLevels.              │
│    Cart menyimpan selectedUnitCode.                          │
│    Konversi ke base unit terjadi internal.                  │
│                                                              │
│  RULE 5: Purchase CAN use any unit.                          │
│    Pembelian bisa input dalam satuan besar.                 │
│    Sistem mengkonversi ke base unit untuk storage.          │
│                                                              │
│  RULE 6: Reports DISPLAY in Sales Unit.                      │
│    Laporan menggunakan sales unit untuk readability.        │
│    Kalkulasi internal tetap dalam base unit.                │
│                                                              │
│  RULE 7: Base Unit is NEVER primary UI information.         │
│    Kecuali: produk curah yang base unit = sales unit.       │
│    Atau: technical/admin view yang sengaja menampilkan.     │
│                                                              │
│  RULE 8: Sales Unit is DERIVED, not stored (V10.x).         │
│    Derived dari unitLevels[0].unitName.                     │
│    V11.0: stored explicitly sebagai salesUnit field.        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 6.2 Unit Decision Matrix

| Context | Which Unit? | Why |
|---------|------------|-----|
| FEFO allocation | Base Unit | Engine requirement |
| Stock deduction | Base Unit | Accuracy |
| Inventory display | Sales Unit (derived) | User readability |
| Cashier cart | User-selected unit | User preference |
| Cashier price display | Per selected unit | Customer expectation |
| Purchase receiving | Input unit → convert to base | Operational convenience |
| Stock movement record | Base Unit | Audit trail consistency |
| Batch quantity | Base Unit | Single source of truth |
| Product catalog | Both (base + unitLevels) | Complete definition |
| Reports | Sales Unit | Business readability |
| API / Integration | Base Unit | System consistency |

---

# 7. MODULE IMPACT ANALYSIS

## 7.1 Affected Modules

| Module | Current | Proposed | Impact |
|--------|---------|----------|:------:|
| **Inventory Display** | Shows `product.unit` (base) | Shows derived sales unit | **UI only** |
| **buildInventoryProducts()** | Regex fallback includes "mg"/"mL" | Remove strength units from regex + derive salesUnit | **Code change** |
| **InventoryProduct type** | `unit: string` | Keep `unit` as base, derive `salesUnit` in display layer | **No type change** |
| **Kasir** | Uses UnitLevel correctly | No change | **None** |
| **FEFO** | Base unit | No change | **None** |
| **Pembelian** | Base unit | No change | **None** |
| **Stock Engine** | Base unit | No change | **None** |
| **Laporan** | Reads `product.unit` | Should read derived sales unit | **UI only** |
| **Opname** | Base unit | No change | **None** |
| **Mutasi** | Base unit | No change | **None** |

## 7.2 Change Classification

```
This is a DISPLAY / UI change — NOT a business rule change.

  ✅ Business Rule:  UNCHANGED  (FEFO, stock, pricing unchanged)
  ✅ Database:       UNCHANGED  (no schema changes)
  ✅ Architecture:   UNCHANGED  (no new types, no new layers)
  ⚠️  UI Display:     CHANGED    (inventory shows sales unit)
  ⚠️  Code:          CHANGED    (buildInventoryProducts + regex fix)
```

---

# 8. MIGRATION IMPACT

## 8.1 Classification

| Dimension | Impact? | Explanation |
|-----------|:-------:|-------------|
| UI | ⚠️ MINOR | Inventory table shows different unit text |
| Business Rule | ❌ NONE | FEFO, pricing, stock — all unchanged |
| Database | ❌ NONE | No schema change |
| Architecture | ❌ NONE | No new types or layers |
| Blueprint V10.1 | ❌ NONE | Does not conflict with Checkout architecture |
| Engineering Plan V10.3 | ❌ NONE | Pricing separation unaffected |

## 8.2 Implementation Scope

```
Files affected (estimate):
  src/lib/inventory-demo.ts       — Fix regex + derive salesUnit
  src/components/inventory/        — Display salesUnit instead of unit
  src/types/inventory.ts          — (optional) Add salesUnit?: string
```

---

# 9. ADR STATUS

| Attribute | Value |
|-----------|-------|
| **ADR Number** | ADR-006 |
| **Title** | Sales Unit Policy |
| **Status** | PROPOSED |
| **Requires Blueprint Change?** | NO |
| **Requires Architecture Change?** | NO |
| **Requires DB Migration?** | NO |
| **Requires Engineering Plan Change?** | NO (can be done as quick fix) |
| **Recommended Sprint** | V10.3 (quick fix) or V10.4 |

---

# 10. FINAL RECOMMENDATION

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   ADR-006 RECOMMENDATION                                     │
│                                                              │
│   1. IMMEDIATE (V10.x):                                      │
│      ▸ Fix regex in buildInventoryProducts()                │
│        - Remove: mL, Gram, mg                               │
│        - Keep: Tablet, Kapsul, Botol, Ampul, Strip, Dus    │
│      ▸ Derive salesUnit from unitLevels where available     │
│      ▸ Display salesUnit in inventory table                  │
│                                                              │
│   2. LONG TERM (V11.0):                                     │
│      ▸ Add explicit salesUnit field to InventoryProduct     │
│      ▸ Use throughout UI layer                               │
│                                                              │
│   3. NOT REQUIRED:                                           │
│      ▸ Blueprint change                                     │
│      ▸ DB migration                                         │
│      ▸ Architecture change                                  │
│      ▸ Engineering plan revision                            │
│                                                              │
│   This is a DISPLAY-ONLY fix. All engines are correct.      │
│   The regex was matching dosage units instead of sales       │
│   units — a presentation-layer defect, not architecture.    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**END OF ADR-006 — Sales Unit Policy**
