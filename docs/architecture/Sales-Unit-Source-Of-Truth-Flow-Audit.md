# =================================================================
# MEDISYNC ENTERPRISE SAAS
# SALES UNIT & PRODUCT PRICE — SOURCE OF TRUTH FLOW AUDIT
# =================================================================
#
# ╔══════════════════════════════════════════════════════════════╗
# ║    SOURCE OF TRUTH FLOW AUDIT — OFFICIAL                    ║
# ╚══════════════════════════════════════════════════════════════╝
#
# Type             : Architecture Flow Audit
# Scope            : Sales Unit Flow + Product Price Flow
# Related ADR      : ADR-006 (Sales Unit Policy)
# Status           : COMPLETE
# Date             : 2026-07-05
#
# Author           : Architecture Board
# =================================================================

---

# EXECUTIVE SUMMARY

Audit menemukan **dua akar masalah** yang berbeda:

1. **Sales Unit "Pcs"**: `buildInventoryProducts()` TIDAK PERNAH menerima `productCatalog` dari caller manapun. Derivasi `salesUnit` dari `unitLevels` — yang sudah diimplementasikan — tidak pernah aktif. Root cause: **missing wiring**, bukan missing logic.

2. **Product List Price vs Cashier Price**: Product List menggunakan `defaultSellingPrice` (rata-rata semua batch), sedangkan Cashier menggunakan `batch.sellingPrice` (harga batch aktual via PriceSnapshot). **Ini adalah dua konsep yang berbeda: catalog price vs transaction price.** Perbedaan nilai adalah expected behavior, bukan bug.

---

# AUDIT A — PRODUCT PRICE FLOW

## A.1 Complete Flow Diagram

```
PRODUCT MASTER (DB)
  products.defaultSellingPrice          ← Catalog price (set by admin)
  products.defaultPrice                 ← Catalog cost (set by admin)
      │
      ▼
REPOSITORY (productRepo.getProducts())
  Returns: Product { defaultSellingPrice, defaultPrice, batches[] }
      │
      ├──────────────────────────────────────────────────────────┐
      ▼                                                          ▼
INVENTORY (buildInventoryProducts)                       CASHIER (use-demo-cashier)
  Computes AVERAGE across batches:                         Uses batch.sellingPrice directly:
    avgSellingPrice = Σ(b.sellingPrice) / n                product.unitPrice = batch.sellingPrice
    avgUnitPrice    = Σ(b.unitPrice) / n                   (via PricingEngine/PriceSnapshot)
      │                                                          │
      ▼                                                          ▼
InventoryProduct                                          CartItem
  .defaultSellingPrice = Math.round(avgSellingPrice)        .baseUnitPrice = sellingPrice (batch)
  .defaultPrice        = Math.round(avgUnitPrice)           .priceSnapshot.entries[].sellingPrice
      │                                                          │
      ├──────────────┬──────────────────────┐                     │
      ▼              ▼                      ▼                     ▼
PRODUCT LIST    INVENTORY PAGE        REPORTS              CASHIER CART
  Displays:       Displays:         Displays:               Displays:
  defaultSelling  (stock only)      defaultSelling          sellingPrice
  Price                             Price                   (per batch)
      │                                      │                     │
      ▼                                      ▼                     ▼
  Rp 9.109                            Rp 9.109              Rp 3.500
  (AVERAGE of all                     (AVERAGE)             (ACTUAL batch
   batches for                                                 sellingPrice)
   this product)
```

## A.2 Root Cause — Price Discrepancy

