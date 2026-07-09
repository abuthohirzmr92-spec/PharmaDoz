# MEDISYNC — Large Dataset Architecture Blueprint

## Status: DRAFT

---

## Current Architecture (Problem)

```
Page mount
  → Repository: SELECT * (no LIMIT)
  → Store: ALL rows in memory
  → Component: ALL rows as DOM nodes
  → Render: ALL rows in one scrollable page
  → Search: client-side .filter() over ALL rows
  → Sort: client-side .sort() over ALL rows
```

## Target Architecture

```
Page mount
  → Repository: SELECT with LIMIT + OFFSET (or cursor)
  → Store: CURRENT PAGE rows only
  → VirtualTable: only VISIBLE rows as DOM nodes
  → Render: fixed-height scrollable container
  → Search: server-side query with debounce
  → Sort: server-side ORDER BY
```

## Key Differences

| Aspect | Current | Target |
|--------|---------|--------|
| Data loading | ALL rows | Page-sized chunks |
| DOM nodes | N (all rows) | ~20 (visible only) |
| Search | Client-side filter | Server-side query |
| Sort | Client-side sort | Server-side ORDER BY |
| Memory | O(N) | O(1) per page |
| Scroll | Native page scroll | Virtual scroll (reuses DOM) |

## Core Architecture Component

```
<DataTable
  columns={COLUMNS}
  fetchRows={async (params) => repository.getPage(params)}
  rowKey="id"
  pageSize={50}
  serverSearch={true}
  virtualScroll={true}
/>
```

Every list page becomes:
```tsx
<DataTable columns={productColumns} fetchRows={productRepo.getPage} rowKey="id" />
<DataTable columns={inventoryColumns} fetchRows={inventoryRepo.getPage} rowKey="id" />
<DataTable columns={customerColumns} fetchRows={customerRepo.getPage} rowKey="id" />
```
