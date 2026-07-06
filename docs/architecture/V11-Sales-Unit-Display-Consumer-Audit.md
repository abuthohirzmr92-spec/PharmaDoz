# =================================================================
# MEDISYNC ENTERPRISE SAAS
# V11.0 — SALES UNIT DISPLAY CONSUMER AUDIT
# =================================================================

# Type             : Consumer Audit
# Scope            : "Satuan Dasar Jual" column in Inventory
# Status           : COMPLETE
# Date             : 2026-07-06

---

# 1. ROOT CAUSE

```
File:   src/components/inventory/inventory-stock-table.tsx
Line:   279

  if (!productStore.isConnected) return;  ← BLOCKS DEMO MODE

In demo mode:
  productStore.isConnected = false
  → catalogProducts stays [] (empty)
  → productCatalog Map is empty
  → buildInventoryProducts() receives empty catalog
  → catalogUnit = undefined
  → unitLevels = []
  → salesUnit falls back to unit (regex from productName)
  → "Aciclovir 400 mg" → regex → no match → "Pcs"
  → Display: "Pcs" ❌
```

---

# 2. COMPLETE FLOW TRACE

```
LAYER 1: Product Master (DemoProduct)
  demo-003: unit="Tablet", unitLevels=[{ level:2, unitName:"Strip", contains:10 }]
  ✅ Correct data exists in demo products (added in Mini-Sprint)

LAYER 2: Product Catalog (catalogProducts state)
  catalogProducts: InventoryProduct[] = []
  ❌ EMPTY — useEffect returns at line 279 (demo mode guard)

LAYER 3: buildInventoryProducts()
  productCatalog: Map {} (empty — built from empty catalogProducts)
  catalogUnit  = undefined (line 904)
  levels       = [] (line 910)
  salesUnit    = unit (line 913 — falls back)
  unit         = regex → "Pcs" (line 907 — for "Aciclovir 400 mg")
  ❌ salesUnit = "Pcs"

LAYER 4: InventoryProduct
  .unit       = "Pcs" (from regex)
  .salesUnit  = "Pcs" (same as unit — levels was empty)
  ❌ wrong

LAYER 5: Inventory Table (display)
  {product.salesUnit || product.unit || "—"}
  → "Pcs" || "Pcs" → "Pcs"
  ❌ Displays "Pcs" instead of "Strip"
```

---

# 3. WHY CATALOG IS EMPTY IN DEMO MODE

```
Line 277: useEffect for loading catalog
Line 278:   const productStore = useProductStore.getState();
Line 279:   if (!productStore.isConnected) return;     ← GUARD 1: blocks demo
Line 280:   if (batches.length > 0) return;            ← GUARD 2: blocks when data exists
Line 281:   productStore.loadCatalog().then(setCatalogProducts)...
Line 282: }, [batches.length]);

Demo mode:
  ▸ isConnected = false → GUARD 1 triggers → skips
  ▸ loadDemoData() already loaded batches → GUARD 2 would trigger anyway
  ▸ catalogProducts remains [] (initial state)

Production mode:
  ▸ isConnected = true → passes GUARD 1
  ▸ batches.length = 0 (not loaded yet) → passes GUARD 2
  ▸ loadCatalog() → setCatalogProducts() → catalog populated ✅
```

---

# 4. CONSUMER MATRIX

| Layer | File | Line | Current Source | Expected | Status |
|-------|------|:----:|---------------|----------|:------:|
| catalogProducts | inventory-stock-table.tsx | 279 | `isConnected` guard blocks demo | Should also work in demo | ❌ |
| productCatalog | inventory-stock-table.tsx | 288-295 | Built from empty `catalogProducts` | Should include demo data | ❌ |
| catalogUnit | inventory-demo.ts | 904 | `undefined` (empty catalog) | `"Tablet"` from demo product | ❌ |
| levels | inventory-demo.ts | 910-913 | `[]` (empty catalog) | `[{unitName:"Strip"}]` | ❌ |
| salesUnit | inventory-demo.ts | 911 | `unit` (regex → "Pcs") | `"Strip"` from unitLevels | ❌ |
| Display | inventory-stock-table.tsx | 97, 111, 178 | `salesUnit \|\| unit` → "Pcs" | "Strip" | ❌ |

---

# 5. THE FIX

## 5.1 One-Line Architecture Fix

