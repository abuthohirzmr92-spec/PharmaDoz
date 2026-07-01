# UUCE API Freeze Report v1.0.0

> **Status**: 🔒 FROZEN — No changes without ADR
> **Certification**: EEOS Business Core Engine Level 2
> **Freeze Date**: 2026-07-01

---

## Public API (Stable — 9 methods)

| # | Function | Signature | Description |
|---|----------|-----------|-------------|
| 1 | `normalize` | `(qty: number, unitName: string, tree: UnitTree) => number` | Display → Canonical |
| 2 | `format` | `(canonicalQty: number, unitName: string, tree: UnitTree, mode?: RoundingMode) => ConvertResult` | Canonical → Display |
| 3 | `convert` | `(qty: number, fromUnit: string, toUnit: string, tree: UnitTree, mode?: RoundingMode) => ConvertResult` | Any unit → Any unit |
| 4 | `breakdown` | `(canonicalQty: number, tree: UnitTree) => UnitBreakdown[]` | Canonical → Human |
| 5 | `compare` | `(qtyA: number, unitA: string, qtyB: number, unitB: string, tree: UnitTree) => CompareResult` | Cross-unit comparison |
| 6 | `sum` | `(items: SumItem[], tree: UnitTree) => number` | Aggregate heterogeneous |
| 7 | `snapshot` | `(tree: UnitTree, unitName: string, snapshotId: string) => ConversionSnapshot` | Create immutable snapshot |
| 8 | `restore` | `(qty: number, unitName: string, snap: ConversionSnapshot) => { canonicalQty, treeChanged }` | Historical conversion |
| 9 | `validate` | `(tree: UnitTree) => TreeValidationResult` | Full tree validation |

## Public Types (Stable — 7)

| Type | Description |
|------|-------------|
| `UnitTree` | Complete tree for a product |
| `UnitTreeNode` | Single node in the tree |
| `ConversionSnapshot` | Immutable snapshot for audit |
| `Quantity` | Canonical quantity |
| `UnitBreakdown` | Greedy breakdown entry |
| `CompareResult` | Cross-unit comparison result |
| `ConvertResult` | Conversion result with precision info |

## Internal API (May Change — 15)

`buildTree`, `getNode`, `walkPath`, `validateTree`, `buildAndCache`, `preload`, `invalidate`, `invalidateAll`, `safeMultiply`, `safeDivide`, `roundTo`, `validateQuantity`, `detectCircular`, `detectDuplicates`, `validateHierarchy`, `validateSnapshot`, `validateCanonical`, `validateAll`

## Backward Compatibility

- `toBaseUnit(qty, unitName, unitLevels)` — preserved via bridge in `unit-converter.ts`
- `fromBaseUnit(baseQty, unitName, unitLevels)` — preserved via bridge
- `breakdownBaseUnit(baseQty, unitLevels, baseUnitName)` — preserved via bridge

## Breaking Change Policy

- Public API methods: 6-month deprecation notice required
- Public types: 6-month deprecation notice required
- Internal API: may change without notice
- All changes require new ADR

## Test Coverage

- 48 unit tests, 100% pass
- Property-based roundtrip tests
- Tree version compatibility tests
- Precision mode tests
