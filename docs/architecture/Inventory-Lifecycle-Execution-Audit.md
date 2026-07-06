# =================================================================
# MEDISYNC — INVENTORY STOCK TAB LIFECYCLE EXECUTION AUDIT
# =================================================================

# Type   : React Lifecycle Audit
# Status : COMPLETE — EVIDENCE-BASED
# Date   : 2026-07-06

---

# 1. COMPONENT MOUNT ORDER

```
/page/inventory
    │
    ▼
InventoryPage (page.tsx:23)
    │
    ▼
InventoryPageContent (inventory-page-content.tsx:35)
    │
    ├── activeTab === "stock" (line 148)
    │
    ▼
InventoryStockTable (inventory-stock-table.tsx:255)
    │
    ├── Line 268: useProductCatalog() ← HOOK CALL (useEffect registered HERE)
    ├── Line 270: useEffect A (locations)
    └── Line 274: useEffect B (loadDemoData)
```

---

# 2. ALL useEffects — Registered in Order

## Effect 1 — useProductCatalog (registered at line 268)

```
File:   src/hooks/use-product-catalog.ts
Lines:  33-57

Dependencies: [productStore.isConnected, batches.length]

Callback:
  useEffect(() => {
    if (!productStore.isConnected) return;      ← GUARD 1
    if (batches.length > 0) return;             ← GUARD 2
    productStore.loadCatalog().then(...)         ← ASYNC
  }, [productStore.isConnected, batches.length]);
```

## Effect 2 — Locations (line 270)

```
Dependencies: [locationCount, loadLocations]

Callback:
  if (locationCount === 0) loadLocations();
```

## Effect 3 — loadDemoData (line 274)

```
Dependencies: [batches.length, loadDemoData]

Callback:
  if (batches.length === 0) loadDemoData();
```

---

# 3. Effect Execution Order (React Rules)

```
React executes effects in COMPONENT REGISTRATION ORDER.

  useProductCatalog is a hook called at line 268.
  Its internal useEffect is registered during InventoryStockTable's render.
  → It runs FIRST in the effects phase.

  Execution order:
    1. useProductCatalog internal useEffect   [isConnected, batches.length]
    2. Locations useEffect                   [locationCount, loadLocations]
    3. loadDemoData useEffect                [batches.length, loadDemoData]
```

---

# 4. Who Calls loadDemoData()

```
File:   src/components/inventory/inventory-stock-table.tsx
Line:   275
Caller: useEffect callback (Effect 3)
Timing: After mount, during effects phase (runs 3rd)
Guard:  if (batches.length === 0) — only loads when store is empty
```

---

# 5. Who Calls loadCatalog()

```
File:   src/hooks/use-product-catalog.ts
Line:   39
Caller: useEffect callback (Effect 1)
Timing: After mount, during effects phase (runs 1st)
Guard:  if (!productStore.isConnected) return;
        if (batches.length > 0) return;
```

---

# 6. SCENARIO A: Fresh Page Load (batches empty in store)

```
Can this sequence happen? YES.

t0:  InventoryStockTable mounts
     │  batches.length = 0 (store empty)
     │  catalog = new Map()  (initial state)
     │
t1:  RENDER PASS 1
     │  buildInventoryProducts(batches, emptyMap)
     │  → catalogUnit = undefined → regex → "Pcs"
     │  → "Pcs" displayed ❌
     │
t2:  EFFECTS PHASE (in order)
     │  EFFECT 1: useProductCatalog
     │    isConnected = true  ✓
     │    batches.length = 0  ✓
     │    → loadCatalog() ASYNC STARTS ← IN FLIGHT
     │
     │  EFFECT 2: Locations
     │
     │  EFFECT 3: loadDemoData
     │    batches.length = 0 → loadDemoData() ASYNC STARTS ← IN FLIGHT
     │
t3:  loadDemoData() RESOLVES FIRST
     │  batches populated in Zustand store
     │  → RE-RENDER triggers
     │
t4:  RE-RENDER
     │  batches.length > 0
     │  EFFECT 1 re-runs (deps changed: batches.length 0→N)
     │    isConnected = true  ✓
     │    batches.length > 0  → RETURNS (GUARD 2 blocks)
     │    loadCatalog() NOT called in this effect execution
     │
     │  BUT: loadCatalog() from t2 is STILL IN FLIGHT (async)
     │
t5:  loadCatalog() from t2 RESOLVES
     │  setDbCatalog(map) → catalog populated
     │  → RE-RENDER
     │
t6:  RE-RENDER with populated catalog
     │  buildInventoryProducts(batches, catalog)
     │  → catalogUnit = "Tablet" → "Tablet" displayed ✅

CONCLUSION: Fresh load → initially "Pcs", then "Tablet" after catalog loads.
            CORRECT BEHAVIOR (eventually).
```

---

# 7. SCENARIO B: Back Navigation (batches already in store)