```
File:   src/components/inventory/inventory-stock-table.tsx
Line:   279-282

CURRENT:
  useEffect(() => {
    const productStore = useProductStore.getState();
    if (!productStore.isConnected) return;     ← REMOVE or add demo path
    if (batches.length > 0) return;
    productStore.loadCatalog().then(setCatalogProducts).catch(() => {});
  }, [batches.length]);

FIX — Add demo-mode fallback:
  useEffect(() => {
    const productStore = useProductStore.getState();
    if (productStore.isConnected) {
      if (batches.length > 0) return;
      productStore.loadCatalog().then(setCatalogProducts).catch(() => {});
    } else {
      // Demo mode: build catalog from demo product data
      // DemoProduct already has unit + unitLevels (added in Mini-Sprint)
      import("@/hooks/use-demo-cashier").then(({ DEMO_PRODUCTS }) => {
        const catalog: InventoryProduct[] = DEMO_PRODUCTS.map(p => ({
          id: p.productId,
          tenantId: "demo-tenant",
          name: p.productName,
          category: p.category,
          barcode: null,
          unit: p.unit ?? "Pcs",
          unitLevels: p.unitLevels ?? [],
          salesUnit: p.unitLevels?.[0]?.unitName ?? p.unit ?? "Pcs",
          defaultPrice: p.unitPrice,
          defaultSellingPrice: p.unitPrice,
          minStock: 5,
          totalStock: p.stockAvailable,
          batches: [],
          requiresPrescription: false,
          isActive: true,
        }));
        setCatalogProducts(catalog);
      }).catch(() => {});
    }
  }, [batches.length]);
```

## 5.2 Simpler Alternative

```
Instead of dynamic import, build catalog from batches:

  const products = useMemo(() => {
    // Build catalog from batch data when demo mode
    const productCatalog = new Map<...>();
    
    if (catalogProducts.length > 0) {
      // Production: use loaded catalog
      for (const cat of catalogProducts) { ... }
    } else {
      // Demo: build minimal catalog from batches
      for (const b of batches) {
        if (!productCatalog.has(b.productId)) {
          productCatalog.set(b.productId, {
            unit: /* from batch context or demo data */,
            unitLevels: [],
          });
        }
      }
    }
    ...
  }, [batches, catalogProducts]);
```

## 5.3 Simplest Fix (Recommended)

```
Just load demo products into catalogProducts on mount:

  import { DEMO_PRODUCTS } from "@/hooks/use-demo-cashier";

  useEffect(() => {
    const productStore = useProductStore.getState();
    if (productStore.isConnected) {
      if (batches.length > 0) return;
      productStore.loadCatalog().then(setCatalogProducts).catch(() => {});
    } else if (batches.length > 0 && catalogProducts.length === 0) {
      // Demo mode: seed catalog from demo product definitions
      setCatalogProducts(DEMO_PRODUCTS.map(p => ({
        id: p.productId,
        tenantId: "demo-tenant",
        name: p.productName,
        category: p.category,
        barcode: null,
        unit: p.unit ?? "Pcs",
        unitLevels: p.unitLevels ?? [],
        defaultPrice: p.unitPrice,
        defaultSellingPrice: p.unitPrice,
        minStock: 5,
        totalStock: p.stockAvailable,
        batches: [],
        requiresPrescription: false,
        isActive: true,
      } as InventoryProduct)));
    }
  }, [batches.length, catalogProducts.length]);
```

---

# 6. IMPACT ANALYSIS

| Concern | Impact |
|---------|:------:|
| FEFO engine | ❌ NONE — unit data is display-only |
| Checkout flow | ❌ NONE — cashier uses DemoProduct directly |
| Database | ❌ NONE — no schema changes |
| Blueprint | ❌ NONE |
| ADR | ❌ NONE |
| Inventory display | ✅ FIXED — shows "Strip" instead of "Pcs" |
| Product table | ✅ FIXED — same data flow |
| Reports | ✅ FIXED — same data flow |

---

# 7. VERIFICATION CHECKLIST (POST-FIX)

```
□ "Aciclovir 400 mg" → Inventory shows "Strip"
□ "Minyak Kayu Putih 60 mL" → Inventory shows "Botol"
□ "Paracetamol 500mg" → Inventory shows "Strip"
□ "Salbutamol Inhaler" → Inventory shows "Inhaler"
□ Products WITHOUT unitLevels → show base unit (e.g., "Tablet")
□ Production mode unaffected (catalog still from DB)
□ TypeScript: 0 errors
□ Build: PASS
□ Tests: 132/132 PASS
```

---

**END OF AUDIT — NO IMPLEMENTATION**

**Document Location:** `docs/architecture/V11-Sales-Unit-Display-Consumer-Audit.md`

**Status: AWAITING ARCHITECTURE BOARD APPROVAL FOR IMPLEMENTATION**
