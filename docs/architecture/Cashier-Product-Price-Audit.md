# =================================================================
# MEDISYNC ENTERPRISE SAAS
# CASHIER PRODUCT GRID — PRICE SOURCE AUDIT
# =================================================================
#
# Type             : Remaining Legacy Consumer Audit
# Status           : COMPLETE
# Date             : 2026-07-06
# =================================================================

---

# THE DIVERGENCE

```
Cashier Product Grid:  Rp 9.109
Cashier Cart:          Rp 3.500
                            ↑
                      SAME product, SAME transaction, DIFFERENT prices
```

---

# TRACE — PRODUCT GRID (Wrong)

```
Cashier Page [page.tsx:610]
    │
    {formatCurrency(product.unitPrice)}
    │
    │   product = DemoProduct from useDemoCashier hook
    │
    ▼
useDemoCashier hook [use-demo-cashier.ts]
    │
    │   DEMO PATH — hardcoded:
    │     DemoProduct.unitPrice = hardcoded value (e.g., 25000)
    │     ✅ Hardcoded values are correct per product definition
    │
    │   DB PATH — from repository [lines 203, 339]:
    │     unitPrice: p.batches[0]?.sellingPrice ?? 0
    │                                ↑
    │                          FIRST BATCH IN ARRAY ORDER
    │                          NOT FEFO-sorted
    │                          MAY be sold-out batch
    │                          MAY have different price than active batch
    │
    ▼
productRepo.getProducts() [repository]
    │
    │   Returns products with batches[] in DB insertion order
    │   No FEFO sorting applied at query level
    │
    ▼
batches[0] → whatever batch was inserted FIRST
    │
    │   Could be:
    │   ▸ Old batch, sold out (qty = 0), sellingPrice = 9109
    │   ▸ Active batch (qty > 0), sellingPrice = 3500
    │   ▸ Expired batch, sellingPrice = 0
    │
    ▼
Display: Rp 9.109  ← price of the FIRST batch in array, NOT the active one
```

---

# TRACE — CART (Correct)

```
Cashier Page [page.tsx:752-756]
    │
    {formatCurrency(display.displayPrice)}
    │
    │   display = resolveUnitDisplay(
    │     item.baseQuantity,
    │     item.baseUnitPrice,        ← from canonical CartItem
    │     ...
    │   )
    │
    ▼
CartItem.baseUnitPrice [cashier-store.ts]
    │
    │   Set by: useDemoCashier.addDemoProductToCart()
    │   canonicalPrice = snapshotPrice || product.unitPrice
    │   snapshotPrice = priceSnapshot?.entries[0]?.sellingPrice
    │
    ▼
priceSnapshot [from PricingEngine]
    │
    │   PricingEngine.calculatePricing({
    │     allocationDraft,            ← from AllocationBuilder (FEFO)
    │     priceProvider               ← BatchPriceProvider
    │   })
    │
    ▼
AllocationBuilder.buildAllocation() [V10.2]
    │
    │   Delegates to allocateFefo() — REAL FEFO
    │   Sorts batches by expiredDate ASC
    │   Takes from first available batch (stock > 0)
    │
    ▼
Display: Rp 3.500  ← price of FEFO FIRST SELLABLE batch
```

---

# ROOT CAUSE

```
File:   src/hooks/use-demo-cashier.ts
Lines:  203, 339
Code:   unitPrice: p.batches[0]?.sellingPrice ?? 0

Problem:
  batches[0] is array-index based — DB insertion order, NOT FEFO.
  If the FIRST batch in the array is sold out (qty = 0),
  its sellingPrice is still used for the product grid display.
  The ACTIVE batch may have a completely different sellingPrice.

  This is the ONE remaining consumer that reads price from
  non-FEFO batch ordering.
```

---

# CONSUMER MATRIX

| Consumer | Current Property | Source | Expected Property | Status |
|----------|-----------------|--------|-------------------|:------:|
| **Cashier Grid** | `product.unitPrice` | `p.batches[0]?.sellingPrice` (array order) | FEFO first sellable batch `sellingPrice` | ❌ WRONG |
| **Cashier Cart** | `item.baseUnitPrice` | `priceSnapshot.entries[].sellingPrice` (FEFO) | FEFO batch price | ✅ Correct |
| **Product List** (admin) | `product.defaultSellingPrice` | `resolveCurrentSellingPrice()` (FEFO) | FEFO active batch price | ✅ Correct |
| **Inventory** | (no price displayed) | — | — | N/A |

## CASHIER PRICE FLOW — BEFORE MINI SPRINT

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  DB: productRepo.getProducts()                          │
│      │                                                   │
│      ▼                                                   │
│  batches[0].sellingPrice  ← ARRAY ORDER, NOT FEFO       │
│      │                                                   │
│      ├──► DemoProduct.unitPrice = 9109                  │
│      │         │                                          │
│      │         ▼                                          │
│      │    Cashier Grid: Rp 9.109  ← WRONG (stale batch)  │
│      │                                                   │
│      └──► addDemoProductToCart(product)                 │
│               │                                          │
│               ▼                                          │
│          AllocationBuilder (FEFO) → batch with price 3500│
│               │                                          │
│               ▼                                          │
│          Cart: Rp 3.500  ← CORRECT (active batch)        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## CASHIER PRICE FLOW — AFTER CORRECTION (IF FIXED)

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  DB: productRepo.getProducts()                          │
│      │                                                   │
│      ▼                                                   │
│  resolveCurrentSellingPrice(id, batches, fallback)       │
│      │  FEFO sort → first sellable batch                 │
│      │                                                   │
│      ├──► DemoProduct.unitPrice = 3500                  │
│      │         │                                          │
│      │         ▼                                          │
│      │    Cashier Grid: Rp 3.500  ← CORRECT              │
│      │                                                   │
│      └──► addDemoProductToCart(product)                 │
│               │                                          │
│               ▼                                          │
│          AllocationBuilder (FEFO) → batch with price 3500│
│               │                                          │
│               ▼                                          │
│          Cart: Rp 3.500  ← CORRECT                       │
│                                                          │
│  SAME PRICE. CONSISTENT.                                 │
└─────────────────────────────────────────────────────────┘
```

---

# RECOMMENDED FIX (NOT IMPLEMENTED)

```
File:   src/hooks/use-demo-cashier.ts
Lines:  203, 339

CURRENT:
  unitPrice: p.batches[0]?.sellingPrice ?? 0,

CORRECTED:
  unitPrice: resolveCurrentSellingPrice(p.id, p.batches, p.defaultSellingPrice),

IMPACT:
  ▸ Cashier product grid now shows FEFO active batch price
  ▸ Same price as cart
  ▸ Consistent with Product List (admin)
  ▸ One-line fix, both locations (DB path + refreshProducts)
```

---

**END OF AUDIT — NO IMPLEMENTATION**

**Document Location:** `docs/architecture/Cashier-Product-Price-Audit.md`

**Status: AWAITING ARCHITECTURE BOARD REVIEW**
