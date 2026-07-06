# =================================================================
# MEDISYNC — INITIAL RENDER RACE CONDITION AUDIT
# =================================================================

# Type   : Execution Timeline Audit
# Status : COMPLETE
# Date   : 2026-07-06

---

# EXECUTION TIMELINE

## Hard Refresh → Final Render

```
t0:  BROWSER HARD REFRESH (Ctrl+Shift+R)
     │
t1:  React mounts component tree
     │
     ▼
     InventoryPage (page.tsx:23)
     │  <InventoryPageContent />
     │
     ▼
     InventoryPageContent (inventory-page-content.tsx:35)
     │  activeTab === "stock" (line 148)
     │  <InventoryStockTable />
     │
     ▼
     InventoryStockTable (inventory-stock-table.tsx:255)
     │
     ├── Line 259: batches = useInventoryStore(s => s.batches)
     │              State from Zustand. On hard refresh: length = 0.
     │
     ├── Line 268: productCatalog = useProductCatalog()
     │              │
     │              │  ┌─────────────────────────────────────┐
     │              │  │ useProductCatalog (line 29)         │
     │              │  │                                    │
     │              │  │ Line 32:                            │
     │              │  │   const [catalog, setCatalog] =     │
     │              │  │     useState<ProductCatalog>(        │
     │              │  │       new Map()    ← EMPTY MAP      │
     │              │  │     );                               │
     │              │  │                                    │
     │              │  │ Line 34-57: useEffect registered   │
     │              │  │   Dependencies: [productStore       │
     │              │  │     .isConnected]                    │
     │              │  │                                    │
     │              │  │ Line 59: return catalog             │
     │              │  │         → new Map() ← EMPTY         │
     │              │  └─────────────────────────────────────┘
     │              │
     │              productCatalog = new Map()  ← EMPTY MAP
     │
     ├── Line 274-276: useEffect registered
     │     if (batches.length === 0) loadDemoData();
     │
     ├── Line 279-295: useMemo → SYNCHRONOUS (runs NOW)
     │     │
     │     │  buildInventoryProducts(batches, productCatalog)
     │     │    batches = [] or [...]
     │     │    productCatalog = new Map() ← EMPTY
     │     │    │
     │     │    ├── catalogUnit = productCatalog.get(productId)?.unit
     │     │    │   → undefined (empty map)
     │     │    │
     │     │    └── unit = regex from productName || "Pcs"
     │     │        → "Tablet" for matching names
     │     │        → "Pcs" for non-matching (e.g. "Aciclovir 400 mg")
     │     │
     │     return batchProducts with unit from regex
     │
     ├── Line 350: filtered = products.filter(...)
     │
     └── filtered.map(product => <StockRow ... />)

     ═══════════════════════════════════════════════════
     RENDER #1 COMPLETE
     
     productCatalog.size = 0
     catalog entries       = none
     buildInventoryProducts uses regex fallback
     
     "Aciclovir 400 mg" → no regex match → "Pcs" ❌
     "Antasida Tablet"  → "Tablet" match  → "Tablet" ✅
     ═══════════════════════════════════════════════════


t2:  REACT EFFECTS PHASE (after paint)
     │
     ├── Effect 1: useProductCatalog (line 34)
     │     if (!productStore.isConnected) return;
     │       → isConnected = true → passes
     │     productStore.loadCatalog() ← ASYNC START
     │     │  Supabase query: SELECT * FROM products
     │     │  ... network round trip ...
     │     │  ... Supabase processing ...
     │     │
     │     (Effect returns — promise is pending)
     │
     ├── Effect 2: Locations (line 270)
     │     if (locationCount === 0) loadLocations();
     │
     └── Effect 3: loadDemoData (line 274)
           if (batches.length === 0) loadDemoData(); ← ASYNC START


t3:  SUPABASE RESPONSE ARRIVES (t2 + network latency)
     │
     │  loadCatalog().then(products => {
     │    // products = [{ id: "uuid-1", unit: "Tablet", ... }, ...]
     │    const map = new Map();
     │    map.set(p.id, { unit: p.unit, ... });
     │    setCatalog(map);  ← STATE UPDATE
     │  })
     │
     ▼
     
     ═══════════════════════════════════════════════════
     RE-RENDER TRIGGERED (setCatalog)
     
     productCatalog.size = N (e.g., 50)
     catalog entries       = populated from DB
     buildInventoryProducts uses catalog
     
     "Aciclovir 400 mg" → catalog lookup → "Tablet" ✅
     "Antasida Tablet"  → catalog lookup → "Tablet" ✅
     ═══════════════════════════════════════════════════


t4:  loadDemoData() RESPONSE ARRIVES
     │  batches populated in Zustand store
     │  → another re-render
     │  → buildInventoryProducts recomputed (catalog already loaded)
     │  → correct units ✅
```

