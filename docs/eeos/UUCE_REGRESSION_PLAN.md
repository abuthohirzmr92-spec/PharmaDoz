# UUCE Regression Test Plan

> **Engine**: UUCE v1.0
> **Status**: Test Plan Documented — not automated

---

## Scenario 1: Tablet → Strip → Dus

```
Tree: Tablet(1) → Strip(10) → Dus(20)

normalize(1, "Dus", tree)     → 200 Tablet     ✅
normalize(3, "Strip", tree)   → 30 Tablet      ✅
format(200, "Dus", tree)      → { 1, "Dus" }   ✅
breakdown(356, tree)          → "1 Dus + 15 Strip + 6 Tablet" ✅
```

## Scenario 2: Bottle → mL

```
Tree: mL(1) → Botol 60mL(60)

normalize(3, "Botol 60mL", tree) → 180 mL       ✅
format(300, "Botol 60mL", tree)  → { 5, ... }   ✅
```

## Scenario 3: Gram → mg

```
Tree: mg(1) → Gram(1000) → Kg(1000)

normalize(2, "Kg", tree)    → 2,000,000 mg       ✅
normalize(5, "Gram", tree)  → 5,000 mg           ✅
```

## Scenario 4: Round Trip

```
For any unit in tree:
  base = normalize(qty, unit, tree)
  back = format(base, unit, tree)
  back.value === qty (exact mode)
```

## Scenario 5: Multi-Level

```
Karton(12) → Box(6) → Pack(5) → Strip(10) → Tablet(1)

normalize(1, "Karton", tree) → 3,600 Tablet       ✅
breakdown(3,725, tree)       → "1 Karton + 0 Box + 2 Pack + 0 Strip + 125 Tablet" ✅
```

## Scenario 6: Stock Integrity

```
Purchase(500 Tablet) → batch.qty = 500
Sales(200 Tablet)    → batch.qty = 300
Transfer(-50)        → batch.qty = 250
Adjustment(+30)      → batch.qty = 280
Expired(-20)         → batch.qty = 260

Σ movements = +500 -200 -50 +30 -20 = +260
batch.quantity = 260 ✅
```

## Scenario 7: Display Never Stored

```
Purchase: 5 Dus → DB stores 1000 Tablet, unit_price=1000
Cashier:  2 Strip → DB stores 20 Tablet, unit_price=150
Report:   SUM(quantity) = 1020 Tablet (base unit)
```

## Scenario 8: Hybrid Location

```
Location: Gdg A / A-01 → batch.quantity unchanged
Location: Gdg B / B-02 → batch.quantity unchanged
Location change NEVER affects quantity. ✅
```