```
OBSERVATION: Product List shows "Rp 9.109" instead of "Rp 3.500"

ROOT CAUSE: Product List displays defaultSellingPrice — a PRODUCT-LEVEL average.
            Cashier displays batch.sellingPrice — a BATCH-LEVEL actual price.

            These are TWO DIFFERENT CONCEPTS.

HOW defaultSellingPrice IS COMPUTED (buildInventoryProducts, line 919-931):
  avgSellingPrice = productBatches.reduce((s, b) => s + b.sellingPrice, 0) / batchCount;
  defaultSellingPrice = Math.round(avgSellingPrice);

  Example: Product has 3 batches:
    Batch A: qty 0,  sellingPrice 15000  (sold out)
    Batch B: qty 60, sellingPrice 15000  (active)
    Batch C: qty 0,  sellingPrice 7500   (sold out, old batch)
    → avg = (15000 + 15000 + 7500) / 3 = 12500

  Another example:
    Batch A: qty 5,  sellingPrice 25000
    Batch B: qty 30, sellingPrice 25000
    Batch C: qty 0,  sellingPrice 14500
    → avg = (25000 + 25000 + 14500) / 3 = 21500

  If a batch has sellingPrice = 0 (unset/corrupted), it DRAGS DOWN the average.

HOW batch.sellingPrice IS USED (Cashier):
  Cashier takes sellingPrice from the ACTIVE batch (with stock > 0).
  FEFO selects the earliest-expiring batch WITH stock.
  PricingEngine uses that batch's sellingPrice.
  
  → This is the CORRECT transaction price.
  → The customer pays the BATCH price, not the AVERAGE.

CONCLUSION: Different values are EXPECTED.
  Product List  → catalog/reference price (average across ALL batches)
  Cashier       → transaction price (specific batch being sold)
```

## A.3 Is There a Bug?

```
NOT A BUG — but a DESIGN CONCERN:

  1. defaultSellingPrice includes batches with quantity=0 (sold out).
     This drags the average down/up based on inactive batches.

  2. If a batch has sellingPrice = 0 (unset), it severely distorts the average.

  3. Product List and Cashier show different prices for the same product.
     This may confuse users unless clearly documented.

  RECOMMENDATION:
    Either:
      A. Compute defaultSellingPrice only from ACTIVE batches (qty > 0)
      B. Use the product catalog's defaultSellingPrice (from DB, set by admin)
         instead of computing an average
      C. Document clearly: "Product List = reference price, Cashier = actual price"
```

## A.4 Price Field Inventory

| Module | Field Used | Source | Correct? |
|--------|-----------|--------|:--------:|
| **Product List** | `product.defaultSellingPrice` | Average of ALL batch.sellingPrice (including qty=0) | ⚠️ Computed, not DB source |
| **Cashier Cart** | `item.baseUnitPrice` via `priceSnapshot.entries[].sellingPrice` | Active batch sellingPrice (via PricingEngine) | ✅ Correct |
| **Cashier Product Grid** | `product.unitPrice` | Active batch sellingPrice | ✅ Correct |
| **Inventory Page** | (stock only — no price displayed) | — | N/A |
| **Purchasing** | `product.defaultPrice` | Average of ALL batch.unitPrice | ⚠️ Computed, not DB source |
| **Reports** | `product.defaultSellingPrice` | Average across all batches | ⚠️ Computed, not DB source |

---

# AUDIT B — SALES UNIT FLOW

## B.1 Complete Flow Diagram

```
PRODUCT MASTER (DB)
  products.unit          ← "Tablet" (base unit)
  products.unitLevels    ← [{ level:2, unitName:"Strip", contains:10 }]
      │
      ▼
PRODUCT STORE (useProductStore)
  Has: products with unit + unitLevels
      │
      │   ⚠️ NOT USED by buildInventoryProducts()
      │
      ▼
INVENTORY STORE (useInventoryStore)
  Has: batches[] (ProductBatch — no unitLevels, no unit field)
      │
      │   ⚠️ Calls buildInventoryProducts(batches) WITHOUT productCatalog
      │
      ▼
buildInventoryProducts() [inventory-demo.ts:872]
  │
  ├── productCatalog parameter = undefined ← ALWAYS (never passed by any caller)
  │
  ├── catalogUnit = undefined              ← because catalog is undefined
  │
  ├── levels = []                          ← because catalog is undefined
  │
  ├── salesUnit = unit                     ← falls back to regex unit
  │       │                                    (unit from regex: /Tablet|...|Pcs/i)
  │       │
  │       ▼
  │   If productName matches regex: "Tablet", "Strip", etc.
  │   If productName does NOT match: "Pcs" ← LAST RESORT
  │
  └── InventoryProduct
        .unit = "Pcs"          ← from regex fallback
        .salesUnit = "Pcs"     ← same as unit (unitLevels never available)
      │
      ▼
INVENTORY TABLE [inventory-stock-table.tsx]
  Line 97:  {product.salesUnit || product.unit || "—"}
  Line 111: {product.totalStock} {product.salesUnit || product.unit}
  Line 167: {b.quantity} {product.salesUnit || product.unit}
      │
      ▼
  Displays: "Pcs" ← because both salesUnit and unit are "Pcs"
```

