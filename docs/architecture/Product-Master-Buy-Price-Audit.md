# =================================================================
# MEDISYNC ENTERPRISE SAAS
# PRODUCT MASTER — BUY PRICE SOURCE AUDIT
# =================================================================
#
# Type             : Buy Price Source Audit
# Status           : COMPLETE
# Date             : 2026-07-06
# =================================================================

---

# 1. CURRENT ARCHITECTURE

## 1.1 Where Buy Price Is Defined

```
ProductBatch.unitPrice          ← "purchase / cost price" — per batch (source of truth)
ProductBatch.sellingPrice       ← retail price — per batch

InventoryProduct.defaultPrice   ← Math.round(average of ALL batch.unitPrice)
                                   (buildInventoryProducts, line 917-918)

Product catalog (DB):
  products.defaultPrice          ← admin-set catalog buy price
  products.defaultSellingPrice   ← admin-set catalog sell price
```

## 1.2 How defaultPrice Is Computed

```
buildInventoryProducts() [inventory-demo.ts:915-918]:

  const avgUnitPrice = productBatches.reduce((s, b) => s + b.unitPrice, 0) / batchCount;
  defaultPrice: Math.round(avgUnitPrice)

  SAME PATTERN as defaultSellingPrice — average across ALL batches
  (including qty=0, expired, inactive).

  Example:
    Batch A: qty 0,  unitPrice 7500   (sold out)
    Batch B: qty 60, unitPrice 8000   (active)
    Batch C: qty 40, unitPrice 7800   (active)
    → avg = (7500 + 8000 + 7800) / 3 = 7767
    → displayed: Rp 7.767

  But the ACTIVE FEFO batch cost is 8000 (Batch B, first to expire with stock).
```

---

# 2. CONSUMER MATRIX

## 2.1 Buy Price Consumers

| Consumer | Property Used | Source | Displays? | Status |
|----------|--------------|--------|:---------:|:------:|
| **Product Table** | `defaultPrice` (prop type only) | Not rendered in table | ❌ No column | N/A |
| **Product Form Modal** | `defaultPrice` | Form input — user-editable | ✅ Yes | Catalog price |
| **Quick Create Modal** | `defaultPrice` | Form input | ✅ Yes | Catalog price |
| **Purchase Panel** | `prod.defaultPrice` | From catalog (line 303) | ✅ Yes | Catalog price |
| **Purchase Panel** | `b.unitPrice` | From batch (line 309, 318) | ✅ Yes | Batch cost |
| **Product Match Modal** | `p.defaultPrice` | From catalog | ✅ Yes | Catalog price |

## 2.2 Comparison — Buy Price vs Sell Price

| Aspect | Sell Price (fixed) | Buy Price |
|--------|:-----------------:|-----------|
| Product Table column | ✅ "Harga Jual" | ❌ No column |
| Source before fix | `defaultSellingPrice` (avg) | `defaultPrice` (avg) |
| Source after fix | `resolveCurrentSellingPrice()` (FEFO active) | `defaultPrice` (avg) — NOT YET FIXED |
| Same pattern? | Previously: avg → now: FEFO active | Still: avg of ALL batches |

---

# 3. BUSINESS RULE QUESTION

## 3.1 What Should Product Master Show?

```
SELLING PRICE (Harga Jual) — DECIDED:
  "Current Active Selling Price = FEFO first sellable batch"
  ✅ Implemented via resolveCurrentSellingPrice()

BUY PRICE (Harga Beli) — OPEN QUESTION:

  Option A: FEFO Active Batch Cost
    "The unitPrice of the first FEFO sellable batch"
    Same logic as selling price, but for cost.
    Consistent with selling price approach.
    Reflects: "this batch's cost is what we paid"

  Option B: Product Catalog defaultPrice
    The admin-set buy price in the product master.
    Stable, doesn't change with batches.
    Reflects: "this is our standard cost for this product"

  Option C: Average (current)
    Average across ALL batches.
    SAME PROBLEM as old defaultSellingPrice.
    Sold-out batches drag the average.
    NOT RECOMMENDED — already rejected for selling price.

  Option D: FEFO Active Batch Cost + "Harga Beli" Column
    Product table doesn't currently display buy price at all.
    Adding a "Harga Beli" column with active batch cost
    would provide complete cost visibility.
```

## 3.2 Architecture Board Decision Required

```
The following are DIFFERENT concerns:

  1. Product Table "Harga Beli" column:
     Currently DOES NOT EXIST in the product table.
     Only Harga Jual is displayed.
     
     Q: Should Harga Beli be added to the product table?
        If yes → use which source?

  2. Purchase Panel defaultPrice:
     Used for auto-fill in purchase items.
     
     Q: Should defaultPrice reflect the active batch cost
        or the catalog price?

  3. Product Form Modal defaultPrice:
     User-editable field for catalog buy price.
     
     Q: Should be the catalog price (admin-set).
        Probably YES — this is a master data field.
```

---

# 4. RECOMMENDED IMPLEMENTATION

## 4.1 If FEFO Active Batch Cost Is Selected

```
NEW: resolveCurrentBuyPrice() — pure utility (mirror of resolveCurrentSellingPrice)

  function resolveCurrentBuyPrice(
    productId: string,
    batches: ProductBatch[],
    defaultBuyPrice: number,
  ): number {
    // Same FEFO logic as resolveCurrentSellingPrice
    // but returns unitPrice (cost) instead of sellingPrice
  }

AFFECTED:
  ▸ buildInventoryProducts() → use resolveCurrentBuyPrice for defaultPrice
  ▸ products-page-content.tsx → pass through
  ▸ Purchase Panel → use resolveCurrentBuyPrice for auto-fill
```

## 4.2 If Catalog Price Is Selected

```
NO CODE CHANGES needed.
Current behavior is correct — defaultPrice is the catalog price.
Only document that this is the INTENDED behavior.
```

---

# 5. RISK ASSESSMENT

| Scenario | Risk | Impact |
|----------|:----:|:------:|
| Change to FEFO active cost | LOW | Same pattern as selling price fix — proven safe |
| Add "Harga Beli" column | LOW | New column, no existing behavior changed |
| Do nothing | NONE | No functional change |

---

# 6. RECOMMENDATION

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   BUY PRICE AUDIT RECOMMENDATION                             ║
║                                                              ║
║   The buy price situation is DIFFERENT from selling price:   ║
║                                                              ║
║   1. Product Table does NOT display buy price at all.        ║
║      There is no "wrong price" visible to users.            ║
║                                                              ║
║   2. defaultPrice is used in forms, modals, and purchase      ║
║      panel — not in the main product listing.                ║
║                                                              ║
║   3. The selling price fix (resolveCurrentSellingPrice)      ║
║      addressed a VISIBLE inconsistency. This buy price       ║
║      issue is NOT visible in the same way.                   ║
║                                                              ║
║   RECOMMENDATION:                                            ║
║   ▸ Wait for Architecture Board decision on business rule    ║
║   ▸ Options: FEFO active cost, catalog cost, or no change   ║
║   ▸ If FEFO active cost is chosen: mirror the selling price  ║
║     pattern with a resolveCurrentBuyPrice() utility          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

**END OF BUY PRICE AUDIT**

**Document Location:** `docs/architecture/Product-Master-Buy-Price-Audit.md`

**Status: AWAITING ARCHITECTURE BOARD DECISION ON BUSINESS RULE**
