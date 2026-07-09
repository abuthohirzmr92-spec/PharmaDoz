# MEDISYNC — Performance Foundation Definition of Done

## Story 1 — DataTable Component

- [ ] DataTable component built and exported from `src/components/shared/data-table`
- [ ] Supports virtual scroll via @tanstack/react-virtual
- [ ] Supports client-side AND server-side search (toggle via prop)
- [ ] Supports client-side AND server-side sort (toggle via prop)
- [ ] Supports cursor pagination (prev/next + infinite scroll)
- [ ] Fixed height container, sticky header
- [ ] Skeleton loading state
- [ ] Empty state, error state
- [ ] Keyboard navigation (arrows, enter, escape)
- [ ] Responsive: horizontal scroll on mobile

## Story 2 — Repository Pagination

- [ ] `PaginatedRepository<T>` interface defined
- [ ] `productRepo.getProductsPaginated()` implemented
- [ ] `inventoryRepo.getBatchesPaginated()` implemented
- [ ] `transactionRepo.getTransactionsPaginated()` implemented
- [ ] Cursor encode/decode helpers
- [ ] Existing `getAll()` methods UNCHANGED
- [ ] Tests: cursor pagination correctness, edge cases

## Story 3-5 — Page Migrations

- [ ] Products page uses DataTable with server pagination
- [ ] Inventory page uses DataTable with batch expand
- [ ] Sales page uses DataTable
- [ ] Purchases page uses DataTable
- [ ] DOM nodes ≤200 regardless of dataset size
- [ ] Search is server-side (datasets >500 rows)

## Cross-Cutting

- [ ] Performance budget met for 5,000 and 50,000 row datasets
- [ ] TypeScript: 0 errors
- [ ] Build: PASS
- [ ] All existing tests: PASS
- [ ] No regression in any module
- [ ] Documentation: DataTable usage guide
- [ ] Keyboard navigation: works on all tables
- [ ] Screen reader: table has proper ARIA attributes