## B.2 Root Cause — "Pcs" Display

```
ROOT CAUSE CHAIN (4 steps):

Step 1: buildInventoryProducts() is called WITHOUT productCatalog.
        All 6 call sites pass only batches.
        File: inventory-stock-table.tsx:286, inventory-store.ts:880, etc.

Step 2: productCatalog parameter = undefined.
        → catalogUnit = undefined
        → levels = []
        → salesUnit derivation from unitLevels NEVER ACTIVATES

Step 3: unit falls back to regex.
        Regex: /Tablet|Kapsul|Botol|Ampul|Sachet|Strip|Dus|Tube|Box|Pack|Inhaler|Pcs/i
        Product name "Aciclovir 400 mg" → no match → "Pcs"
        Product name "Antasida Tablet" → matches "Tablet" ✅
        Product name "Minyak Kayu Putih 60 mL" → no match → "Pcs"

Step 4: Inventory display shows product.salesUnit || product.unit.
        Both are derived from the same regex fallback → always identical.
        Display shows "Pcs" for any product without a regex match.

THE FIX implemented in Sales Unit Baseline Correction IS correct —
it just never activates because productCatalog is never passed.

THE REAL ROOT CAUSE is the missing wiring between Product Store
(which HAS unitLevels) and buildInventoryProducts() (which NEEDS them).
```

## B.3 Call Sites — All Without Catalog

| # | File | Line | Call | Has Catalog? |
|---|------|:----:|------|:-----------:|
| 1 | `inventory-store.ts` | 880 | `buildInventoryProducts(get().batches)` | ❌ NO |
| 2 | `inventory-store.ts` | 890 | `buildInventoryProducts(get().batches)` | ❌ NO |
| 3 | `inventory-stock-table.tsx` | 286 | `buildInventoryProducts(batches)` | ❌ NO |
| 4 | `inventory-page-content.tsx` | 225 | `buildInventoryProducts(batches)` | ❌ NO |
| 5 | `inventory-report-table.tsx` | 18 | `buildInventoryProducts(batches)` | ❌ NO |
| 6 | `inventory-demo.ts` | 947 | `buildInventoryProducts(batches)` | ❌ NO |

**6 of 6 call sites pass NO productCatalog.**
**The `productCatalog` parameter has NEVER been used in the application.**

---

# AUDIT C — FALLBACK CHAIN

## C.1 Current (Actual Runtime)

```
buildInventoryProducts(batches)  ← productCatalog = undefined

  unit resolution:
    1. catalogUnit                    → undefined (no catalog)
    2. regex from productName          → "Tablet" | "Pcs" | etc.
    3. "Pcs"                           → last resort

  salesUnit resolution:
    1. unitLevels from catalog         → undefined (no catalog) 
    2. unit                            → from regex (step 2 above)
    
  Result: salesUnit === unit (always identical — both from regex)
```

## C.2 Intended (If Catalog Were Passed)

```
buildInventoryProducts(batches, productCatalog)  ← productCatalog from Product Store

  unit resolution:
    1. catalogUnit                              → "Tablet" (from DB) ✅
    2. regex from productName                   → (not reached)

  salesUnit resolution:
    1. unitLevels from catalog                  → [{ level:2, unitName:"Strip", contains:10 }]
    2. levels[0].unitName                       → "Strip" ✅
    3. unit                                     → "Tablet" (fallback)
    
  Result: salesUnit = "Strip", unit = "Tablet"
```