---

# FINDINGS

## Q1: When does InventoryStockTable render for the first time?

```
At t1, synchronously during React mount.
Before ANY useEffect executes.
Before ANY async operation completes.
```

## Q2: At first render, productCatalog.size = ?

```
0 (zero). Empty Map from useState(new Map()).
Always zero on first render — React state initializer.
```

## Q3: When is buildInventoryProducts() first called?

```
During first render (t1), inside the useMemo at line 279.
Synchronously. Before effects. Before async operations.
With productCatalog = empty Map.
```

## Q4: Is buildInventoryProducts() executed BEFORE catalog finishes loading?

```
YES. It executes at t1 (synchronous render).
Catalog loading starts at t2 (async effect).
Catalog resolves at t3 (network latency later).

t1 < t2 < t3

buildInventoryProducts runs at t1.
Catalog is loaded at t3.

buildInventoryProducts runs BEFORE catalog is ready.
```

## Q5: How many renders occur?

```
Render #1 (t1):
  catalog.size = 0
  catalog.get(productId) → undefined
  → regex fallback → "Pcs" for non-matching names
  → display = "Pcs" ❌

Render #2 (t3):
  catalog.size = N
  catalog.get(productId) → { unit: "Tablet", ... }
  → display = "Tablet" ✅
  
2 renders minimum. 3 if batches load after catalog.
```

## Q6: Does useProductCatalog expose any "loading" state?

```
NO.

Current interface:
  useProductCatalog(): ProductCatalog
  → Returns Map<string, ProductCatalogEntry>
  → No isLoading boolean
  → No isReady boolean
  → No error state

Consumers cannot distinguish between:
  "catalog is empty because it's still loading"
  vs
  "catalog is empty because DB has no products"
```

## Q7: Does InventoryStockTable wait until catalog is ready?

```
NO.

The useMemo at line 279 runs SYNCHRONOUSLY during render.
It uses whatever productCatalog value exists at that moment.
There is no:
  □ if (catalog.size === 0) return <Loading />
  □ if (!catalogReady) return null
  □ Suspense boundary
  □ isLoading guard
```

## Q8: Could the UI avoid rendering fallback units?

```
YES — if a loading state were added.

Options (NOT implementing — audit only):
  A: Return { catalog, isLoading } from useProductCatalog
  B: Show skeleton while catalog.size === 0
  C: Use React Suspense with a catalog resource
  D: Compute unit only when catalog is ready
```

---

# ROOT CAUSE

```
The race condition exists because:

  1. useState(new Map()) — catalog is ALWAYS empty on mount (line 32)
  2. useEffect with loadCatalog() is ASYNCHRONOUS (line 38-53)
  3. useMemo with buildInventoryProducts() is SYNCHRONOUS (line 279)
  4. No loading state — component cannot delay render until ready

  Synchronous render (empty catalog)
      ↓
  "Pcs" displayed briefly    ← RACE WINDOW
      ↓
  Async loadCatalog resolves
      ↓
  "Tablet" displayed         ← CORRECT

  The "Pcs" flash is the EMPTY CATALOG STATE between mount and DB response.
  It is NOT a cache issue. It is NOT a guard issue.
  It is a FIRST-RENDER-WITH-EMPTY-DATA issue.
```

---

**END OF RACE CONDITION AUDIT**

**Document:** `docs/architecture/Initial-Render-Race-Condition-Audit.md`

**Conclusion:** "Pcs" appears on first render because `useState(new Map())` is empty and `buildInventoryProducts()` runs synchronously before the async `loadCatalog()` resolves. Two renders: Render #1 (empty catalog → regex → "Pcs"), Render #2 (populated catalog → "Tablet").