```
Can this sequence happen? YES — AND IT'S THE BUG.

t0:  InventoryStockTable mounts
     │  batches.length > 0 (store already populated from prior visit)
     │  catalog = new Map() (ALWAYS empty on mount — initial useState)
     │
t1:  RENDER PASS 1
     │  buildInventoryProducts(batches, emptyMap)
     │  → catalogUnit = undefined → regex → "Pcs"
     │  → "Pcs" displayed ❌
     │
t2:  EFFECTS PHASE
     │  EFFECT 1: useProductCatalog
     │    isConnected = true  ✓
     │    batches.length > 0  → RETURNS ← GUARD 2 BLOCKS
     │    loadCatalog() is NEVER CALLED ← NO ASYNC IN FLIGHT
     │
     │  EFFECT 2: Locations
     │
     │  EFFECT 3: loadDemoData
     │    batches.length > 0 → SKIPS (guard)
     │
t3:  NO further effects fire
     │  [isConnected, batches.length] deps DID NOT CHANGE
     │  → Effect 1 does NOT re-run
     │  catalog STAYS empty forever
     │
t4:  "Pcs" displayed FOREVER

CONCLUSION: Back navigation → catalog NEVER loads → "Pcs" permanently.
            THIS IS THE BUG. GUARD 2 blocks indefinitely.
```

---

# 8. React Timeline — Back Navigation (Bug Scenario)

```
MOUNT ──────────────────────────────────────────────────────────►
  │
  ├─ RENDER 1 (batches.length > 0, catalog = empty Map)
  │    → "Pcs" displayed ❌
  │
  ├─ EFFECT 1 (useProductCatalog)
  │    isConnected = true ✓
  │    batches.length > 0 → RETURNS ← BLOCKS
  │    loadCatalog() NOT called
  │
  ├─ EFFECT 2 (locations) → runs normally
  │
  └─ EFFECT 3 (loadDemoData)
       batches.length > 0 → SKIPS

NO FURTHER EFFECTS. NO RE-RENDERS.
CATALOG = EMPTY FOREVER.
DISPLAY = "Pcs" FOREVER.
```

---

# 9. setDbCatalog() Call

```
File:   src/hooks/use-product-catalog.ts
Line:   53
Code:   setDbCatalog(map);

Called by: .then() callback of productStore.loadCatalog()
Condition: ONLY called when loadCatalog() resolves successfully

Can it be skipped? YES — two ways:
  1. loadCatalog() never called (GUARD 1 or GUARD 2 blocks the call entirely)
  2. loadCatalog() called but .catch() swallows the error (line 55)

In Scenario B: loadCatalog() is NEVER called → setDbCatalog() NEVER fires.
```

---

# 10. Early Returns in use-product-catalog.ts

```
Line 34: if (!productStore.isConnected) return;
  Blocks: entire loadCatalog() call
  When: productStore.isConnected === false
  Impact: No catalog in offline mode (expected behavior)

Line 35: if (batches.length > 0) return;
  Blocks: entire loadCatalog() call
  When: batches already populated in store (back navigation, stale state)
  Impact: Catalog NEVER loads on back navigation ← THE BUG
```

---

# 11. Conditions That Prevent loadCatalog()

```
1. productStore.isConnected === false
   → Expected. App is offline. No DB available.

2. batches.length > 0 at mount time
   → Back navigation. Store has stale data from prior visit.
   → Effect 1's guard blocks. loadCatalog() never called.
   → Effect 3's guard also skips loadDemoData.
   → No async operation is in-flight.
   → Catalog = empty forever.
```

---

# 12. DEFINITIVE CONCLUSION

```
ANSWER: A — The guard IS DEFINITIVELY the root cause.

Evidence:

  File:   src/hooks/use-product-catalog.ts
  Line:   35
  Code:   if (batches.length > 0) return;

  1. This is the ONLY early return that prevents loadCatalog()
     when isConnected === true.

  2. Scenario A (fresh load, batches empty):
     guard passes → loadCatalog() called → catalog eventually loads → "Tablet" ✅

  3. Scenario B (back navigation, batches populated):
     guard blocks → loadCatalog() NEVER called → catalog = empty forever → "Pcs" ❌

  4. This explains "sometimes Tablet, sometimes Pcs":
     - Fresh load: Tablet (catalog eventually loads)
     - Back nav / refresh: Pcs (catalog never loads)
     - The "sometimes" depends on whether Zustand store has stale batches

  5. The guard was ORIGINALLY intended to avoid duplicate loading:
     "if batches already loaded, don't re-fetch catalog"
     But the initial state is empty Map — the guard must NOT prevent
     the FIRST load.

PROOF:
  - Same component, same data, same rendering pipeline
  - Only variable: whether batches were in Zustand store at mount time
  - When batches empty → catalog loads → correct display
  - When batches populated → catalog blocked → incorrect display
  - The guard is the ONLY difference between the two scenarios
```

---

**END OF LIFECYCLE EXECUTION AUDIT**

**Document:** `docs/architecture/Inventory-Lifecycle-Execution-Audit.md`

**Conclusion:** `if (batches.length > 0) return;` at `use-product-catalog.ts:35` IS the root cause. The guard prevents the initial catalog load when Zustand store has stale batch data from a prior page visit.