---

# SOURCE OF TRUTH MATRIX

| Module | Field | Current Source | Correct Source | Status |
|--------|-------|---------------|----------------|:------:|
| **Product List** | Price | `defaultSellingPrice` (avg of ALL batches) | `defaultSellingPrice` from product catalog (DB) | ⚠️ Computed, not authoritative |
| **Cashier** | Price | `batch.sellingPrice` via PriceSnapshot | `batch.sellingPrice` | ✅ Correct |
| **Inventory** | Unit | Regex from product name | `products.unit` from DB catalog | ❌ Catalog never passed |
| **Inventory** | Sales Unit | Same as unit (regex) | `unitLevels[0].unitName` from DB catalog | ❌ Catalog never passed |
| **Purchasing** | Cost | `defaultPrice` (avg of ALL batches) | `defaultPrice` from product catalog (DB) | ⚠️ Computed |
| **Reports** | Price | `defaultSellingPrice` (avg) | `defaultSellingPrice` from DB | ⚠️ Computed |

---

# IMPACT ANALYSIS

## If Catalog Wiring Is Fixed

| Module | Changes Required | Impact |
|--------|:----------------:|:------:|
| `inventory-store.ts` | Pass product catalog to `buildInventoryProducts()` | 1-2 lines |
| `inventory-stock-table.tsx` | Pass catalog or read from store | 1-2 lines |
| `inventory-page-content.tsx` | Pass catalog or read from store | 1-2 lines |
| `inventory-report-table.tsx` | Pass catalog or read from store | 1-2 lines |
| **Cashier** | NONE | Unaffected |
| **FEFO** | NONE | Unaffected |
| **Pricing** | NONE | Unaffected |
| **Database** | NONE | No schema changes |
| **Blueprint** | NONE | Unaffected |
| **ADR** | NONE | ADR-006 already documented |

## If Price Source Is Corrected

| Option | Changes | Impact |
|--------|:-------:|:------:|
| A: Compute from active batches only | `buildInventoryProducts()` — filter qty > 0 | Minor logic change |
| B: Use DB catalog price directly | `buildInventoryProducts()` — use catalog param | Minor logic change |
| C: Document the difference | No code changes | Documentation only |
| D: Do nothing | No changes | Acceptable — two different concepts |

---

# RECOMMENDATION

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   AUDIT RECOMMENDATIONS (IMPLEMENTATION NOT AUTHORIZED)      ║
║                                                              ║
║   PRIORITY 1 — Fix Sales Unit (catalog wiring):              ║
║   ▸ Pass productCatalog from Product Store to                ║
║     buildInventoryProducts() at all 6 call sites             ║
║   ▸ This activates the already-implemented salesUnit logic   ║
║   ▸ Effort: ~30 min, 6 lines changed                        ║
║   ▸ Impact: Inventory, Product List, Reports show correct    ║
║     sales unit                                               ║
║                                                              ║
║   PRIORITY 2 — Price Source (recommendation only):           ║
║   ▸ Option A: Compute defaultSellingPrice from ACTIVE        ║
║     batches only (qty > 0) — most accurate                  ║
║   ▸ Option D: Document that Product List = reference price   ║
║     and Cashier = transaction price — simplest              ║
║   ▸ NOT RECOMMENDED: changing Cashier (it's already correct) ║
║                                                              ║
║   NO CHANGES TO:                                             ║
║   ▸ Blueprint, ADR, Architecture, DB, FEFO, Pricing          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

**END OF SOURCE OF TRUTH FLOW AUDIT**

**Document Location:** `docs/architecture/Sales-Unit-Source-Of-Truth-Flow-Audit.md`

**Status: AWAITING ARCHITECTURE BOARD REVIEW — NO IMPLEMENTATION AUTHORIZED**
