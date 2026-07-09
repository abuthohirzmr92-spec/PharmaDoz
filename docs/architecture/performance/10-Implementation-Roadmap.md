# MEDISYNC — Performance Foundation Implementation Roadmap

## Epic Structure

```
Epic: Large Dataset Foundation

Story 1: DataTable Component (core infrastructure)
  Task 1.1: Define DataTableProps<T> and QueryParams/QueryResult types
  Task 1.2: Build DataTable skeleton (header, toolbar, pagination shell)
  Task 1.3: Integrate @tanstack/react-virtual
  Task 1.4: Implement column sorting (client + server)
  Task 1.5: Implement search (client + server)
  Task 1.6: Unit tests for DataTable

Story 2: Repository Pagination
  Task 2.1: Add PaginatedRepository interface
  Task 2.2: Implement cursor pagination in productRepo
  Task 2.3: Implement cursor pagination in inventoryRepo
  Task 2.4: Implement cursor pagination in transactionRepo
  Task 2.5: Tests for paginated repos

Story 3: Products Page Migration
  Task 3.1: Replace ProductTable with DataTable
  Task 3.2: Wire server search + sort
  Task 3.3: Remove client-side .map() over all rows
  Task 3.4: Regression test

Story 4: Inventory Page Migration
  Task 4.1: Replace InventoryStockTable with DataTable
  Task 4.2: Wire server pagination
  Task 4.3: Preserve expandable rows (batch detail)
  Task 4.4: Regression test

Story 5: Remaining Modules
  Task 5.1: Sales table migration
  Task 5.2: Purchase table migration
  Task 5.3: Activity log migration
  Task 5.4: Customer/Supplier migration (when modules exist)

Story 6: Hardening
  Task 6.1: Performance budget enforcement (CI check)
  Task 6.2: Keyboard navigation audit
  Task 6.3: Responsive audit (mobile)
  Task 6.4: Accessibility audit
```

## Dependency Graph

```
Story 1 ────────────────────────────────────────────►
(DataTable component)
    │
    ├──► Story 2 ───────────────────────────────────►
    │    (Repository pagination — parallel with S1)
    │
    └──► Story 3 ───────────────────────────────────►
         (Products page — first consumer)
              │
              ▼
         Story 4 ───────────────────────────────────►
         (Inventory page)
              │
              ▼
         Story 5 ───────────────────────────────────►
         (Remaining modules)
              │
              ▼
         Story 6 ───────────────────────────────────►
         (Hardening)
```

## Sprint Estimate

| Story | Sprints |
|-------|:------:|
| DataTable Component | 1-2 |
| Repository Pagination | 1 |
| Products Migration | 1 |
| Inventory Migration | 1 |
| Remaining Modules | 1-2 |
| Hardening | 1 |
| **Total** | **6-8 sprints** |
